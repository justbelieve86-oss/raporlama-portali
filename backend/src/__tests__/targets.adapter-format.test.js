const request = require('supertest');

// Auth client: token doğrulaması için kullanıcı döndür
jest.mock('../supabaseAuth', () => ({
  createAuthClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'u1' } },
        error: null,
      })
    }
  })
}));

// Supabase mock: profiles->single role; diğer tablolar bu testte çağrılmayacak
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

describe('Targets adapter-format validasyon hataları', () => {
  const app = require('../index');

  it('GET /api/targets eksik brand_id ve year için 400 BAD_REQUEST döner', async () => {
    const res = await request(app)
      .get('/api/targets')
      .set('Authorization', 'Bearer t');
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('status', 'fail');
    expect(res.body).toHaveProperty('code', 'BAD_REQUEST');
    expect(res.body).toHaveProperty('details');
    expect(Array.isArray(res.body.details.errors)).toBe(true);
    expect(res.body.details.errors).toEqual(expect.arrayContaining([
      'brand_id alanı zorunludur',
      'year alanı zorunludur'
    ]));
  });

  it('GET /api/targets geçersiz brand_id (UUID değil) için 400 ve detay mesajları döner', async () => {
    const res = await request(app)
      .get('/api/targets')
      .query({ brand_id: 'not-a-uuid', year: 2025 })
      .set('Authorization', 'Bearer t');
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
    expect(res.body.details.errors).toEqual(expect.arrayContaining([
      'brand_id alanı uuid tipinde olmalıdır'
    ]));
  });

  it('GET /api/targets year alt sınırın altında ise 400 ve detay döner', async () => {
    const res = await request(app)
      .get('/api/targets')
      .query({ brand_id: '11111111-1111-1111-1111-111111111111', year: 1800 })
      .set('Authorization', 'Bearer t');
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
    expect(res.body.details.errors).toEqual(expect.arrayContaining([
      'year en az 1900 olmalıdır'
    ]));
  });

  it('DELETE /api/targets eksik parametre için 400 ve detay döner', async () => {
    const res = await request(app)
      .delete('/api/targets')
      .set('Authorization', 'Bearer t');
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
    expect(Array.isArray(res.body.details.errors)).toBe(true);
    expect(res.body.details.errors).toEqual(expect.arrayContaining([
      'brand_id alanı zorunludur',
      'year alanı zorunludur',
      'kpi_id alanı zorunludur'
    ]));
  });
});