const http = require('http');
const {
  sendList,
  sendSuccess,
  sendError,
  sendCreated,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendConflict,
  sendInternalError
} = require('../../utils/responseHelpers');

function createMockRes() {
  const res = new http.ServerResponse({ method: 'GET' });
  res.statusCode = 200;
  res._json = null;
  res.status = function (code) { this.statusCode = code; return this; };
  res.json = function (payload) { this._json = payload; return this; };
  return res;
}

describe('responseHelpers', () => {
  test('sendList wraps array into data.items/count/total', () => {
    const res = createMockRes();
    sendList(res, [{ id: 1 }], 'List ok');
    expect(res.statusCode).toBe(200);
    expect(res._json.success).toBe(true);
    expect(res._json.message).toBe('List ok');
    expect(res._json.data).toBeDefined();
    expect(Array.isArray(res._json.data.items)).toBe(true);
    expect(res._json.data.items).toEqual([{ id: 1 }]);
    expect(res._json.data.count).toBe(1);
    expect(res._json.data.total).toBe(1);
  });

  test('sendSuccess sets success true and adds data', () => {
    const res = createMockRes();
    sendSuccess(res, { foo: 'bar' }, 'OK');
    expect(res.statusCode).toBe(200);
    expect(res._json.success).toBe(true);
    expect(res._json.message).toBe('OK');
    expect(res._json.data).toEqual({ foo: 'bar' });
  });

  test('sendError sets success false with code and details', () => {
    const res = createMockRes();
    sendError(res, 'Oops', 400, 'BAD', { reason: 'x' });
    expect(res.statusCode).toBe(400);
    expect(res._json.success).toBe(false);
    expect(res._json.status).toBe('fail');
    expect(res._json.message).toBe('Oops');
    expect(res._json.code).toBe('BAD');
    expect(res._json.details).toEqual({ reason: 'x' });
  });

  test('sendList boş array ile çalışır', () => {
    const res = createMockRes();
    sendList(res, [], 'Empty list');
    expect(res.statusCode).toBe(200);
    expect(res._json.data.items).toEqual([]);
    expect(res._json.data.count).toBe(0);
    expect(res._json.data.total).toBe(0);
  });

  test('sendList custom total değeri kabul eder', () => {
    const res = createMockRes();
    sendList(res, [{ id: 1 }, { id: 2 }], 'List ok', 100);
    expect(res._json.data.count).toBe(2);
    expect(res._json.data.total).toBe(100);
  });

  test('sendList total null ise count kullanır', () => {
    const res = createMockRes();
    sendList(res, [{ id: 1 }], 'List ok', null);
    expect(res._json.data.count).toBe(1);
    expect(res._json.data.total).toBe(1);
  });

  test('sendCreated 201 status code döner', () => {
    const res = createMockRes();
    sendCreated(res, { id: 1 }, 'Created');
    expect(res.statusCode).toBe(201);
    expect(res._json.success).toBe(true);
    expect(res._json.data).toEqual({ id: 1 });
  });

  test('sendNotFound 404 status code döner', () => {
    const res = createMockRes();
    sendNotFound(res, 'Not found');
    expect(res.statusCode).toBe(404);
    expect(res._json.code).toBe('NOT_FOUND');
    expect(res._json.message).toBe('Not found');
  });

  test('sendUnauthorized 401 status code döner', () => {
    const res = createMockRes();
    sendUnauthorized(res, 'Unauthorized');
    expect(res.statusCode).toBe(401);
    expect(res._json.code).toBe('UNAUTHORIZED');
  });

  test('sendForbidden 403 status code döner', () => {
    const res = createMockRes();
    sendForbidden(res, 'Forbidden');
    expect(res.statusCode).toBe(403);
    expect(res._json.code).toBe('FORBIDDEN');
  });

  test('sendConflict 409 status code döner', () => {
    const res = createMockRes();
    sendConflict(res, 'Conflict');
    expect(res.statusCode).toBe(409);
    expect(res._json.code).toBe('CONFLICT');
  });

  test('sendInternalError 500 status code döner', () => {
    const res = createMockRes();
    sendInternalError(res, 'Server error');
    expect(res.statusCode).toBe(500);
    expect(res._json.code).toBe('INTERNAL_SERVER_ERROR');
    expect(res._json.status).toBe('error');
  });

  test('sendError 500+ status code için status "error" olur', () => {
    const res = createMockRes();
    sendError(res, 'Server error', 500);
    expect(res._json.status).toBe('error');
  });

  test('sendError 400-499 status code için status "fail" olur', () => {
    const res = createMockRes();
    sendError(res, 'Client error', 400);
    expect(res._json.status).toBe('fail');
  });

  test('sendSuccess data null ise data property eklenmez', () => {
    const res = createMockRes();
    sendSuccess(res, null, 'OK');
    expect(res._json.data).toBeUndefined();
  });

  test('sendSuccess custom status code kabul eder', () => {
    const res = createMockRes();
    sendSuccess(res, { id: 1 }, 'OK', 201);
    expect(res.statusCode).toBe(201);
  });
});