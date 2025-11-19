import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiModule from '../../lib/axiosClient';
import {
  getBrandKpiMappings,
  getKpiDetails,
  getBrandKpiYearlyTargets,
  getKpiMonthlyReportsForUser,
  getBrandKpis,
} from '../../services/api';

describe('services/api sendList unwrap', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getBrandKpiMappings returns array from data.items', async () => {
    const spy = vi.spyOn(apiModule.api, 'get').mockResolvedValue({
      data: { success: true, data: { items: [{ kpi_id: '1' }] } },
    } as any);
    const rows = await getBrandKpiMappings('brand-1');
    expect(rows).toEqual([{ kpi_id: '1' }]);
    spy.mockRestore();
  });

  it('getKpiDetails returns array from data.items', async () => {
    const spy = vi.spyOn(apiModule.api, 'get').mockResolvedValue({
      data: { success: true, data: { items: [{ id: '1', name: 'K' }] } },
    } as any);
    const rows = await getKpiDetails(['1']);
    expect(rows).toEqual([{ id: '1', name: 'K' }]);
    spy.mockRestore();
  });

  it('getBrandKpiYearlyTargets returns array from data.items', async () => {
    const spy = vi.spyOn(apiModule.api, 'get').mockResolvedValue({
      data: { success: true, data: { items: [{ kpi_id: '1', target: 10 }] } },
    } as any);
    const rows = await getBrandKpiYearlyTargets('brand-1', 2025, ['1']);
    expect(rows).toEqual([{ kpi_id: '1', target: 10 }]);
    spy.mockRestore();
  });

  it('getKpiMonthlyReportsForUser returns array from data.items', async () => {
    const spy = vi.spyOn(apiModule.api, 'get').mockResolvedValue({
      data: { success: true, data: { items: [{ kpi_id: '1', month: 1, value: 5 }] } },
    } as any);
    const rows = await getKpiMonthlyReportsForUser('brand-1', 2025, ['1']);
    expect(rows).toEqual([{ kpi_id: '1', month: 1, value: 5 }]);
    spy.mockRestore();
  });
});

describe('services/api direct arrays', () => {
  it('getBrandKpis returns object with kpis array', async () => {
    const spy = vi.spyOn(apiModule.api, 'get').mockResolvedValue({
      data: { success: true, data: { items: [{ id: '1', name: 'KPI' }] } },
    } as any);
    const result = await getBrandKpis('brand-1');
    expect(result).toEqual({ kpis: [{ id: '1', name: 'KPI' }] });
    spy.mockRestore();
  });
});