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

// Supabase mock: profiles ve günlük/aylık rapor zincirleri, in/upsert çağrılarını yakala
jest.mock('../supabase', () => {
  const dailyInArgs = { called: false, args: null };
  const monthlyInArgs = { called: false, args: null };
  const monthlyUserInArgs = { called: false, args: null };
  const dailyUpsertValueType = { called: false, isNumber: null };
  const dailyEqDayCapture = { called: false, value: null };

  const dailyData = [
    { kpi_id: 'k1', year: 2025, month: 11, day: 6, value: 10 },
    { kpi_id: 'k2', year: 2025, month: 11, day: 6, value: 5 },
  ];
  const monthlyData = [
    { kpi_id: 'k1', value: 100 },
    { kpi_id: 'k2', value: 50 },
  ];

  const makeThenable = (payload) => ({
    then: (resolve) => resolve(payload)
  });

  const supabase = {
    __captures: { dailyInArgs, monthlyInArgs, monthlyUserInArgs, dailyUpsertValueType, dailyEqDayCapture },
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

      if (table === 'kpi_daily_reports') {
        const chain = {};
        chain.select = jest.fn(() => chain);
        chain.eq = jest.fn((col, val) => { 
          if (col === 'day') { 
            dailyEqDayCapture.called = true; 
            dailyEqDayCapture.value = val; 
          } 
          return chain; 
        });
        chain.in = jest.fn((col, arr) => { 
          dailyInArgs.called = true; 
          dailyInArgs.args = arr; 
          return chain; 
        });
        chain.match = jest.fn(() => chain);
        chain.order = jest.fn(() => chain);
        // await query; desteklemek için thenable
        chain.then = (resolve) => resolve({ data: dailyData, error: null });
        chain.upsert = jest.fn((row) => {
          // value sayı olarak normalize edilmeli
          if (row && Object.prototype.hasOwnProperty.call(row, 'value')) {
            dailyUpsertValueType.called = true;
            dailyUpsertValueType.isNumber = typeof row.value === 'number';
            if (!dailyUpsertValueType.isNumber) {
              throw new Error('daily value should be number');
            }
          }
          return { error: null };
        });
        return chain;
      }

      if (table === 'kpi_reports') {
        const chain = {};
        chain.select = jest.fn(() => chain);
        chain.eq = jest.fn(() => chain);
        chain.in = jest.fn((col, arr) => { monthlyInArgs.called = true; monthlyInArgs.args = arr; return chain; });
        chain.order = jest.fn(() => chain);
        chain.then = (resolve) => resolve({ data: monthlyData, error: null });
        chain.upsert = jest.fn((row) => {
          // value sayı olarak normalize edilmeli
          if (row && Object.prototype.hasOwnProperty.call(row, 'value')) {
            if (typeof row.value !== 'number') {
              throw new Error('value should be number');
            }
          }
          return { error: null };
        });
        chain.delete = jest.fn(() => ({ match: jest.fn(() => ({ error: null })) }));
        return chain;
      }

      // monthly user endpoint ile aynı tablo, farklı in() yakalama için basit bir mock route içinde yapılacak
      return { select: jest.fn(() => ({ data: [], error: null })) };
    })
  };

  return { supabase };
});

describe('Rapor uçları sınır durumları', () => {
  process.env.NODE_ENV = 'test';
  const app = require('../index');

  it('GET /api/reports/daily kpi_ids içinde boş değerleri filtreler', async () => {
    const res = await request(app)
      .get('/api/reports/daily')
      .query({ brand_id: brandUUID, year: 2025, month: 11, kpi_ids: 'k1,,k2,' })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(200);
    const { supabase } = require('../supabase');
    expect(supabase.__captures.dailyInArgs.called).toBe(true);
    expect(supabase.__captures.dailyInArgs.args).toEqual(['k1', 'k2']);
  });

  it('GET /api/reports/monthly kpi_ids içinde boş değerleri filtreler', async () => {
    const res = await request(app)
      .get('/api/reports/monthly')
      .query({ brand_id: brandUUID, year: 2025, month: 11, kpi_ids: 'k1,,k2,' })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(200);
    const { supabase } = require('../supabase');
    expect(supabase.__captures.monthlyInArgs.called).toBe(true);
    expect(supabase.__captures.monthlyInArgs.args).toEqual(['k1', 'k2']);
  });

  it('POST /api/reports/monthly value string verilse de sayı olarak normalize edilir', async () => {
    const res = await request(app)
      .post('/api/reports/monthly')
      .set('Authorization', 'Bearer testtoken')
      .send({ brand_id: brandUUID, year: 2025, month: 11, kpi_id: 'k1', value: '12.5' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/reports/daily value string verilse de sayı olarak normalize edilir', async () => {
    const res = await request(app)
      .post('/api/reports/daily')
      .set('Authorization', 'Bearer testtoken')
      .send({ brand_id: brandUUID, year: 2025, month: 11, day: 6, kpi_id: 'k2', value: '7.5' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    const { supabase } = require('../supabase');
    expect(supabase.__captures.dailyUpsertValueType.called).toBe(true);
    expect(supabase.__captures.dailyUpsertValueType.isNumber).toBe(true);
  });

  it('GET /api/reports/daily day parametresi ile gün filtresi uygular', async () => {
    const res = await request(app)
      .get('/api/reports/daily')
      .query({ brand_id: brandUUID, year: 2025, month: 11, day: 6 })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(200);
    const { supabase } = require('../supabase');
    expect(supabase.__captures.dailyEqDayCapture.called).toBe(true);
    expect(supabase.__captures.dailyEqDayCapture.value).toBe('6');
  });

  it('GET /api/reports/daily kpi_ids içindeki whitespace trimlenir', async () => {
    const res = await request(app)
      .get('/api/reports/daily')
      .query({ brand_id: brandUUID, year: 2025, month: 11, kpi_ids: ' k1 , , k2 ' })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(200);
    const { supabase } = require('../supabase');
    expect(supabase.__captures.dailyInArgs.called).toBe(true);
    expect(supabase.__captures.dailyInArgs.args).toEqual(['k1', 'k2']);
  });

  it('GET /api/reports/monthly kpi_ids içindeki whitespace trimlenir', async () => {
    const res = await request(app)
      .get('/api/reports/monthly')
      .query({ brand_id: brandUUID, year: 2025, month: 11, kpi_ids: ' k1 , , k2 ' })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(200);
    const { supabase } = require('../supabase');
    expect(supabase.__captures.monthlyInArgs.called).toBe(true);
    expect(supabase.__captures.monthlyInArgs.args).toEqual(['k1', 'k2']);
  });

  it('GET /api/reports/monthly/user kpi_ids içindeki whitespace trimlenir', async () => {
    const res = await request(app)
      .get('/api/reports/monthly/user')
      .query({ brand_id: brandUUID, year: 2025, kpi_ids: ' k1 , , k2 ' })
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(200);
    const { supabase } = require('../supabase');
    expect(supabase.__captures.monthlyInArgs.called).toBe(true);
    expect(supabase.__captures.monthlyInArgs.args).toEqual(['k1', 'k2']);
  });
});