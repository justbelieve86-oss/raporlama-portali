const request = require('supertest');
const express = require('express');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { globalErrorHandler } = require('../middleware/errorHandler');

describe('catchAsync wrapper', () => {
  let app;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'development'; // Development mode'da test et
    app = express();
    app.use(express.json());
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('async handler içindeki hataları yakalar ve global error handler\'a gönderir', async () => {
    app.get('/test/async-error', catchAsync(async (req, res) => {
      throw new Error('Test error');
    }));
    app.use(globalErrorHandler); // Error handler'ı route'tan sonra ekle

    const res = await request(app).get('/test/async-error');
    expect(res.statusCode).toBe(500);
    // Development mode'da error stack trace ile döner
    expect(res.body).toHaveProperty('status');
    expect(res.body.status).toBe('error');
    expect(res.body).toHaveProperty('message');
  });

  it('AppError fırlatıldığında doğru status code ve mesaj döner', async () => {
    app.get('/test/app-error', catchAsync(async (req, res) => {
      throw new AppError('Custom error message', 400, 'CUSTOM_ERROR');
    }));
    app.use(globalErrorHandler); // Error handler'ı route'tan sonra ekle

    const res = await request(app).get('/test/app-error');
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('status');
    expect(res.body.status).toBe('fail');
    expect(res.body).toHaveProperty('message', 'Custom error message');
    // Development mode'da code property var
    if (res.body.code !== undefined) {
      expect(res.body.code).toBe('CUSTOM_ERROR');
    }
  });

  it('başarılı async handler normal şekilde çalışır', async () => {
    app.get('/test/success', catchAsync(async (req, res) => {
      res.json({ success: true });
    }));
    app.use(globalErrorHandler); // Error handler'ı route'tan sonra ekle

    const res = await request(app).get('/test/success');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it('Promise rejection\'ları yakalar', async () => {
    app.get('/test/promise-rejection', catchAsync(async (req, res) => {
      await Promise.reject(new AppError('Promise rejected', 500, 'PROMISE_ERROR'));
    }));
    app.use(globalErrorHandler); // Error handler'ı route'tan sonra ekle

    const res = await request(app).get('/test/promise-rejection');
    expect(res.statusCode).toBe(500);
    expect(res.body).toHaveProperty('status');
    expect(res.body.status).toBe('error');
    expect(res.body).toHaveProperty('message', 'Promise rejected');
  });
});

describe('AppError class', () => {
  it('AppError instance oluşturur ve doğru özelliklere sahiptir', () => {
    const error = new AppError('Test message', 404, 'NOT_FOUND', { key: 'value' });
    expect(error.message).toBe('Test message');
    expect(error.statusCode).toBe(404);
    expect(error.status).toBe('fail');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.details).toEqual({ key: 'value' });
    expect(error.isOperational).toBe(true);
  });

  it('statusCode 400-499 arası ise status "fail" olur', () => {
    const error = new AppError('Bad request', 400);
    expect(error.status).toBe('fail');
  });

  it('statusCode 500+ ise status "error" olur', () => {
    const error = new AppError('Server error', 500);
    expect(error.status).toBe('error');
  });

  it('details parametresi opsiyoneldir', () => {
    const error = new AppError('Test', 400);
    expect(error.details).toBeNull();
  });

  it('code parametresi opsiyoneldir', () => {
    const error = new AppError('Test', 400);
    expect(error.code).toBeNull();
  });
});

