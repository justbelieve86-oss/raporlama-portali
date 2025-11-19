const request = require('supertest');
const express = require('express');

// Auth middleware'lerini bypass et
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => { req.user = { id: 'u1' }; req.role = 'admin'; next(); },
  requireAdmin: (req, res, next) => next()
}));

// Supabase'i tabloya göre farklı response döndürecek şekilde mockla
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn((table) => {
      if (table === 'kpis') {
        const chain = {};
        chain.select = jest.fn(() => chain);
        chain.order = jest.fn(() => ({
          data: [
            { id: 'k1', name: 'Satış', category: 'Gelir', unit: '%', status: 'active', report_count: 0, ytd_calc: null, created_at: '2024-01-01', updated_at: '2024-01-02', calculation_type: null, numerator_kpi_id: null, denominator_kpi_id: null, target: null, only_cumulative: false, projection: null }
          ],
          error: null
        }));
        return chain;
      }
      if (table === 'kpi_formulas') {
        return {
          select: jest.fn(() => ({
            data: [{ kpi_id: 'k1', display_expression: 'A/B' }],
            error: null
          }))
        };
      }
      if (table === 'kpi_cumulative_sources') {
        return {
          select: jest.fn(() => ({
            data: [{ kpi_id: 'k1', source_kpi_id: 'k2' }],
            error: null
          }))
        };
      }
      // default: boş dönüş
      return { select: jest.fn(() => ({ data: [], error: null })) };
    })
  }
}));

describe('Admin KPIs listesi', () => {
  const app = express();
  const adminRouter = require('../routes/admin');
  app.use('/api/admin', adminRouter);

  it('GET /api/admin/kpis sendList formatında veri döner', async () => {
    const res = await request(app).get('/api/admin/kpis');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].id).toBe('k1');
    expect(res.body.data.items[0].formula_text).toBe('A/B');
    expect(res.body.data.items[0].cumulative_source_ids).toEqual(['k2']);
  });
});