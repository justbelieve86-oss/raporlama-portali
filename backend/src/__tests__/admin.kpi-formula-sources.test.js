const request = require('supertest');
const express = require('express');

// Auth middleware'lerini bypass et (admin olarak)
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => { req.user = { id: 'admin-user' }; req.role = 'admin'; next(); },
  requireAdmin: (req, res, next) => next()
}));

// Supabase mock: kpi_formulas ve kpi_cumulative_sources için zincirler
jest.mock('../supabase', () => {
  const formulasChain = {
    upsert: jest.fn((row) => ({ select: jest.fn(() => ({ single: jest.fn(() => ({ data: row, error: null })) })) })),
    delete: jest.fn(() => ({ eq: jest.fn(() => ({ error: null })) })),
    select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: { code: 'PGRST116', message: 'No rows found' } })) })) }))
  };

  const sourcesChain = {
    select: jest.fn(() => ({ eq: jest.fn(() => ({ data: [ { source_kpi_id: 'k1' }, { source_kpi_id: 'k2' } ], error: null })) })),
    delete: jest.fn(() => ({ eq: jest.fn(() => ({ error: null })) })),
    insert: jest.fn(() => ({ error: null }))
  };

  const kpisChain = {
    update: jest.fn(() => ({ eq: jest.fn(() => ({ select: jest.fn(() => ({ single: jest.fn(() => ({ data: { id: 'k123' }, error: null })) })) })) }))
  };

  const fromMock = jest.fn((table) => {
    if (table === 'kpi_formulas') return formulasChain;
    if (table === 'kpi_cumulative_sources') return sourcesChain;
    if (table === 'kpis') return kpisChain;
    return { select: jest.fn(() => ({ data: [], error: null })) };
  });

  return { supabase: { from: fromMock } };
});

describe('Admin KPI formülü ve kaynak sözleşmeleri', () => {
  const app = express();
  app.use(express.json());
  const adminRouter = require('../routes/admin');
  const { globalErrorHandler } = require('../middleware/errorHandler');
  app.use('/api/admin', adminRouter);
  app.use(globalErrorHandler);

  it('GET /api/admin/kpis/:id/formula formül yoksa default nesne döner', async () => {
    const res = await request(app).get('/api/admin/kpis/k123/formula');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({ kpi_id: 'k123', expression: '', display_expression: '' });
  });

  it('PUT /api/admin/kpis/:id/formula expression doluysa başarıyla günceller', async () => {
    const payload = { expression: 'a+b', display_expression: 'A + B' };
    const res = await request(app).put('/api/admin/kpis/k123/formula').send(payload);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.formula.expression).toBe('a+b');
    expect(res.body.data.formula.display_expression).toBe('A + B');
  });

  it('PUT /api/admin/kpis/:id/formula expression boşsa formülü siler', async () => {
    const res = await request(app).put('/api/admin/kpis/k123/formula').send({ expression: '   ' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/admin/kpis/:id/sources kümülatif kaynakları standart format ile döner', async () => {
    const res = await request(app).get('/api/admin/kpis/k123/sources');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items).toEqual(['k1', 'k2']);
  });

  it('PUT /api/admin/kpis/:id temel alanlar + formül ve kaynakları günceller', async () => {
    const payload = { name: 'KPI X', formulaText: 'X + Y', cumulativeSourceIds: ['s1', 's2'] };
    const res = await request(app).put('/api/admin/kpis/k123').send(payload);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});