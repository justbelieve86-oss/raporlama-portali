const request = require('supertest');
const express = require('express');

// Auth middleware'lerini bypass et
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => { req.user = { id: 'self-user' }; req.role = 'admin'; next(); },
  requireAdmin: (req, res, next) => next()
}));

// Validation middleware'ini bypass et
jest.mock('../middleware/validation', () => ({
  validateInput: () => (req, res, next) => next(),
  schemas: {}
}));

// Supabase mock
jest.mock('../supabase', () => {
  const deleteUserMock = jest.fn(() => ({ error: null }));
  return {
    supabase: {
      auth: {
        admin: {
          deleteUser: deleteUserMock
        }
      }
    }
  };
});

describe('Admin kullanıcı silme', () => {
  const originalEnv = process.env.NODE_ENV;
  beforeAll(() => { process.env.NODE_ENV = 'development'; });
  afterAll(() => { process.env.NODE_ENV = originalEnv; });
  const app = express();
  const adminRouter = require('../routes/admin');
  const { globalErrorHandler } = require('../middleware/errorHandler');
  app.use('/api/admin', adminRouter);
  app.use(globalErrorHandler);

  it('DELETE /api/admin/users/:userId kendi hesabını silmeye izin vermez', async () => {
    const res = await request(app).delete('/api/admin/users/self-user');
    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe('fail');
    expect(res.body.code).toBe('CANNOT_DELETE_SELF');
  });

  it('DELETE /api/admin/users/:userId başka kullanıcıyı başarılı şekilde siler', async () => {
    const res = await request(app).delete('/api/admin/users/other-user');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/başarıyla silindi/i);
  });
});