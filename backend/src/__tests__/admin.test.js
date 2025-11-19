const request = require('supertest');
const express = require('express');

// Auth middleware'lerini bypass et
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => { req.user = { id: 'u1' }; req.role = 'admin'; next(); },
  requireAdmin: (req, res, next) => next()
}));

// Supabase'i basit bir select->order zinciri ile mockla
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn((table) => {
      const chain = {
        select: jest.fn(() => chain),
        order: jest.fn(() => ({ data: [{ name: 'Adet' }, { name: 'Yüzde' }], error: null }))
      };
      return chain;
    })
  }
}));

describe('Admin routes', () => {
  const app = express();
  const adminRouter = require('../routes/admin');
  app.use('/api/admin', adminRouter);

  it('GET /api/admin/kpi-units returns success and array data', async () => {
    const res = await request(app).get('/api/admin/kpi-units');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});