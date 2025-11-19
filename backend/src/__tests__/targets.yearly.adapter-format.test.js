const request = require('supertest');

// Auth client mock: geçerli kullanıcı döndür
jest.mock('../supabaseAuth', () => ({
  createAuthClient: () => ({
    auth: {
      getUser: jest.fn(async () => ({ data: { user: { id: 'user-123', role: 'user' } }, error: null }))
    }
  })
}));

// Supabase mock: targets yearly için in() argümanlarını yakala ve sahte data döndür
jest.mock('../supabase', () => {
  const __captures = { targetsYearlyInArgs: { called: false, args: null } };

  const supabase = {
    __captures,
    from: jest.fn((table) => {
      if (table === 'profiles') {
        const q = { table };
        q.select = jest.fn(() => q);
        q.eq = jest.fn(() => q);
        q.single = jest.fn(() => ({ then: (resolve) => resolve({ data: { role: 'user' }, error: null }) }));
        return q;
      }
      if (table === 'brand_kpi_targets') {
        const p = Promise.resolve({ data: [{ kpi_id: 'k1', target: 150 }], error: null });
        p.select = jest.fn(() => p);
        p.eq = jest.fn(() => p);
        p.in = jest.fn((column, values) => {
          if (column === 'kpi_id') {
            __captures.targetsYearlyInArgs.called = true;
            __captures.targetsYearlyInArgs.args = values;
          }
          return p;
        });
        return p;
      }
      const p = Promise.resolve({ data: [], error: null });
      p.select = jest.fn(() => p);
      p.eq = jest.fn(() => p);
      p.in = jest.fn(() => p);
      return p;
    })
  };

  return { supabase };
});

describe('Targets yearly adapter-format ve kpi_ids trim', () => {
  process.env.NODE_ENV = 'test';
  const app = require('../index');
  const brandUUID = '9b2e1f1a-4c1b-4f2e-8a1c-2b3c4d5e6f70';

  it('GET /api/targets/yearly brand_id eksikse 400 ve BAD_REQUEST', async () => {
    const res = await request(app)
      .get('/api/targets/yearly')
      .query({ year: 2025, kpi_ids: 'k1,k2' })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('status', 'fail');
    expect(res.body).toHaveProperty('code', 'BAD_REQUEST');
    expect(Array.isArray(res.body.details?.errors)).toBe(true);
  });

  it('GET /api/targets/yearly year eksikse 400 ve BAD_REQUEST', async () => {
    const res = await request(app)
      .get('/api/targets/yearly')
      .query({ brand_id: brandUUID, kpi_ids: 'k1,k2' })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('status', 'fail');
    expect(res.body).toHaveProperty('code', 'BAD_REQUEST');
    expect(Array.isArray(res.body.details?.errors)).toBe(true);
  });

  it('GET /api/targets/yearly kpi_ids eksikse 400 ve BAD_REQUEST', async () => {
    const res = await request(app)
      .get('/api/targets/yearly')
      .query({ brand_id: brandUUID, year: 2025 })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('status', 'fail');
    expect(res.body).toHaveProperty('code', 'BAD_REQUEST');
    expect(Array.isArray(res.body.details?.errors)).toBe(true);
  });

  it('GET /api/targets/yearly kpi_ids trim ve boşları filtreler', async () => {
    const res = await request(app)
      .get('/api/targets/yearly')
      .query({ brand_id: brandUUID, year: 2025, kpi_ids: ' k1 , , k2 ' })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(200);
    const { supabase } = require('../supabase');
    expect(supabase.__captures.targetsYearlyInArgs.called).toBe(true);
    expect(supabase.__captures.targetsYearlyInArgs.args).toEqual(['k1', 'k2']);
    // sendList formatı: success true ve data.items dizi
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data?.items)).toBe(true);
  });
});