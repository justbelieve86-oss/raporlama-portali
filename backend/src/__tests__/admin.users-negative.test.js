const request = require('supertest');
const express = require('express');

// Auth middleware'lerini bypass et (admin ve sabit user id)
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => { req.user = { id: 'self-user' }; req.role = 'admin'; next(); },
  requireAdmin: (req, res, next) => next()
}));

// Validation bypass etmeyelim: route kendi AppError'larını test edeceğiz
jest.mock('../middleware/validation', () => ({
  validateInput: () => (req, res, next) => next(),
  schemas: {}
}));

// Supabase admin API mockları
jest.mock('../supabase', () => {
  const createUserMock = jest.fn(() => ({ data: null, error: { message: 'already registered' } }));
  const deleteUserMock = jest.fn(() => ({ data: null, error: { message: 'failed' } }));
  return {
    supabase: {
      from: jest.fn(() => ({ select: jest.fn(() => ({ data: [], error: null })) })),
      auth: {
        admin: {
          createUser: createUserMock,
          deleteUser: deleteUserMock
        }
      }
    }
  };
});

describe('Admin kullanıcı negatif senaryolar', () => {
  const originalEnv = process.env.NODE_ENV;
  beforeAll(() => { process.env.NODE_ENV = 'development'; });
  afterAll(() => { process.env.NODE_ENV = originalEnv; });
  const app = express();
  app.use(express.json());
  const adminRouter = require('../routes/admin');
  const { globalErrorHandler } = require('../middleware/errorHandler');
  app.use('/api/admin', adminRouter);
  app.use(globalErrorHandler);

  it('POST /api/admin/users aynı email kayıtlıysa 409 ve EMAIL_EXISTS döner', async () => {
    const payload = { email: 'exists@example.com', password: 'StrongP@ss', role: 'user' };
    const res = await request(app).post('/api/admin/users').send(payload);
    expect(res.statusCode).toBe(409);
    expect(res.body.status).toBe('fail');
    expect(res.body.code).toBe('EMAIL_EXISTS');
  });

  it('DELETE /api/admin/users/:userId kendi hesabını silmeye çalışırsa 400 ve CANNOT_DELETE_SELF', async () => {
    const res = await request(app).delete('/api/admin/users/self-user');
    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe('fail');
    expect(res.body.code).toBe('CANNOT_DELETE_SELF');
  });

  it('DELETE /api/admin/users/:userId supabase hata verirse 400 ve USER_DELETE_FAILED', async () => {
    const res = await request(app).delete('/api/admin/users/other-user');
    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe('fail');
    expect(res.body.code).toBe('USER_DELETE_FAILED');
  });
});