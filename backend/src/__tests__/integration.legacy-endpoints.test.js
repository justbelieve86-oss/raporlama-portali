const request = require('supertest');

// Auth middleware'ini bypass et
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => { req.user = { id: 'test-user-1' }; next(); },
  requireAdmin: (req, res, next) => { next(); },
}));

// Supabase mock: legacy endpoint'lerin standart formata geçişini test et
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

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn((table) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: { role: 'user' }, error: null }))
            }))
          }))
        };
      }

      if (table === 'user_brands') {
        const chain = {};
        chain.select = jest.fn(() => chain);
        chain.eq = jest.fn(() => chain);
        chain.single = jest.fn(() => Promise.resolve({ data: { brand_id: 'b1' }, error: null }));
        return chain;
      }

      const chain = {};
      chain.select = jest.fn(() => chain);
      chain.eq = jest.fn(() => chain);
      chain.in = jest.fn(() => chain);
      chain.order = jest.fn(() => chain);

      chain.then = (resolve) => {
        if (table === 'kpi_cumulative_sources') {
          return resolve({
            data: [
              { kpi_id: 'k1', source_kpi_id: 'k2' },
              { kpi_id: 'k1', source_kpi_id: 'k3' }
            ],
            error: null
          });
        }
        if (table === 'kpi_formulas') {
          return resolve({
            data: [
              { kpi_id: 'k1', expression: '{{k2}} + {{k3}}', display_expression: 'K2 + K3' }
            ],
            error: null
          });
        }
        if (table === 'kpi_daily_reports') {
          return resolve({
            data: [
              { kpi_id: 'k1', year: 2025, month: 1, day: 1, value: 10, updated_at: new Date().toISOString() },
              { kpi_id: 'k1', year: 2025, month: 1, day: 2, value: 20, updated_at: new Date().toISOString() }
            ],
            error: null
          });
        }
        if (table === 'kpi_reports') {
          return resolve({
            data: [
              { kpi_id: 'k1', value: 100, updated_at: new Date().toISOString() },
              { kpi_id: 'k2', value: 200, updated_at: new Date().toISOString() }
            ],
            error: null
          });
        }
        if (table === 'brand_kpi_targets') {
          return resolve({
            data: [
              { kpi_id: 'k1', target: 1000 },
              { kpi_id: 'k2', target: 2000 }
            ],
            error: null
          });
        }
        return resolve({ data: [], error: null });
      };

      return chain;
    })
  }
}));

describe('Integration: Legacy endpoint\'ler standart formata geçiş', () => {
  process.env.NODE_ENV = 'test';
  const app = require('../index');

  const validBrandId = '550e8400-e29b-41d4-a716-446655440000';
  const validKpiIds = '660e8400-e29b-41d4-a716-446655440001,770e8400-e29b-41d4-a716-446655440002';

  describe('GET /api/kpis/cumulative_sources', () => {
    it('standart sendList formatında döner (legacy\'den geçiş)', async () => {
      const res = await request(app)
        .get(`/api/kpis/cumulative_sources?kpi_ids=${validKpiIds}`)
        .set('Authorization', 'Bearer testtoken');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThan(0);
      expect(res.body.data.count).toBeDefined();
      expect(res.body.data.total).toBeDefined();
    });

    it('kpi_ids eksikse boş array ile standart format döner', async () => {
      const res = await request(app)
        .get('/api/kpis/cumulative_sources')
        .set('Authorization', 'Bearer testtoken');

      expect(res.statusCode).toBe(200);
      expect(res.body.data.items).toEqual([]);
      expect(res.body.data.count).toBe(0);
    });
  });

  describe('GET /api/kpis/formulas', () => {
    it('standart sendList formatında döner', async () => {
      const res = await request(app)
        .get(`/api/kpis/formulas?kpi_ids=${validKpiIds}`)
        .set('Authorization', 'Bearer testtoken');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeDefined();
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });
  });

  describe('GET /api/reports/daily', () => {
    it('standart sendList formatında döner (report_date field ile)', async () => {
      const res = await request(app)
        .get(`/api/reports/daily?brand_id=${validBrandId}&year=2025&month=1`)
        .set('Authorization', 'Bearer testtoken');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeDefined();
      expect(Array.isArray(res.body.data.items)).toBe(true);
      
      // report_date field'ının eklendiğini kontrol et
      if (res.body.data.items.length > 0) {
        expect(res.body.data.items[0]).toHaveProperty('report_date');
        expect(res.body.data.items[0].report_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });
  });

  describe('GET /api/reports/monthly', () => {
    it('standart sendList formatında döner', async () => {
      const res = await request(app)
        .get(`/api/reports/monthly?brand_id=${validBrandId}&year=2025&month=1`)
        .set('Authorization', 'Bearer testtoken');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeDefined();
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });
  });

  describe('GET /api/targets', () => {
    it('standart sendList formatında döner', async () => {
      const res = await request(app)
        .get(`/api/targets?brand_id=${validBrandId}&year=2025`)
        .set('Authorization', 'Bearer testtoken');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeDefined();
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });
  });
});

