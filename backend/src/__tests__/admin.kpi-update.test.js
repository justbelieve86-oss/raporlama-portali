const request = require('supertest');
const express = require('express');

// Auth middleware'lerini bypass et
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => { req.user = { id: 'u1' }; req.role = 'admin'; next(); },
  requireAdmin: (req, res, next) => next()
}));

// Supabase'i update, upsert ve cumulative sources işlemleri için mockla
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn((table) => {
      if (table === 'kpis') {
        const chain = {};
        chain.update = jest.fn(() => chain);
        chain.eq = jest.fn(() => chain);
        chain.select = jest.fn(() => chain);
        chain.single = jest.fn(() => ({
          data: { id: 'k1', name: 'New Name' },
          error: null
        }));
        return chain;
      }
      if (table === 'kpi_formulas') {
        return {
          upsert: jest.fn(() => ({
            select: jest.fn(() => ({ data: [{}], error: null }))
          }))
        };
      }
      if (table === 'kpi_cumulative_sources') {
        return {
          delete: jest.fn(() => ({ eq: jest.fn(() => ({ error: null })) })),
          insert: jest.fn(() => ({ error: null }))
        };
      }
      return {};
    })
  }
}));

describe('Admin KPI güncelleme', () => {
  const app = express();
  app.use(express.json());
  const adminRouter = require('../routes/admin');
  app.use('/api/admin', adminRouter);

  it('PUT /api/admin/kpis/:id temel alan + formül + kaynak günceller', async () => {
    const res = await request(app)
      .put('/api/admin/kpis/k1')
      .send({ name: 'New Name', formulaText: 'A+B', cumulativeSourceIds: ['k3', 'k4'] });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.success).toBe(true);
  });
});