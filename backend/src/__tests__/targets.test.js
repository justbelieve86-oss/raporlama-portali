const request = require('supertest');
const brandUUID = '9b2e1f1a-4c1b-4f2e-8a1c-2b3c4d5e6f70';

// Auth client: token doğrulaması için kullanıcı döndür
jest.mock('../supabaseAuth', () => ({
  createAuthClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'u1' } },
        error: null,
      })
    }
  })
}));

// Supabase mock: profiles, user_brands, brand_kpi_targets ve kpi_reports tablolarını kapsar
jest.mock('../supabase', () => {
  const supabase = {
    __userBrandsAuthorized: true,
    from: jest.fn((table) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({ data: { role: 'user' } }))
            }))
          }))
        };
      }

      if (table === 'user_brands') {
        // Yetki kontrolü için: authorized ve unauthorized senaryolarını kontrollü döndürmek üzere bir bayrak kullanacağız
        const chain = {};
        chain.select = jest.fn(() => chain);
        chain.eq = jest.fn(() => chain);
        chain.single = jest.fn(() => Promise.resolve(
          supabase.__userBrandsAuthorized
            ? { data: { brand_id: 'b1' }, error: null }
            : { data: null, error: { message: 'not found' } }
        ));
        return chain;
      }

      if (table === 'brand_kpi_targets') {
        const chain = {};
        chain.select = jest.fn(() => chain);
        chain.eq = jest.fn(() => chain);
        chain.in = jest.fn(() => chain);
        chain.order = jest.fn(() => chain);
        chain.delete = jest.fn(() => ({ match: jest.fn(() => ({ error: null })) }));
        chain.then = (resolve) => resolve({ data: [
          { kpi_id: 'k1', target: 100 },
          { kpi_id: 'k2', target: 50 }
        ], error: null });
        return chain;
      }

      if (table === 'kpi_reports') {
        const chain = {};
        chain.select = jest.fn(() => chain);
        chain.eq = jest.fn(() => chain);
        chain.in = jest.fn(() => chain);
        chain.order = jest.fn(() => chain);
        chain.then = (resolve) => resolve({ data: [
          { kpi_id: 'k1', month: 11, value: 100 },
          { kpi_id: 'k2', month: 11, value: 80 }
        ], error: null });
        return chain;
      }

      const generic = {};
      generic.delete = jest.fn(() => ({ match: jest.fn(() => ({ error: null })) }));
      return generic;
    })
  };
  return { supabase };
});

// index app'i yükle
process.env.NODE_ENV = 'test';
const app = require('../index');

describe('Targets ve kullanıcı aylık rapor uçları', () => {
  it('GET /api/targets eksik parametrelerde 400 BAD_REQUEST döner', async () => {
    const res = await request(app)
      .get('/api/targets')
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('BAD_REQUEST');
  });

  it('GET /api/targets yetkisiz kullanıcı için 403 FORBIDDEN döner', async () => {
    const { supabase } = require('../supabase');
    // user_brands kontrolünü yetkisiz yap
    supabase.__userBrandsAuthorized = false;

    const res = await request(app)
      .get('/api/targets')
      .query({ brand_id: brandUUID, year: 2025 })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(403);
    // Development mode'da error formatı farklı olabilir
    if (res.body.success !== undefined) {
      expect(res.body.success).toBe(false);
    }
    expect(res.body.code || res.body.error?.code).toBe('FORBIDDEN');
  });

  it('GET /api/targets authorized kullanıcı için hedef listesi döner', async () => {
    const { supabase } = require('../supabase');
    supabase.__userBrandsAuthorized = true;

    const res = await request(app)
      .get('/api/targets')
      .query({ brand_id: brandUUID, year: 2025 })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items[0].kpi_id).toBe('k1');
  });

  it('DELETE /api/targets eksik parametrelerde 400 BAD_REQUEST döner', async () => {
    const res = await request(app)
      .delete('/api/targets')
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('BAD_REQUEST');
  });

  it('DELETE /api/targets yetkisiz kullanıcı için 403 FORBIDDEN döner', async () => {
    const { supabase } = require('../supabase');
    supabase.__userBrandsAuthorized = false;

    const res = await request(app)
      .delete('/api/targets')
      .query({ brand_id: brandUUID, year: 2025, kpi_id: 'k1' })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(403);
    // Development mode'da error formatı farklı olabilir
    if (res.body.success !== undefined) {
      expect(res.body.success).toBe(false);
    }
    expect(res.body.code || res.body.error?.code).toBe('FORBIDDEN');
  });

  it('DELETE /api/targets authorized kullanıcı için başarıyla siler', async () => {
    const { supabase } = require('../supabase');
    supabase.__userBrandsAuthorized = true;

    const res = await request(app)
      .delete('/api/targets')
      .query({ brand_id: brandUUID, year: 2025, kpi_id: 'k1' })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/targets/yearly eksik parametrelerde 400 BAD_REQUEST', async () => {
    const res = await request(app)
      .get('/api/targets/yearly')
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('BAD_REQUEST');
  });

  it('GET /api/targets/yearly sendList formatında veri döner', async () => {
    const res = await request(app)
      .get('/api/targets/yearly')
      .query({ brand_id: brandUUID, year: 2025, kpi_ids: 'k1,k2' })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items[0].kpi_id).toBe('k1');
  });

  it('GET /api/reports/monthly/user eksik parametrelerde 400 BAD_REQUEST', async () => {
    const res = await request(app)
      .get('/api/reports/monthly/user')
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('BAD_REQUEST');
  });

  it('GET /api/reports/monthly/user sendList formatında veri döner', async () => {
    const res = await request(app)
      .get('/api/reports/monthly/user')
      .query({ brand_id: brandUUID, year: 2025, kpi_ids: 'k1,k2' })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items[0].kpi_id).toBe('k1');
  });
});