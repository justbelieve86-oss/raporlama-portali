const request = require('supertest');

// Auth middleware'ini bypass et
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => { req.user = { id: 'test-user-1' }; next(); },
  requireAdmin: (req, res, next) => { next(); },
}));

// Supabase mock: validation + catchAsync + sendList entegrasyonunu test et
jest.mock('../supabase', () => {
  let currentScenario = 'success';
  const supabaseInstance = {
    from: jest.fn((table) => {
      if (table === 'user_brands') {
        const chain = {};
        chain.select = jest.fn(() => chain);
        chain.eq = jest.fn(() => chain);
        chain.single = jest.fn(() => Promise.resolve(
          currentScenario === 'unauthorized'
            ? { data: null, error: { message: 'not found' } }
            : { data: { brand_id: 'b1' }, error: null }
        ));
        return chain;
      }

      if (table === 'user_brand_kpis') {
        const chain = {};
        chain.select = jest.fn(() => chain);
        chain.eq = jest.fn(() => chain);
        chain.limit = jest.fn(() => Promise.resolve(
          currentScenario === 'already_exists'
            ? { data: [{ id: 'existing' }], error: null }
            : { data: [], error: null }
        ));
        chain.insert = jest.fn(() => Promise.resolve(
          currentScenario === 'db_error'
            ? { data: null, error: { message: 'Database error', code: '23505' } }
            : { data: null, error: null }
        ));
        const deleteChain = {};
        deleteChain.match = jest.fn(() => Promise.resolve({ data: null, error: null }));
        chain.delete = jest.fn(() => deleteChain);

        chain.then = (resolve) => {
          return resolve({ data: [{ kpi_id: 'k1' }, { kpi_id: 'k2' }], error: null });
        };

        return chain;
      }

      if (table === 'brand_kpi_mappings') {
        const chain = {};
        chain.select = jest.fn(() => chain);
        chain.eq = jest.fn(() => chain);
        chain.limit = jest.fn(() => Promise.resolve(
          currentScenario === 'already_exists'
            ? { data: [{ id: 'existing' }], error: null }
            : { data: [], error: null }
        ));
        chain.insert = jest.fn(() => Promise.resolve(
          currentScenario === 'db_error'
            ? { data: null, error: { message: 'Database error', code: '23505' } }
            : { data: null, error: null }
        ));
        const deleteChain = {};
        deleteChain.match = jest.fn(() => Promise.resolve({ data: null, error: null }));
        chain.delete = jest.fn(() => deleteChain);

        chain.then = (resolve) => {
          return resolve({ data: [{ kpi_id: 'k1' }, { kpi_id: 'k2' }], error: null });
        };

        return chain;
      }

      if (table === 'kpis') {
        const chain = {};
        chain.select = jest.fn(() => chain);
        chain.in = jest.fn(() => Promise.resolve({
          data: [{ id: 'k1', name: 'KPI 1' }],
          error: null
        }));
        return chain;
      }

      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({ data: [], error: null }))
        }))
      };
    }),
    __setScenario: (s) => { currentScenario = s; }
  };
  
  return {
    supabase: supabaseInstance
  };
});

