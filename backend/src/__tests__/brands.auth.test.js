const request = require('supertest');
const express = require('express');

// Auth middleware'ini bypass et ve kullanıcıyı ekle
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => { req.user = { id: 'u1' }; next(); },
}));

// Supabase mock'u: senaryo kontrolü mock içinde tutulur
jest.mock('../supabase', () => {
  let currentScenario = 'brands_list';
  const mod = {
    supabase: {
      from: jest.fn((table) => {
        // user_brands için farklı akışlar
        if (table === 'user_brands') {
          if (currentScenario === 'brands_list') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({ data: [{ brand_id: 'b1' }, { brand_id: 'b2' }], error: null }))
              }))
            };
          }
          // kpi_mappings senaryoları: select -> eq -> eq -> single
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn(() => (
                    currentScenario === 'kpi_mappings_authorized'
                      ? { data: { brand_id: 'b1' }, error: null }
                      : { data: null, error: { message: 'not found' } }
                  ))
                }))
              }))
            }))
          };
        }

      if (table === 'brands') {
        const selectFn = jest.fn(() => {
          const inFn = jest.fn(() => {
            const orderFn = jest.fn(() => ({
              data: [ { id: 'b1', name: 'Brand 1' }, { id: 'b2', name: 'Brand 2' } ],
              error: null
            }));
            return { order: orderFn };
          });
          return { 'in': inFn };
        });
        return { select: selectFn };
      }

      if (table === 'user_brand_kpis') {
        return {
          select: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => ({ data: [ { kpi_id: 'k1' }, { kpi_id: 'k2' } ], error: null })) })) }))
        };
      }

        return { select: jest.fn(() => ({ data: [], error: null })) };
      })
    },
    __setScenario: (s) => { currentScenario = s; }
  };
  return mod;
});

const { sendList, sendError } = require('../utils/responseHelpers');
const { requireAuth } = require('../middleware/auth');

// Test için minimal app: index.js'deki ilgili endpoint mantığını kullan
const buildApp = () => {
  const app = express();
  const { supabase } = require('../supabase');

  app.get('/api/brands', requireAuth, async (req, res) => {
    try {
      const { data: links, error: linkErr } = await supabase
        .from('user_brands')
        .select('brand_id')
        .eq('user_id', req.user.id);

      if (linkErr) {
        if (linkErr.code === '42P01' || /relation .* does not exist/i.test(linkErr.message || '')) {
          return sendList(res, [], 'Markalar alındı');
        }
        return sendError(res, `Yetkili markalar alınırken hata: ${linkErr.message}`, 500, 'USER_BRANDS_FETCH_FAILED');
      }

      const brandIds = (links || []).map((r) => r.brand_id);
      if (!brandIds.length) {
        return sendList(res, [], 'Markalar alındı');
      }

      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .in('id', brandIds)
        .order('name', { ascending: true });

      if (error) {
        if (error.code === '42P01' || /relation .* does not exist/i.test(error.message || '')) {
          return sendList(res, [], 'Markalar alındı');
        }
        return sendError(res, `Markalar alınırken hata: ${error.message}`, 500, 'BRANDS_FETCH_FAILED');
      }
      return sendList(res, data || [], 'Markalar başarıyla alındı');
    } catch (e) {
      return sendError(res, 'Sunucu hatası', 500, 'INTERNAL_SERVER_ERROR');
    }
  });

  app.get('/api/brands/:brandId/kpi-mappings', requireAuth, async (req, res) => {
    const { brandId } = req.params;
    const { supabase } = require('../supabase');
    try {
      const { data: userBrand, error: userBrandError } = await supabase
        .from('user_brands')
        .select('brand_id')
        .eq('user_id', req.user.id)
        .eq('brand_id', brandId)
        .single();

      if (userBrandError || !userBrand) {
        return sendError(res, 'Bu marka için yetkiniz yok.', 403, 'FORBIDDEN');
      }

      const { data, error } = await supabase
        .from('user_brand_kpis')
        .select('kpi_id')
        .eq('user_id', req.user.id)
        .eq('brand_id', brandId);

      if (error) {
        return sendError(res, `KPI eşleştirmeleri alınırken hata: ${error.message}`, 500, 'KPI_MAPPINGS_FETCH_FAILED');
      }

      return sendList(res, data || [], 'KPI eşleştirmeleri başarıyla alındı');
    } catch (err) {
      return sendError(res, 'Sunucu hatası', 500, 'INTERNAL_SERVER_ERROR');
    }
  });

  return app;
};

describe('Brands authorized/unauthorized', () => {
  it('GET /api/brands returns list for authorized user', async () => {
    const { __setScenario } = require('../supabase');
    __setScenario('brands_list');
    const app = buildApp();
    const res = await request(app).get('/api/brands');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.length).toBe(2);
    expect(res.body.data.items[0].name).toBe('Brand 1');
  });

  it('GET /api/brands/:brandId/kpi-mappings returns 403 when unauthorized', async () => {
    const { __setScenario } = require('../supabase');
    __setScenario('kpi_mappings_unauthorized');
    const app = buildApp();
    const res = await request(app).get('/api/brands/b1/kpi-mappings');
    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('GET /api/brands/:brandId/kpi-mappings returns list when authorized', async () => {
    const { __setScenario } = require('../supabase');
    __setScenario('kpi_mappings_authorized');
    const app = buildApp();
    const res = await request(app).get('/api/brands/b1/kpi-mappings');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.map(i => i.kpi_id)).toEqual(['k1', 'k2']);
  });
});