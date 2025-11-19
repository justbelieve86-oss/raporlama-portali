const request = require('supertest');
const express = require('express');

jest.mock('../supabaseAuth', () => {
  return {
    createAuthClient: () => ({
      auth: {
        signInWithPassword: jest.fn().mockResolvedValue({
          data: {
            session: { access_token: 'test_access_token', refresh_token: 'test_refresh_token' },
            user: { id: 'u1', user_metadata: { role: 'admin' } }
          },
          error: null
        })
      }
    })
  };
});

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({ data: [], error: null }))
    }))
  }
}));

jest.mock('../middleware/validation', () => {
  return {
    validateInput: () => (req, res, next) => next(),
    schemas: { login: {}, verifyPassword: {} }
  };
});

describe('Auth routes', () => {
  const app = express();
  app.use(express.json());
  const authRouter = require('../routes/auth');
  app.use('/api/auth', authRouter);

  it('POST /api/auth/login returns success and tokens', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'test@example.com', password: 'secret' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.token).toBe('test_access_token');
    expect(res.body.data.refresh_token).toBe('test_refresh_token');
    expect(res.body.data.role).toBe('admin');
  });
});