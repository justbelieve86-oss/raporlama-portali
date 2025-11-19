const request = require('supertest');
const express = require('express');

// Auth middleware'lerini bypass et (admin olarak ayarla)
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => { req.user = { id: 'admin-user' }; req.role = 'admin'; next(); },
  requireAdmin: (req, res, next) => next()
}));

// Validation middleware'ini bypass et (route içindeki AppError kontratını doğrulamak için)
jest.mock('../middleware/validation', () => ({
  validateInput: () => (req, res, next) => next(),
  schemas: {}
}));

// Supabase mock: Bu testlerde, hatalar validation sonrası veya route başında fırlatıldığı için DB çağrısı beklenmez
jest.mock('../supabase', () => ({
  supabase: { from: jest.fn(() => ({ insert: jest.fn(), update: jest.fn() })) }
}));

describe('Admin marka yönetimi - geçersiz payload', () => {
  const originalEnv = process.env.NODE_ENV;
  beforeAll(() => { process.env.NODE_ENV = 'development'; });
  afterAll(() => { process.env.NODE_ENV = originalEnv; });

  const app = express();
  app.use(express.json());
  const adminRouter = require('../routes/admin');
  const { globalErrorHandler } = require('../middleware/errorHandler');
  app.use('/api/admin', adminRouter);
  app.use(globalErrorHandler);

  it('POST /api/admin/brands name eksik olduğunda 400 ve NAME_REQUIRED döner', async () => {
    const res = await request(app)
      .post('/api/admin/brands')
      .send({ description: 'Desc', status: 'aktif' });
    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe('fail');
    expect(res.body.code).toBe('NAME_REQUIRED');
  });

  it('POST /api/admin/brands geçersiz status ile 400 ve INVALID_STATUS döner', async () => {
    const res = await request(app)
      .post('/api/admin/brands')
      .send({ name: 'Brand', description: 'Desc', status: 'gecersiz' });
    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe('fail');
    expect(res.body.code).toBe('INVALID_STATUS');
  });
});