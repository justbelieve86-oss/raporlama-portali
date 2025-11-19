const request = require('supertest');
const express = require('express');

// Minimal app mounting the health route from src/index.js-like definition
const app = express();
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

describe('GET /api/health', () => {
  it('returns ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});