const request = require('supertest');
const express = require('express');

describe('Health route', () => {
  const app = express();
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});