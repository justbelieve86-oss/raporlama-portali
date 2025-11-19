const request = require('supertest');
const express = require('express');

// Auth client: token doğrulaması için kullanıcı döndür
jest.mock('../supabaseAuth', () => ({
  createAuthClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-1' } },
        error: null,
      }),
    },
  }),
}));

// Supabase: profiles ve daily/monthly rapor zincirlerini tek bir mock ile yönet
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
        const userBrandsChain = {};
        userBrandsChain.select = jest.fn(() => userBrandsChain);
        userBrandsChain.eq = jest.fn(() => userBrandsChain);
        userBrandsChain.single = jest.fn(() => Promise.resolve({ data: { brand_id: 'b1' }, error: null }));
        return userBrandsChain;
      }

      const dailyData = [
        { kpi_id: 'k1', year: 2025, month: 11, day: 6, value: 10 },
        { kpi_id: 'k2', year: 2025, month: 11, day: 6, value: 5 },
      ];
      const monthlyData = [
        { kpi_id: 'k1', value: 100 },
        { kpi_id: 'k2', value: 50 },
      ];

      const chain = {};
      chain.select = jest.fn(() => chain);
      chain.eq = jest.fn(() => chain);
      chain.in = jest.fn(() => chain);
      chain.match = jest.fn(() => chain);
      chain.order = jest.fn(() => chain);
      chain.upsert = jest.fn(() => ({ error: null }));
      const deleteChain = {};
      deleteChain.match = jest.fn(() => Promise.resolve({ error: null }));
      chain.delete = jest.fn(() => deleteChain);

      // await query; çağrısını desteklemek için thenable yap
      chain.then = (resolve) => {
        if (table === 'kpi_daily_reports') {
          return resolve({ data: dailyData.map(d => ({ ...d, updated_at: new Date().toISOString() })), error: null });
        }
        if (table === 'kpi_reports') {
          return resolve({ data: monthlyData.map(d => ({ ...d, updated_at: new Date().toISOString() })), error: null });
        }
        return resolve({ data: [], error: null });
      };

      return chain;
    })
  }
}));

describe('Rapor akışı: günlük ve aylık', () => {
  // index.js app doğrudan kullanılsın
  process.env.NODE_ENV = 'test';
  const app = require('../index');
  const brandUUID = '9b2e1f1a-4c1b-4f2e-8a1c-2b3c4d5e6f70';

  it('GET /api/reports/daily gerekli alanlar eksikse 400 BAD_REQUEST', async () => {
    const res = await request(app)
      .get('/api/reports/daily')
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('BAD_REQUEST');
  });

  it('GET /api/reports/daily doğru parametrelerle list döner', async () => {
    const res = await request(app)
      .get('/api/reports/daily')
      .query({ brand_id: brandUUID, year: 2025, month: 11 })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items[0].kpi_id).toBe('k1');
    expect(res.body.data.items[0].report_date).toMatch(/2025-11-\d{2}/);
  });

  it('POST /api/reports/daily eksik alanlarla 400 BAD_REQUEST', async () => {
    const res = await request(app)
      .post('/api/reports/daily')
      .set('Authorization', 'Bearer testtoken')
      .send({ brand_id: brandUUID });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('BAD_REQUEST');
  });

  it('POST /api/reports/daily başarıyla kaydeder', async () => {
    const payload = { brand_id: brandUUID, year: 2025, month: 11, day: 6, kpi_id: 'k1', value: 12 };
    const res = await request(app)
      .post('/api/reports/daily')
      .set('Authorization', 'Bearer testtoken')
      .send(payload);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/reports/monthly gerekli alanlar eksikse 400 BAD_REQUEST', async () => {
    const res = await request(app)
      .get('/api/reports/monthly')
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('BAD_REQUEST');
  });

  it('GET /api/reports/monthly doğru parametrelerle data döner', async () => {
    const res = await request(app)
      .get('/api/reports/monthly')
      .query({ brand_id: brandUUID, year: 2025, month: 11 })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items[0].kpi_id).toBe('k1');
    expect(res.body.data.items[0].value).toBe(100);
  });

  it('POST /api/reports/monthly eksik alanlarla 400 BAD_REQUEST', async () => {
    const res = await request(app)
      .post('/api/reports/monthly')
      .set('Authorization', 'Bearer testtoken')
      .send({ brand_id: brandUUID, year: 2025 });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('BAD_REQUEST');
  });

  it('POST /api/reports/monthly başarıyla kaydeder', async () => {
    const payload = { brand_id: brandUUID, year: 2025, month: 11, kpi_id: 'k1', value: 120 };
    const res = await request(app)
      .post('/api/reports/monthly')
      .set('Authorization', 'Bearer testtoken')
      .send(payload);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('DELETE /api/reports/monthly eksik alanlarla 400 BAD_REQUEST', async () => {
    const res = await request(app)
      .delete('/api/reports/monthly')
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('BAD_REQUEST');
  });

  it('DELETE /api/reports/monthly başarıyla siler', async () => {
    const res = await request(app)
      .delete('/api/reports/monthly')
      .query({ brand_id: brandUUID, year: 2025, month: 11, kpi_id: 'k1' })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // Negatif aralık testleri
  it('GET /api/reports/daily month=0 için 400 BAD_REQUEST döner', async () => {
    const res = await request(app)
      .get('/api/reports/daily')
      .query({ brand_id: brandUUID, year: 2025, month: 0 })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
  });

  it('GET /api/reports/daily day=32 için 400 BAD_REQUEST döner', async () => {
    const res = await request(app)
      .get('/api/reports/daily')
      .query({ brand_id: brandUUID, year: 2025, month: 11, day: 32 })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
  });

  it('GET /api/reports/monthly month=13 için 400 BAD_REQUEST döner', async () => {
    const res = await request(app)
      .get('/api/reports/monthly')
      .query({ brand_id: brandUUID, year: 2025, month: 13 })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
  });
});