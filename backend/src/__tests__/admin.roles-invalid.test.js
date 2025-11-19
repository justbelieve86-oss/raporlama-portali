const request = require('supertest');
const express = require('express');

// Auth middleware'lerini bypass et (admin olarak ayarla)
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => { req.user = { id: 'admin-user' }; req.role = 'admin'; next(); },
  requireAdmin: (req, res, next) => next()
}));

// Supabase mock: Bu testlerde DB çağrısına gidilmeden AppError fırlatılacak
jest.mock('../supabase', () => ({
  supabase: { from: jest.fn(() => ({ insert: jest.fn() })) }
}));

describe('Admin rol yönetimi - geçersiz payload', () => {
  const originalEnv = process.env.NODE_ENV;
  beforeAll(() => { process.env.NODE_ENV = 'development'; });
  afterAll(() => { process.env.NODE_ENV = originalEnv; });

  const app = express();
  app.use(express.json());
  const adminRouter = require('../routes/admin');
  const { globalErrorHandler } = require('../middleware/errorHandler');
  app.use('/api/admin', adminRouter);
  app.use(globalErrorHandler);

  it('POST /api/admin/roles name eksik olduğunda 400 ve NAME_REQUIRED döner', async () => {
    const res = await request(app)
      .post('/api/admin/roles')
      .send({ description: 'Desc', status: 'aktif' });
    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe('fail');
    expect(res.body.code).toBe('NAME_REQUIRED');
  });

  it('POST /api/admin/roles geçersiz status ile 400 ve INVALID_STATUS döner', async () => {
    const res = await request(app)
      .post('/api/admin/roles')
      .send({ name: 'editor', description: 'Desc', status: 'gecersiz' });
    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe('fail');
    expect(res.body.code).toBe('INVALID_STATUS');
  });
});