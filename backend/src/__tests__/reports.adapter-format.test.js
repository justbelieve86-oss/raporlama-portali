const request = require('supertest');

// Auth client: token doğrulaması için kullanıcı döndür
jest.mock('../supabaseAuth', () => ({
  createAuthClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-adapter' } },
        error: null,
      }),
    },
  }),
}));

// Supabase: upsert/delete çağrılarını hatasız döndür
jest.mock('../supabase', () => ({
  supabase: {
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

      const chain = {};
      chain.select = jest.fn(() => chain);
      chain.eq = jest.fn(() => chain);
      chain.in = jest.fn(() => chain);
      chain.match = jest.fn(() => ({ error: null }));
      chain.upsert = jest.fn(() => ({ error: null }));
      chain.delete = jest.fn(() => ({ match: jest.fn(() => ({ error: null })) }));
      chain.then = (resolve) => resolve({ data: [], error: null });
      return chain;
    })
  }
}));

describe('Adapter hata formatı: POST/DELETE rapor uçları', () => {
  process.env.NODE_ENV = 'test';
  const app = require('../index');
  const brandUUID = '9b2e1f1a-4c1b-4f2e-8a1c-2b3c4d5e6f70';

  it('POST /api/reports/daily day eksikse BAD_REQUEST ve details.errors döner', async () => {
    const res = await request(app)
      .post('/api/reports/daily')
      .set('Authorization', 'Bearer testtoken')
      .send({ brand_id: brandUUID, year: 2025, month: 11, kpi_id: 'k1', value: 10 });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('BAD_REQUEST');
    expect(res.body.message).toBe('Geçersiz istek');
    expect(res.body.details).toBeDefined();
    expect(Array.isArray(res.body.details.errors)).toBe(true);
    expect(res.body.details.errors).toEqual(expect.arrayContaining(['day alanı zorunludur']));
  });

  it('POST /api/reports/daily day=32 için 400 ve sınır mesajı döner', async () => {
    const res = await request(app)
      .post('/api/reports/daily')
      .set('Authorization', 'Bearer testtoken')
      .send({ brand_id: brandUUID, year: 2025, month: 11, day: 32, kpi_id: 'k1', value: 10 });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
    expect(res.body.details.errors).toEqual(expect.arrayContaining(['day en fazla 31 olmalıdır']));
  });

  it('POST /api/reports/monthly month=13 için 400 ve sınır mesajı döner', async () => {
    const res = await request(app)
      .post('/api/reports/monthly')
      .set('Authorization', 'Bearer testtoken')
      .send({ brand_id: brandUUID, year: 2025, month: 13, kpi_id: 'k1', value: 12 });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
    expect(res.body.details.errors).toEqual(expect.arrayContaining(['month en fazla 12 olmalıdır']));
  });

  it('POST /api/reports/monthly brand_id UUID değilse 400 ve tip mesajı döner', async () => {
    const res = await request(app)
      .post('/api/reports/monthly')
      .set('Authorization', 'Bearer testtoken')
      .send({ brand_id: 'not-uuid', year: 2025, month: 11, kpi_id: 'k1', value: 12 });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
    expect(res.body.details.errors).toEqual(expect.arrayContaining(['brand_id alanı uuid tipinde olmalıdır']));
  });

  it('DELETE /api/reports/monthly kpi_id eksikse 400 ve details.errors döner', async () => {
    const res = await request(app)
      .delete('/api/reports/monthly')
      .query({ brand_id: brandUUID, year: 2025, month: 11 })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('BAD_REQUEST');
    expect(Array.isArray(res.body.details.errors)).toBe(true);
    expect(res.body.details.errors).toEqual(expect.arrayContaining(['kpi_id alanı zorunludur']));
  });

  it('DELETE /api/reports/monthly month=0 için 400 ve alt sınır mesajı döner', async () => {
    const res = await request(app)
      .delete('/api/reports/monthly')
      .query({ brand_id: brandUUID, year: 2025, month: 0, kpi_id: 'k1' })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
    expect(res.body.details.errors).toEqual(expect.arrayContaining(['month en az 1 olmalıdır']));
  });
});