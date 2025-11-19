const request = require('supertest');
const express = require('express');

// Auth middleware'ini bypass et
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => { 
    req.user = { id: 'u1' }; 
    req.role = 'Genel Koordinatör'; // PUT testi için role gerekli
    next(); 
  },
}));

// Supabase Auth client: token doğrulaması için kullanıcı döndür
jest.mock('../supabaseAuth', () => ({
  createAuthClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'u1' } },
        error: null
      })
    }
  })
}));

// Supabase: select/eq/order ve delete/insert zincirlerini mockla
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn((table) => {
      if (table === 'profiles') {
        const chain = {};
        chain.select = jest.fn(() => chain);
        chain.eq = jest.fn(() => chain);
        chain.single = jest.fn(() => Promise.resolve({ data: { id: 'gk-id', role: 'Genel Koordinatör' }, error: null }));
        chain.ilike = jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ 
            data: [{ id: 'gk-id', role: 'Genel Koordinatör' }], 
            error: null 
          }))
        }));
        return chain;
      }

      if (table === 'user_kpi_ordering') {
        const chain = {};
        chain.select = jest.fn(() => chain);
        chain.eq = jest.fn(() => chain);
        chain.order = jest.fn(() => Promise.resolve({
          data: [
            { kpi_id: 'k1', order_index: 0, kpis: { id: 'k1', name: 'Satış', category: 'Gelir', unit: '%' } },
            { kpi_id: 'k2', order_index: 1, kpis: { id: 'k2', name: 'Maliyet', category: 'Gider', unit: '₺' } },
          ],
          error: null
        }));
        const deleteChain = {};
        deleteChain.eq = jest.fn(() => deleteChain);
        deleteChain.match = jest.fn(() => Promise.resolve({ error: null }));
        chain.delete = jest.fn(() => deleteChain);
        chain.insert = jest.fn(() => Promise.resolve({ error: null }));
        return chain;
      }

      const chain = {};
      chain.select = jest.fn(() => chain);
      chain.eq = jest.fn(() => chain);
      chain.order = jest.fn(() => Promise.resolve({
        data: [
          { kpi_id: 'k1', order_index: 0, kpis: { id: 'k1', name: 'Satış', category: 'Gelir', unit: '%' } },
          { kpi_id: 'k2', order_index: 1, kpis: { id: 'k2', name: 'Maliyet', category: 'Gider', unit: '₺' } },
        ],
        error: null
      }));
      chain.delete = jest.fn(() => Promise.resolve({ error: null }));
      chain.insert = jest.fn(() => Promise.resolve({ error: null }));
      chain.upsert = jest.fn(() => Promise.resolve({ error: null }));
      return chain;
    })
  }
}));

describe('KPI Ordering routes', () => {
  const app = express();
  app.use(express.json());
  const router = require('../routes/kpi-ordering');
  app.use('/api/kpi-ordering', router);

  it('GET /api/kpi-ordering/:brandId returns ordered items with auth', async () => {
    const res = await request(app)
      .get('/api/kpi-ordering/brand-1')
      .set('Authorization', 'Bearer testtoken');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items[0].kpi_id).toBe('k1');
    expect(res.body.data.items[0].kpis.name).toBe('Satış');
  });

  it('PUT /api/kpi-ordering/:brandId updates ordering with auth', async () => {
    const payload = { kpiOrdering: [{ kpi_id: 'k2' }, { kpi_id: 'k1' }] };
    const res = await request(app)
      .put('/api/kpi-ordering/brand-1')
      .set('Authorization', 'Bearer testtoken')
      .send(payload);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});