describe('Integration: catchAsync + validation + response format', () => {
  process.env.NODE_ENV = 'test';
  const app = require('../index');
  const { supabase } = require('../supabase');

  const validBrandId = '550e8400-e29b-41d4-a716-446655440000';
  const validKpiId = '660e8400-e29b-41d4-a716-446655440001';
  const invalidUUID = 'not-a-uuid';

  beforeEach(() => {
    if (supabase && supabase.__setScenario) {
      supabase.__setScenario('success');
    }
  });

  describe('GET /api/brands/:brandId/kpi-mappings', () => {
    it('geçerli UUID ile standart sendList formatında döner', async () => {
      const res = await request(app)
        .get(`/api/brands/${validBrandId}/kpi-mappings`)
        .set('Authorization', 'Bearer testtoken');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.count).toBeDefined();
      expect(res.body.data.total).toBeDefined();
    });

    it('geçersiz UUID ile validation hatası döner (catchAsync ile yakalanır)', async () => {
      const res = await request(app)
        .get(`/api/brands/${invalidUUID}/kpi-mappings`)
        .set('Authorization', 'Bearer testtoken');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('BAD_REQUEST');
      expect(res.body.details).toBeDefined();
      expect(res.body.details.errors).toBeDefined();
    });

    it('yetkisiz erişimde AppError ile 403 döner', async () => {
      if (supabase && supabase.__setScenario) {
        supabase.__setScenario('unauthorized');
      }
      const res = await request(app)
        .get(`/api/brands/${validBrandId}/kpi-mappings`)
        .set('Authorization', 'Bearer testtoken');

      expect(res.statusCode).toBe(403);
      // Development mode'da error formatı farklı olabilir
      if (res.body.success !== undefined) {
        expect(res.body.success).toBe(false);
      }
      expect(res.body.code || res.body.error?.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/brands/:brandId/kpi-mappings', () => {
    it('geçerli parametrelerle başarılı response döner', async () => {
      if (supabase && supabase.__setScenario) {
        supabase.__setScenario('insert_success');
      }
      const res = await request(app)
        .post(`/api/brands/${validBrandId}/kpi-mappings`)
        .set('Authorization', 'Bearer testtoken')
        .send({ kpi_id: validKpiId });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBeDefined();
    });

    it('geçersiz brandId ile validation hatası döner', async () => {
      const res = await request(app)
        .post(`/api/brands/${invalidUUID}/kpi-mappings`)
        .set('Authorization', 'Bearer testtoken')
        .send({ kpi_id: validKpiId });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('BAD_REQUEST');
    });

    it('geçersiz kpi_id ile validation hatası döner', async () => {
      const res = await request(app)
        .post(`/api/brands/${validBrandId}/kpi-mappings`)
        .set('Authorization', 'Bearer testtoken')
        .send({ kpi_id: invalidUUID });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('BAD_REQUEST');
    });

    it('database hatası AppError ile yakalanır ve 500 döner', async () => {
      if (supabase && supabase.__setScenario) {
        supabase.__setScenario('db_error');
      }
      const res = await request(app)
        .post(`/api/brands/${validBrandId}/kpi-mappings`)
        .set('Authorization', 'Bearer testtoken')
        .send({ kpi_id: validKpiId });

      expect(res.statusCode).toBe(500);
      // Development mode'da error formatı farklı olabilir
      if (res.body.success !== undefined) {
        expect(res.body.success).toBe(false);
      }
      expect(res.body.status).toBe('error');
    });
  });

  describe('DELETE /api/brands/:brandId/kpi-mappings/:kpiId', () => {
    it('geçerli parametrelerle başarılı response döner', async () => {
      if (supabase && supabase.__setScenario) {
        supabase.__setScenario('success');
      }
      const res = await request(app)
        .delete(`/api/brands/${validBrandId}/kpi-mappings/${validKpiId}`)
        .set('Authorization', 'Bearer testtoken');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
    });

    it('geçersiz kpiId ile validation hatası döner', async () => {
      const res = await request(app)
        .delete(`/api/brands/${validBrandId}/kpi-mappings/${invalidUUID}`)
        .set('Authorization', 'Bearer testtoken');

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('BAD_REQUEST');
    });
  });

  describe('GET /api/kpis/details', () => {
    it('geçerli comma-separated UUID\'ler ile standart format döner', async () => {
      const res = await request(app)
        .get(`/api/kpis/details?kpi_ids=${validKpiId},${validBrandId}`)
        .set('Authorization', 'Bearer testtoken');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it('eksik kpi_ids ile validation hatası döner', async () => {
      const res = await request(app)
        .get('/api/kpis/details')
        .set('Authorization', 'Bearer testtoken');

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('BAD_REQUEST');
    });

    it('geçersiz UUID içeren kpi_ids ile validation hatası döner', async () => {
      const res = await request(app)
        .get(`/api/kpis/details?kpi_ids=${validKpiId},${invalidUUID}`)
        .set('Authorization', 'Bearer testtoken');

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('BAD_REQUEST');
    });
  });
});

