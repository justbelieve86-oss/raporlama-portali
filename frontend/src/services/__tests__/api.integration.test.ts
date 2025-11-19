import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiModule from '../../lib/axiosClient';
import {
  getKpiCumulativeSources,
  getKpiFormulas,
  getKpiDailyReports,
  getKpiMonthlyReports,
  getBrandKpiTargets,
} from '../../services/api';

describe('Integration: API services + getListItems', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Legacy endpoint\'ler standart format döndürüyor', () => {
    it('getKpiCumulativeSources standart formatı parse eder', async () => {
      const spy = vi.spyOn(apiModule.api, 'get').mockResolvedValue({
        data: {
          success: true,
          status: 'success',
          data: {
            items: [
              { kpi_id: 'k1', source_kpi_id: 'k2' },
              { kpi_id: 'k1', source_kpi_id: 'k3' }
            ],
            count: 2,
            total: 2
          }
        },
      } as any);

      const result = await getKpiCumulativeSources(['k1', 'k2']);
      expect(result).toEqual([
        { kpi_id: 'k1', source_kpi_id: 'k2' },
        { kpi_id: 'k1', source_kpi_id: 'k3' }
      ]);
      expect(spy).toHaveBeenCalledWith('/kpis/cumulative_sources?kpi_ids=k1,k2');
      spy.mockRestore();
    });

    it('getKpiFormulas standart formatı parse eder', async () => {
      const spy = vi.spyOn(apiModule.api, 'get').mockResolvedValue({
        data: {
          success: true,
          data: {
            items: [
              { kpi_id: 'k1', expression: '{{k2}} + {{k3}}', display_expression: 'K2 + K3' }
            ],
            count: 1,
            total: 1
          }
        },
      } as any);

      const result = await getKpiFormulas(['k1']);
      expect(result).toEqual([
        { kpi_id: 'k1', expression: '{{k2}} + {{k3}}', display_expression: 'K2 + K3' }
      ]);
      spy.mockRestore();
    });

    it('getKpiDailyReports standart formatı parse eder (report_date ile)', async () => {
      const spy = vi.spyOn(apiModule.api, 'get').mockResolvedValue({
        data: {
          success: true,
          data: {
            items: [
              { kpi_id: 'k1', value: 10, report_date: '2025-01-01' },
              { kpi_id: 'k1', value: 20, report_date: '2025-01-02' }
            ],
            count: 2,
            total: 2
          }
        },
      } as any);

      const result = await getKpiDailyReports('brand1', 2025, 1);
      expect(result).toEqual([
        { kpi_id: 'k1', value: 10, report_date: '2025-01-01' },
        { kpi_id: 'k1', value: 20, report_date: '2025-01-02' }
      ]);
      expect(result[0]).toHaveProperty('report_date');
      spy.mockRestore();
    });

    it('getKpiMonthlyReports standart formatı parse eder', async () => {
      const spy = vi.spyOn(apiModule.api, 'get').mockResolvedValue({
        data: {
          success: true,
          data: {
            items: [
              { kpi_id: 'k1', value: 100 },
              { kpi_id: 'k2', value: 200 }
            ],
            count: 2,
            total: 2
          }
        },
      } as any);

      const result = await getKpiMonthlyReports('brand1', 2025, 1, ['k1', 'k2']);
      expect(result).toEqual([
        { kpi_id: 'k1', value: 100 },
        { kpi_id: 'k2', value: 200 }
      ]);
      spy.mockRestore();
    });

    it('getBrandKpiTargets standart formatı parse eder', async () => {
      const spy = vi.spyOn(apiModule.api, 'get').mockResolvedValue({
        data: {
          success: true,
          data: {
            items: [
              { kpi_id: 'k1', target: 1000 },
              { kpi_id: 'k2', target: 2000 }
            ],
            count: 2,
            total: 2
          }
        },
      } as any);

      const result = await getBrandKpiTargets('brand1', 2025, undefined, ['k1', 'k2']);
      expect(result).toEqual([
        { kpi_id: 'k1', target: 1000 },
        { kpi_id: 'k2', target: 2000 }
      ]);
      spy.mockRestore();
    });
  });

  describe('Boş response handling', () => {
    it('boş array response\'u doğru parse eder', async () => {
      const spy = vi.spyOn(apiModule.api, 'get').mockResolvedValue({
        data: {
          success: true,
          data: {
            items: [],
            count: 0,
            total: 0
          }
        },
      } as any);

      const result = await getKpiCumulativeSources(['k1']);
      expect(result).toEqual([]);
      spy.mockRestore();
    });
  });

  describe('Error handling', () => {
    it('API hatası durumunda error fırlatır', async () => {
      const spy = vi.spyOn(apiModule.api, 'get').mockRejectedValue(
        new Error('Network error')
      );

      await expect(getKpiCumulativeSources(['k1'])).rejects.toThrow('Network error');
      spy.mockRestore();
    });

    it('400 hatası durumunda error fırlatır', async () => {
      const spy = vi.spyOn(apiModule.api, 'get').mockRejectedValue({
        response: {
          status: 400,
          data: {
            success: false,
            message: 'Validation error',
            code: 'BAD_REQUEST'
          }
        }
      } as any);

      await expect(getKpiCumulativeSources(['invalid'])).rejects.toThrow();
      spy.mockRestore();
    });
  });

  describe('Query parameter formatting', () => {
    it('getKpiDailyReports query parametrelerini doğru formatlar', async () => {
      const spy = vi.spyOn(apiModule.api, 'get').mockResolvedValue({
        data: { success: true, data: { items: [], count: 0, total: 0 } },
      } as any);

      await getKpiDailyReports('brand1', 2025, 1, 15, ['k1', 'k2']);
      
      expect(spy).toHaveBeenCalledWith(
        '/reports/daily?brand_id=brand1&year=2025&month=1&day=15&kpi_ids=k1,k2'
      );
      spy.mockRestore();
    });

    it('getKpiDailyReports opsiyonel parametreleri doğru handle eder', async () => {
      const spy = vi.spyOn(apiModule.api, 'get').mockResolvedValue({
        data: { success: true, data: { items: [], count: 0, total: 0 } },
      } as any);

      await getKpiDailyReports('brand1', 2025, 1);
      
      expect(spy).toHaveBeenCalledWith(
        '/reports/daily?brand_id=brand1&year=2025&month=1'
      );
      spy.mockRestore();
    });
  });
});

