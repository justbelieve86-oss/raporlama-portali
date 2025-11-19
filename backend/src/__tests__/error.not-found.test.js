const request = require('supertest');

describe('Global 404 notFoundHandler', () => {
  // Test ortamında globalErrorHandler production yolu çalışır (NODE_ENV !== 'development')
  const app = require('../index');

  it('Bilinmeyen API route için 404 ve ROUTE_NOT_FOUND döner', async () => {
    const res = await request(app).get('/api/this-route-does-not-exist');
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('status', 'fail');
    expect(res.body).toHaveProperty('code', 'ROUTE_NOT_FOUND');
    expect(res.body).toHaveProperty('message');
    expect(String(res.body.message)).toMatch(/Route bulunamadı/i);
  });
});