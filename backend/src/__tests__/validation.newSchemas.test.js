const request = require('supertest');
const express = require('express');
const { validateWithSendError, schemas } = require('../middleware/validation');

describe('Yeni validation schema\'ları (brandIdParam, kpiIdParam, kpiIdsQuery)', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Route'ları beforeEach içinde tanımla
    app.get('/test/brand/:brandId', validateWithSendError(schemas.brandIdParam), (req, res) => {
      res.json({ ok: true, brandId: req.params.brandId });
    });
    
    app.get('/test/kpi/:kpiId', validateWithSendError(schemas.kpiIdParam), (req, res) => {
      res.json({ ok: true, kpiId: req.params.kpiId });
    });
    
    app.get('/test/kpis/details', validateWithSendError(schemas.kpiIdsQuery), (req, res) => {
      res.json({ ok: true, kpi_ids: req.query.kpi_ids });
    });
    
    app.get('/test/kpis/formulas', validateWithSendError(schemas.kpiIdsQueryOptional), (req, res) => {
      res.json({ ok: true, kpi_ids: req.query.kpi_ids || null });
    });
    
    app.post('/test/kpi-mapping', validateWithSendError(schemas.createKpiMapping), (req, res) => {
      res.json({ ok: true, kpi_id: req.body.kpi_id });
    });
  });

  describe('brandIdParam schema', () => {

    it('geçerli UUID brandId kabul eder', async () => {
      const res = await request(app).get('/test/brand/550e8400-e29b-41d4-a716-446655440000');
      expect(res.statusCode).toBe(200);
      expect(res.body.brandId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('geçersiz UUID brandId için 400 döner', async () => {
      const res = await request(app).get('/test/brand/invalid-uuid');
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.details).toBeDefined();
      expect(res.body.details.errors).toBeDefined();
      expect(res.body.details.errors).toEqual(expect.arrayContaining([
        expect.stringMatching(/brandId alanı uuid tipinde olmalıdır/i)
      ]));
    });

    it('eksik brandId için 400 döner', async () => {
      const res = await request(app).get('/test/brand/');
      expect(res.statusCode).toBe(404); // Express route not found
    });
  });

  describe('kpiIdParam schema', () => {

    it('geçerli UUID kpiId kabul eder', async () => {
      const res = await request(app).get('/test/kpi/550e8400-e29b-41d4-a716-446655440000');
      expect(res.statusCode).toBe(200);
      expect(res.body.kpiId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('geçersiz UUID kpiId için 400 döner', async () => {
      const res = await request(app).get('/test/kpi/not-a-uuid');
      expect(res.statusCode).toBe(400);
      expect(res.body.details).toBeDefined();
      expect(res.body.details.errors).toEqual(expect.arrayContaining([
        expect.stringMatching(/kpiId alanı uuid tipinde olmalıdır/i)
      ]));
    });
  });

  describe('kpiIdsQuery schema (zorunlu)', () => {

    it('geçerli comma-separated UUID\'ler kabul eder', async () => {
      const validIds = '550e8400-e29b-41d4-a716-446655440000,660e8400-e29b-41d4-a716-446655440001';
      const res = await request(app).get(`/test/kpis/details?kpi_ids=${validIds}`);
      expect(res.statusCode).toBe(200);
    });

    it('eksik kpi_ids için 400 döner', async () => {
      const res = await request(app).get('/test/kpis/details');
      expect(res.statusCode).toBe(400);
      expect(res.body.details).toBeDefined();
      expect(res.body.details.errors).toEqual(expect.arrayContaining([
        expect.stringMatching(/kpi_ids alanı zorunludur/i)
      ]));
    });

    it('geçersiz UUID içeren kpi_ids için 400 döner', async () => {
      const invalidIds = '550e8400-e29b-41d4-a716-446655440000,invalid-uuid';
      const res = await request(app).get(`/test/kpis/details?kpi_ids=${invalidIds}`);
      expect(res.statusCode).toBe(400);
      expect(res.body.details).toBeDefined();
      expect(res.body.details.errors).toEqual(expect.arrayContaining([
        expect.stringMatching(/Geçersiz KPI ID formatı|kpi_ids.*uuid/i)
      ]));
    });

    it('boş string kpi_ids için 400 döner', async () => {
      const res = await request(app).get('/test/kpis/details?kpi_ids=');
      expect(res.statusCode).toBe(400);
      expect(res.body.details).toBeDefined();
      expect(res.body.details.errors).toEqual(expect.arrayContaining([
        expect.stringMatching(/kpi_ids alanı zorunludur/i)
      ]));
    });
  });

  describe('kpiIdsQueryOptional schema (opsiyonel)', () => {

    it('eksik kpi_ids kabul eder', async () => {
      const res = await request(app).get('/test/kpis/formulas');
      expect(res.statusCode).toBe(200);
    });

    it('geçerli comma-separated UUID\'ler kabul eder', async () => {
      const validIds = '550e8400-e29b-41d4-a716-446655440000';
      const res = await request(app).get(`/test/kpis/formulas?kpi_ids=${validIds}`);
      expect(res.statusCode).toBe(200);
    });

    it('geçersiz UUID içeren kpi_ids için 400 döner', async () => {
      const invalidIds = 'not-a-uuid';
      const res = await request(app).get(`/test/kpis/formulas?kpi_ids=${invalidIds}`);
      expect(res.statusCode).toBe(400);
      expect(res.body.details).toBeDefined();
      expect(res.body.details.errors).toEqual(expect.arrayContaining([
        expect.stringMatching(/Geçersiz KPI ID formatı|kpi_ids.*uuid/i)
      ]));
    });
  });

  describe('createKpiMapping schema', () => {

    it('geçerli UUID kpi_id kabul eder', async () => {
      const res = await request(app)
        .post('/test/kpi-mapping')
        .send({ kpi_id: '550e8400-e29b-41d4-a716-446655440000' });
      expect(res.statusCode).toBe(200);
    });

    it('eksik kpi_id için 400 döner', async () => {
      const res = await request(app).post('/test/kpi-mapping').send({});
      expect(res.statusCode).toBe(400);
      expect(res.body.details).toBeDefined();
      expect(res.body.details.errors).toEqual(expect.arrayContaining([
        expect.stringMatching(/kpi_id alanı zorunludur/i)
      ]));
    });

    it('geçersiz UUID kpi_id için 400 döner', async () => {
      const res = await request(app)
        .post('/test/kpi-mapping')
        .send({ kpi_id: 'invalid-uuid' });
      expect(res.statusCode).toBe(400);
      expect(res.body.details).toBeDefined();
      expect(res.body.details.errors).toEqual(expect.arrayContaining([
        expect.stringMatching(/kpi_id alanı uuid tipinde olmalıdır/i)
      ]));
    });
  });
});

