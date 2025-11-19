const request = require('supertest');
const express = require('express');

// validation middleware gerçek modülünü kullan
const { validateInput, schemas } = require('../middleware/validation');

describe('validateInput middleware birim testleri', () => {
  const app = express();
  app.use(express.json());

  // createUser: zorunlu ve format doğrulamaları
  app.post('/test/users', validateInput(schemas.createUser), (req, res) => {
    res.json({ ok: true });
  });

  // createKpiReport: sınır validasyonları (month max 12)
  app.post('/test/kpi-report', validateInput(schemas.createKpiReport), (req, res) => {
    res.json({ ok: true });
  });

  // createBrand: sanitize davranışı
  app.post('/test/brand', validateInput(schemas.createBrand), (req, res) => {
    res.json({ name: req.body.name, description: req.body.description || '' });
  });

  // reportQuery: brand_id UUID ve ay/gün aralık doğrulaması
  app.get('/test/report-query', validateInput(schemas.reportQuery), (req, res) => {
    res.json({ ok: true });
  });

  it('createUser: email eksikse 400 ve hata mesajı döner', async () => {
    const res = await request(app)
      .post('/test/users')
      .send({ password: 'secret123', role: 'user' });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Validation hatası');
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors).toEqual(expect.arrayContaining(['email alanı zorunludur']));
  });

  it('createUser: geçersiz email biçimi 400 döner', async () => {
    const res = await request(app)
      .post('/test/users')
      .send({ email: 'not-an-email', password: 'secret123' });
    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toEqual(expect.arrayContaining(['email geçerli bir email adresi olmalıdır']));
  });

  it('createKpiReport: month=13 için 400 ve "en fazla 12" hatası', async () => {
    const payload = {
      brand_id: '11111111-1111-1111-1111-111111111111',
      kpi_id: '22222222-2222-2222-2222-222222222222',
      month: 13,
      year: 2025,
      value: 10
    };
    const res = await request(app)
      .post('/test/kpi-report')
      .send(payload);
    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toEqual(expect.arrayContaining(['month en fazla 12 olmalıdır']));
  });

  it('createBrand: name sanitize edilip trim edilir', async () => {
    const res = await request(app)
      .post('/test/brand')
      .send({ name: '   <script>alert(1)</script>  ', description: '  desc  ' });
    expect(res.statusCode).toBe(200);
    // validator.escape ile XSS karakterleri kaçırılır ve trim uygulanır
    expect(res.body.name).toContain('&lt;script&gt;');
    expect(res.body.name).toContain('alert(1)');
    expect(res.body.name).not.toMatch(/[<>]/);
    expect(res.body.name).toBe(res.body.name.trim());
  });

  it('reportQuery: geçersiz brand_id (UUID değil) için 400 döner', async () => {
    const res = await request(app)
      .get('/test/report-query')
      .query({ brand_id: 'b1', year: 2025, month: 11, day: 6 });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Validation hatası');
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors).toEqual(expect.arrayContaining(['brand_id alanı uuid tipinde olmalıdır']));
  });

  it('reportQuery: geçerli brand_id ve ay/gün ile 200 döner', async () => {
    const res = await request(app)
      .get('/test/report-query')
      .query({ brand_id: '9b2e1f1a-4c1b-4f2e-8a1c-2b3c4d5e6f70', year: 2025, month: 11, day: 6 });
    // Debug: print response on failure
    // eslint-disable-next-line no-console
    console.log('reportQuery valid response:', res.body);
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});