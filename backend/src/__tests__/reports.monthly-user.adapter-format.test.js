const request = require('supertest');

// Auth client mock: her çağrıda geçerli user döndür
jest.mock('../supabaseAuth', () => ({
  createAuthClient: () => ({
    auth: {
      getUser: jest.fn(async () => ({ data: { user: { id: 'user-123', role: 'user' } }, error: null }))
    }
  })
}));

// Supabase mock: monthly/user endpoint için in() argümanlarını yakala ve sahte data döndür
jest.mock('../supabase', () => {
  const __captures = { monthlyUserInArgs: { called: false, args: null } };

  const chain = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    in: jest.fn((column, values) => {
      if (column === 'kpi_id') {
        __captures.monthlyUserInArgs.called = true;
        __captures.monthlyUserInArgs.args = values;
      }
      return chain;
    })
  };

  const supabase = {
    __captures,
    from: jest.fn((table) => {
      if (table === 'profiles') {
        const q = { table };
        q.select = jest.fn(() => q);
        q.eq = jest.fn(() => q);
        q.single = jest.fn(() => new Proxy({}, {
          get(target, prop) {
            if (prop === 'then') {
              return (resolve) => resolve({ data: { role: 'user' }, error: null });
            }
            return target[prop];
          }
        }));
        return q;
      }
      if (table === 'user_brands') {
        const userBrandsChain = {};
        userBrandsChain.select = jest.fn(() => userBrandsChain);
        userBrandsChain.eq = jest.fn(() => userBrandsChain);
        userBrandsChain.single = jest.fn(() => Promise.resolve({ data: { brand_id: 'b1' }, error: null }));
        return userBrandsChain;
      }
      if (table === 'kpi_reports') {
        const reportsChain = {};
        reportsChain.select = jest.fn(() => reportsChain);
        reportsChain.eq = jest.fn(() => reportsChain);
        reportsChain.in = jest.fn((column, values) => {
          if (column === 'kpi_id') {
            __captures.monthlyUserInArgs.called = true;
            __captures.monthlyUserInArgs.args = values;
          }
          return reportsChain;
        });
        reportsChain.order = jest.fn(() => reportsChain);
        reportsChain.then = (resolve) => resolve({ data: [{ kpi_id: 'k1', month: 11, value: 100, updated_at: new Date().toISOString() }], error: null });
        return reportsChain;
      }
      return chain;
    })
  };


  return { supabase };
});

describe('Reports monthly/user adapter-format ve kpi_ids trim', () => {
  process.env.NODE_ENV = 'test';
  const app = require('../index');
  const brandUUID = '9b2e1f1a-4c1b-4f2e-8a1c-2b3c4d5e6f70';

  it('GET /api/reports/monthly/user brand_id eksikse 400 ve BAD_REQUEST', async () => {
    const res = await request(app)
      .get('/api/reports/monthly/user')
      .query({ year: 2025, kpi_ids: 'k1,k2' })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('status', 'fail');
    expect(res.body).toHaveProperty('code', 'BAD_REQUEST');
    expect(res.body).toHaveProperty('details');
    expect(Array.isArray(res.body.details?.errors)).toBe(true);
  });

  it('GET /api/reports/monthly/user year eksikse 400 ve BAD_REQUEST', async () => {
    const res = await request(app)
      .get('/api/reports/monthly/user')
      .query({ brand_id: brandUUID, kpi_ids: 'k1,k2' })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('status', 'fail');
    expect(res.body).toHaveProperty('code', 'BAD_REQUEST');
    expect(Array.isArray(res.body.details?.errors)).toBe(true);
  });

  it('GET /api/reports/monthly/user kpi_ids eksikse 400 ve BAD_REQUEST', async () => {
    const res = await request(app)
      .get('/api/reports/monthly/user')
      .query({ brand_id: brandUUID, year: 2025 })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('status', 'fail');
    expect(res.body).toHaveProperty('code', 'BAD_REQUEST');
    expect(Array.isArray(res.body.details?.errors)).toBe(true);
  });

  it('GET /api/reports/monthly/user kpi_ids trim ve boşları filtreler', async () => {
    const res = await request(app)
      .get('/api/reports/monthly/user')
      .query({ brand_id: brandUUID, year: 2025, kpi_ids: ' k1 , , k2 ' })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(200);
    const { supabase } = require('../supabase');
    expect(supabase.__captures.monthlyUserInArgs.called).toBe(true);
    expect(supabase.__captures.monthlyUserInArgs.args).toEqual(['k1', 'k2']);
    // sendList formatı: success true ve data.items dizi
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data?.items)).toBe(true);
  });
});