const request = require('supertest');
const express = require('express');

// Auth middleware'lerini bypass et
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => { req.user = { id: 'admin-user' }; req.role = 'admin'; next(); },
  requireAdmin: (req, res, next) => next()
}));

// Supabase mock: roles tablo aksiyonları
jest.mock('../supabase', () => {
  const listChain = {};
  listChain.select = jest.fn(() => listChain);
  listChain.order = jest.fn(() => listChain);
  listChain.eq = jest.fn(() => listChain);
  listChain.or = jest.fn(() => ({
    data: [
      { id: 'r1', name: 'admin', description: 'Yönetici', status: 'aktif', created_at: '2024-01-01' },
      { id: 'r2', name: 'user', description: 'Kullanıcı', status: 'pasif', created_at: '2024-01-02' }
    ],
    error: null
  }));

  const insertChain = {
    insert: jest.fn(() => ({ select: jest.fn(() => ({ single: jest.fn(() => ({
      data: { id: 'r3', name: 'editor', description: 'Editör', status: 'aktif' },
      error: null
    })) })) }))
  };

  const updateChain = {
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({ single: jest.fn(() => ({
          data: { id: 'r2', name: 'user', description: 'Kullanıcı', status: 'pasif' },
          error: null
        })) }))
      }))
    }))
  };

  const deleteChain = {
    delete: jest.fn(() => ({ eq: jest.fn(() => ({ error: null })) }))
  };

  const fromMock = jest.fn((table) => {
    if (table === 'roles') return {
      select: listChain.select,
      order: listChain.order,
      eq: listChain.eq,
      or: listChain.or,
      insert: insertChain.insert,
      update: updateChain.update,
      delete: deleteChain.delete
    };
    return { select: jest.fn(() => ({ data: [], error: null })) };
  });

  return {
    supabase: { from: fromMock }
  };
});

describe('Admin rol yönetimi', () => {
  const app = express();
  app.use(express.json());
  const adminRouter = require('../routes/admin');
  const { globalErrorHandler } = require('../middleware/errorHandler');
  app.use('/api/admin', adminRouter);
  app.use(globalErrorHandler);

  it('GET /api/admin/roles sendList formatında rol listesini döner', async () => {
    const res = await request(app).get('/api/admin/roles?search=adm');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.length).toBe(2);
  });

  it('POST /api/admin/roles yeni rol oluşturur ve sendCreated döner', async () => {
    const res = await request(app)
      .post('/api/admin/roles')
      .send({ name: 'editor', description: 'Editör', status: 'aktif' });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role.name).toBe('editor');
  });

  it('PUT /api/admin/roles/:id rolü günceller ve sendSuccess döner', async () => {
    const res = await request(app)
      .put('/api/admin/roles/r2')
      .send({ status: 'pasif' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role.status).toBe('pasif');
  });

  it('DELETE /api/admin/roles/:id rolü siler ve sendSuccess döner', async () => {
    const res = await request(app)
      .delete('/api/admin/roles/r2');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/başarıyla silindi/i);
  });
});