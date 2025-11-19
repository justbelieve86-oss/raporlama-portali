const request = require('supertest');

// Auth client mock: geçerli kullanıcı döndür
jest.mock('../supabaseAuth', () => ({
  createAuthClient: () => ({
    auth: {
      getUser: jest.fn(async () => ({ data: { user: { id: 'user-123', role: 'user' } }, error: null }))
    }
  })
}));

// Supabase mock: user_brands yetki ve targets list için in() argümanlarını yakala
jest.mock('../supabase', () => {
  const __captures = { targetsListInArgs: { called: false, args: null } };

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
      if (table === 'user_brands') {
        const q = { table };
        q.select = jest.fn(() => q);
        q.eq = jest.fn(() => q);
        q.single = jest.fn(() => ({ then: (resolve) => resolve({ data: { brand_id: 'b-1' }, error: null }) }));
        return q;
      }
      if (table === 'brand_kpi_targets') {
        const p = Promise.resolve({ data: [{ kpi_id: 'k1', target: 100 }], error: null });
        p.select = jest.fn(() => p);
        p.eq = jest.fn(() => p);
        p.in = jest.fn((column, values) => {
          if (column === 'kpi_id') {
            __captures.targetsListInArgs.called = true;
            __captures.targetsListInArgs.args = values;
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

describe('Targets list kpi_ids trim ve filtre', () => {
  process.env.NODE_ENV = 'test';
  const app = require('../index');
  const brandUUID = '9b2e1f1a-4c1b-4f2e-8a1c-2b3c4d5e6f70';

  it('GET /api/targets kpi_ids trim ve boşları filtreler', async () => {
    const uuid1 = '550e8400-e29b-41d4-a716-446655440000';
    const uuid2 = '660e8400-e29b-41d4-a716-446655440001';
    const res = await request(app)
      .get('/api/targets')
      .query({ brand_id: brandUUID, year: 2025, kpi_ids: ` ${uuid1} , , ${uuid2} ` })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(200);
    const { supabase } = require('../supabase');
    expect(supabase.__captures.targetsListInArgs.called).toBe(true);
    expect(supabase.__captures.targetsListInArgs.args).toEqual([uuid1, uuid2]);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data?.items)).toBe(true);
  });
});