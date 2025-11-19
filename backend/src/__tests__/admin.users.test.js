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

// Supabase'i kullanıcı oluşturma ve listeleme için mockla
jest.mock('../supabase', () => {
  const profilesChain = {};
  profilesChain.insert = jest.fn(() => ({ error: null }));
  profilesChain.select = jest.fn(() => profilesChain);
  profilesChain['in'] = jest.fn((col, ids) => ({
    data: (ids || []).map((id, idx) => ({ id, role: idx === 0 ? 'admin' : 'user' })),
    error: null
  }));

  const userBrandsChain = { insert: jest.fn(() => ({ error: null })) };

  const brandsChain = {};
  brandsChain.select = jest.fn(() => brandsChain);
  brandsChain['in'] = jest.fn(() => ({
    data: [
      { id: 'b1', name: 'Brand A' },
      { id: 'b2', name: 'Brand B' }
    ],
    error: null
  }));

  const fromMock = jest.fn((table) => {
    if (table === 'profiles') return profilesChain;
    if (table === 'user_brands') return userBrandsChain;
    if (table === 'brands') return brandsChain;
    // default
    return { select: jest.fn(() => ({ data: [], error: null })) };
  });

  const listUsersMock = jest.fn(() => ({
    data: {
      users: [
        {
          id: 'u1',
          email: 'user1@example.com',
          created_at: '2024-01-01T00:00:00Z',
          last_sign_in_at: '2024-01-03T00:00:00Z',
          user_metadata: { username: 'user1', full_name: 'User One' }
        },
        {
          id: 'u2',
          email: 'user2@example.com',
          created_at: '2024-02-01T00:00:00Z',
          last_sign_in_at: null,
          user_metadata: { username: 'user2', full_name: 'User Two' }
        }
      ]
    },
    error: null
  }));

  const createUserMock = jest.fn(({ email }) => ({
    data: {
      user: {
        id: 'u123',
        email,
        created_at: '2024-03-01T00:00:00Z',
        last_sign_in_at: null
      }
    },
    error: null
  }));

  const deleteUserMock = jest.fn(() => ({ data: null, error: null }));

  return {
    supabase: {
      from: fromMock,
      auth: {
        headers: { Authorization: 'Bearer service_key' },
        admin: {
          listUsers: listUsersMock,
          createUser: createUserMock,
          deleteUser: deleteUserMock
        }
      }
    }
  };
});

describe('Admin kullanıcı yönetimi', () => {
  const app = express();
  app.use(express.json());
  const adminRouter = require('../routes/admin');
  app.use('/api/admin', adminRouter);

  it('POST /api/admin/users yeni kullanıcıyı oluşturur ve sendCreated döner', async () => {
    const payload = {
      email: 'newuser@example.com',
      password: 'StrongP@ssw0rd',
      role: 'user',
      username: 'newuser',
      full_name: 'New User',
      brandIds: ['b1', 'b2']
    };

    const res = await request(app)
      .post('/api/admin/users')
      .send(payload);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.id).toBe('u123');
    expect(res.body.data.user.email).toBe('newuser@example.com');
    expect(Array.isArray(res.body.data.user.brands)).toBe(true);
    expect(res.body.data.user.brands.map(b => b.name)).toEqual(['Brand A', 'Brand B']);
  });

  it('GET /api/admin/users sendList formatında kullanıcıları döner', async () => {
    const res = await request(app)
      .get('/api/admin/users');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.length).toBe(2);
    expect(res.body.data.total).toBe(2);
    // Rol eşleşmesini doğrula
    const roles = res.body.data.items.map(u => u.role);
    expect(roles).toEqual(expect.arrayContaining(['admin', 'user']));
    // Metadata alanları mevcut
    expect(res.body.data.items[0].user_metadata).toBeDefined();
    expect(res.body.data.items[1].user_metadata).toBeDefined();
  });
});