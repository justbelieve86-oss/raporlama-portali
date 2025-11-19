const request = require('supertest');
const express = require('express');

// Supabase Auth client mock: token doğrulamasını kontrol edilebilir hale getir
jest.mock('../supabaseAuth', () => ({
  createAuthClient: () => ({
    auth: {
      getUser: jest.fn((token) => {
        if (token === 'validtoken') {
          return Promise.resolve({ data: { user: { id: 'u1' } }, error: null });
        }
        return Promise.resolve({ data: { user: null }, error: { message: 'invalid' } });
      })
    }
  })
}));

// Supabase mock: profiles->single ile role döndür
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn((table) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({ data: { role: 'user' }, error: null }))
            }))
          }))
        };
      }
      return { select: jest.fn(() => ({ data: [], error: null })) };
    })
  }
}));

describe('requireAuth middleware', () => {
  const { requireAuth } = require('../middleware/auth');
  const app = express();
  app.get('/secure', requireAuth, (req, res) => {
    res.json({ ok: true, role: req.role });
  });

  it('Authorization header yoksa 401 ve mesaj döner', async () => {
    const res = await request(app).get('/secure');
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('message');
    expect(String(res.body.message)).toMatch(/token yok/i);
  });

  it('Geçersiz token ile 401 ve Geçersiz token mesajı döner', async () => {
    const res = await request(app)
      .get('/secure')
      .set('Authorization', 'Bearer badtoken');
    expect(res.statusCode).toBe(401);
    expect(String(res.body.message)).toMatch(/Geçersiz token/i);
  });

  it('Geçerli token ile 200 ve role atanmış döner', async () => {
    const res = await request(app)
      .get('/secure')
      .set('Authorization', 'Bearer validtoken');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
    expect(res.body).toHaveProperty('role', 'user');
  });
});