const request = require('supertest');
const express = require('express');

// Auth middleware'lerini bypass et
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => { req.user = { id: 'admin-user' }; req.role = 'admin'; next(); },
  requireAdmin: (req, res, next) => next()
}));

// Supabase mock: user_brands -> brand_id listesi döner
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn((table) => {
      if (table === 'user_brands') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              data: [{ brand_id: 'b1' }, { brand_id: 'b2' }],
              error: null
            }))
          }))
        };
      }
      return { select: jest.fn(() => ({ data: [], error: null })) };
    })
  }
}));

describe('Admin kullanıcı marka listesi', () => {
  const app = express();
  const adminRouter = require('../routes/admin');
  app.use('/api/admin', adminRouter);

  it('GET /api/admin/users/:userId/brands brandIds listesini döner', async () => {
    const res = await request(app).get('/api/admin/users/u123/brands');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data.brandIds)).toBe(true);
    expect(res.body.data.brandIds).toEqual(['b1', 'b2']);
  });
});