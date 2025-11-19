const request = require('supertest');
const express = require('express');

// Auth middleware: kullanıcı var ama admin değil -> 403 beklenir
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => { req.user = { id: 'user-1' }; req.role = 'user'; next(); },
  requireAdmin: (req, res, next) => {
    if (req.role !== 'admin') {
      return res.status(403).json({ message: 'Admin yetkisi gerekli' });
    }
    next();
  }
}));

// Supabase mock: Bu testlerde route'lara girilmeden 403 döneceği için basit mock yeterli
jest.mock('../supabase', () => ({
  supabase: { from: jest.fn(() => ({ select: jest.fn(() => ({ data: [], error: null })) })) }
}));

describe('Admin yetkisiz erişim negatif senaryolar', () => {
  const app = express();
  app.use(express.json());
  const adminRouter = require('../routes/admin');
  app.use('/api/admin', adminRouter);

  it('GET /api/admin/brands admin olmayan için 403 döner', async () => {
    const res = await request(app).get('/api/admin/brands');
    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toMatch(/Admin yetkisi gerekli/i);
  });

  it('POST /api/admin/roles admin olmayan için 403 döner', async () => {
    const res = await request(app)
      .post('/api/admin/roles')
      .send({ name: 'editor' });
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/Admin yetkisi gerekli/i);
  });

  it('DELETE /api/admin/users/:userId admin olmayan için 403 döner', async () => {
    const res = await request(app).delete('/api/admin/users/00000000-0000-0000-0000-000000000001');
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/Admin yetkisi gerekli/i);
  });
});