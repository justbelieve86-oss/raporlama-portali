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

// Supabase mock: brands tablo aksiyonları
jest.mock('../supabase', () => {
  const listChain = {};
  listChain.select = jest.fn(() => listChain);
  listChain.order = jest.fn(() => listChain);
  listChain.eq = jest.fn(() => listChain);
  listChain.or = jest.fn(() => ({
    data: [
      { id: 'b1', name: 'Brand A', description: 'Açıklama A', status: 'aktif', created_at: '2024-01-01' },
      { id: 'b2', name: 'Brand B', description: 'Açıklama B', status: 'pasif', created_at: '2024-01-02' }
    ],
    error: null
  }));

  const insertChain = {
    insert: jest.fn(() => ({ select: jest.fn(() => ({ single: jest.fn(() => ({
      data: { id: 'b3', name: 'Brand C', description: 'Açıklama C', status: 'aktif' },
      error: null
    })) })) }))
  };

  const updateChain = {
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({ single: jest.fn(() => ({
          data: { id: 'b2', name: 'Brand B', description: 'Açıklama B', status: 'pasif' },
          error: null
        })) }))
      }))
    }))
  };

  const deleteChain = {
    delete: jest.fn(() => ({ eq: jest.fn(() => ({ error: null })) }))
  };

  const fromMock = jest.fn((table) => {
    if (table === 'brands') return {
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

describe('Admin marka yönetimi', () => {
  const app = express();
  app.use(express.json());
  const adminRouter = require('../routes/admin');
  const { globalErrorHandler } = require('../middleware/errorHandler');
  app.use('/api/admin', adminRouter);
  app.use(globalErrorHandler);

  it('GET /api/admin/brands sendList formatında marka listesini döner', async () => {
    const res = await request(app).get('/api/admin/brands?search=bra');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.length).toBe(2);
  });

  it('POST /api/admin/brands yeni marka oluşturur ve sendCreated döner', async () => {
    const res = await request(app)
      .post('/api/admin/brands')
      .send({ name: 'Brand C', description: 'Açıklama C', status: 'aktif' });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.brand.name).toBe('Brand C');
  });

  it('PUT /api/admin/brands/:id markayı günceller ve sendSuccess döner', async () => {
    const res = await request(app)
      .put('/api/admin/brands/b2')
      .send({ status: 'pasif' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.brand.status).toBe('pasif');
  });

  it('DELETE /api/admin/brands/:id markayı siler ve sendSuccess döner', async () => {
    const res = await request(app)
      .delete('/api/admin/brands/b2');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/başarıyla silindi/i);
  });
});