// MCP pipeline HTTP + SQL adımları için küçük otomasyon testi
// - HTTP: login ve admin KPIs fetch mocklanır
// - SQL: supabase client mocklanır ve created_at >= ISO filtre yakalanır

// Supabase mock: kpi_daily_reports sorgusunu ve gte argümanını yakala
jest.mock('../../src/supabase', () => {
  const __captures = { gte: { col: null, val: null } };

  const supabase = {
    __captures,
    from: jest.fn((table) => {
      if (table === 'kpi_daily_reports') {
        const chain = {};
        chain.select = jest.fn(() => {
          return {
            gte: jest.fn((col, val) => {
              __captures.gte.col = col;
              __captures.gte.val = val;
              return Promise.resolve({
                data: [
                  {
                    kpi_id: 'k1',
                    brand_id: 'b1',
                    year: 2025,
                    month: 11,
                    day: 7,
                    value: 10,
                    created_at: new Date().toISOString()
                  }
                ],
                error: null
              });
            })
          };
        });
        return chain;
      }
      const empty = {};
      empty.select = jest.fn(() => ({ gte: jest.fn(() => Promise.resolve({ data: [], error: null })) }));
      return empty;
    })
  };

  return { supabase };
});

describe('MCP pipeline HTTP+SQL otomasyon', () => {
  const { login, fetchAdminKpis, queryDailyReportsLastNDays } = require('../../scripts/mcp-pipeline');

  beforeEach(() => {
    global.fetch = jest.fn(async (url, opts) => {
      if (typeof url === 'string' && url.includes('/api/auth/login')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { token: 'testtoken' } })
        };
      }
      if (typeof url === 'string' && url.includes('/api/admin/kpis')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { items: [{ id: 'k1' }, { id: 'k2' }] } })
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('login token döndürür', async () => {
    const token = await login();
    expect(token).toBe('testtoken');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/login'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('admin KPIs items döndürür', async () => {
    const items = await fetchAdminKpis('testtoken');
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(2);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/kpis'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: expect.stringContaining('Bearer') }) })
    );
  });

  it('SQL created_at gte ile son N gün daily reports döndürür', async () => {
    const data = await queryDailyReportsLastNDays(1);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    const { supabase } = require('../../src/supabase');
    expect(supabase.__captures.gte.col).toBe('created_at');
    // ISO tarih olmalı
    expect(() => new Date(supabase.__captures.gte.val).toISOString()).not.toThrow();
  });
});