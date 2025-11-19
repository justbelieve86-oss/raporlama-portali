const request = require('supertest');
const express = require('express');

// Auth middleware'lerini bypass et
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => { req.user = { id: 'admin-user' }; req.role = 'admin'; next(); },
  requireAdmin: (req, res, next) => next()
}));

// Validation middleware'ini bypass et
jest.mock('../middleware/validation', () => ({
  validateInput: () => (req, res, next) => next(),
  schemas: {}
}));

// Supabase mock
jest.mock('../supabase', () => {
  const state = {
    // ikinci getUserById çağrısı için aynı kullanıcıyı döndürebiliriz
    user: {
      id: 'u999',
      email: 'old@example.com',
      created_at: '2024-01-01T00:00:00Z',
      last_sign_in_at: null,
      user_metadata: { username: 'olduser', full_name: 'Old User', role: 'user' }
    }
  };

  const profilesChain = {
    upsert: jest.fn(() => ({ error: null })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => ({ data: { role: 'admin' }, error: null }))
      }))
    }))
  };

  const userBrandsChain = {
    delete: jest.fn(() => ({ eq: jest.fn(() => ({ error: null })) })),
    insert: jest.fn(() => ({ error: null })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        data: [{ brand_id: 'b1' }, { brand_id: 'b2' }],
        error: null
      }))
    }))
  };

  const brandsChain = {
    select: jest.fn(() => ({
      in: jest.fn(() => ({
        data: [
          { id: 'b1', name: 'Brand A' },
          { id: 'b2', name: 'Brand B' }
        ],
        error: null
      }))
    }))
  };

  const fromMock = jest.fn((table) => {
    if (table === 'profiles') return profilesChain;
    if (table === 'user_brands') return userBrandsChain;
    if (table === 'brands') return brandsChain;
    return { select: jest.fn(() => ({ data: [], error: null })) };
  });

  const getUserByIdMock = jest.fn(() => ({ data: { user: state.user }, error: null }));
  const updateUserByIdMock = jest.fn((id, payload) => {
    if (payload && typeof payload === 'object') {
      if (payload.email) state.user.email = payload.email;
      if (payload.user_metadata) state.user.user_metadata = payload.user_metadata;
    }
    return { data: { user: state.user }, error: null };
  });

  return {
    supabase: {
      from: fromMock,
      auth: {
        headers: { Authorization: 'Bearer service_key' },
        admin: {
          getUserById: getUserByIdMock,
          updateUserById: updateUserByIdMock
        }
      }
    }
  };
});

describe('Admin kullanıcı güncelleme', () => {
  const app = express();
  app.use(express.json());
  const adminRouter = require('../routes/admin');
  app.use('/api/admin', adminRouter);

  it('PUT /api/admin/users/:userId kullanıcı bilgilerini ve markaları günceller', async () => {
    const payload = {
      email: 'new@example.com',
      role: 'admin',
      username: 'newuser',
      full_name: 'New User',
      password: 'NewStr0ng!',
      brandIds: ['b1', 'b2']
    };

    const res = await request(app)
      .put('/api/admin/users/u999')
      .send(payload);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.id).toBe('u999');
    expect(res.body.data.user.email).toBe('new@example.com');
    expect(res.body.data.user.role).toBe('admin');
    expect(res.body.data.user.user_metadata.username).toBe('newuser');
    expect(res.body.data.user.user_metadata.full_name).toBe('New User');
    expect(res.body.data.user.brands.map(b => b.name)).toEqual(['Brand A', 'Brand B']);
  });
});