const request = require('supertest');

// Auth client mock: geçerli kullanıcı döndür
jest.mock('../supabaseAuth', () => ({
  createAuthClient: () => ({
    auth: {
      getUser: jest.fn(async () => ({ data: { user: { id: 'user-123', role: 'user' } }, error: null }))
    }
  })
}));

// Supabase mock: cumulative_sources için in() argümanlarını yakala
jest.mock('../supabase', () => {
  const __captures = { cumulativeInArgs: { called: false, args: null } };

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
      if (table === 'kpi_cumulative_sources') {
        const p = Promise.resolve({ data: [{ kpi_id: 'k1', source_kpi_id: 's1' }], error: null });
        p.select = jest.fn(() => p);
        p.in = jest.fn((column, values) => {
          if (column === 'kpi_id') {
            __captures.cumulativeInArgs.called = true;
            __captures.cumulativeInArgs.args = values;
          }
          return p;
        });
        return p;
      }
      const p = Promise.resolve({ data: [], error: null });
      p.select = jest.fn(() => p);
      p.in = jest.fn(() => p);
      return p;
    })
  };

  return { supabase };
});

describe('Kpi cumulative_sources kpi_ids trim ve filtre', () => {
  process.env.NODE_ENV = 'test';
  const app = require('../index');

  it('GET /api/kpis/cumulative_sources kpi_ids trim uygular ve boşları filtreler', async () => {
    const uuid1 = '550e8400-e29b-41d4-a716-446655440000';
    const uuid2 = '660e8400-e29b-41d4-a716-446655440001';
    const res = await request(app)
      .get('/api/kpis/cumulative_sources')
      .query({ kpi_ids: ` ${uuid1} , , ${uuid2} ` })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(200);
    const { supabase } = require('../supabase');
    expect(supabase.__captures.cumulativeInArgs.called).toBe(true);
    expect(supabase.__captures.cumulativeInArgs.args).toEqual([uuid1, uuid2]);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data?.items)).toBe(true);
  });
});