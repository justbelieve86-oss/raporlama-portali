import { describe, it, expect } from 'vitest';
import { toBackendPayload } from '../kpiPayload';
import type { KpiStatus, YtdCalc } from '../../types/kpi';

describe('toBackendPayload', () => {
  it('converts basic fields and fills defaults', () => {
    const status: KpiStatus = 'aktif';
    const ytdCalc: YtdCalc = 'toplam';

    const payload = toBackendPayload({
      name: 'Satış Adedi',
      category: 'Satış',
      unit: 'Adet',
      status,
      ytdCalc,
    });

    expect(payload).toEqual({
      name: 'Satış Adedi',
      category: 'Satış',
      unit: 'Adet',
      status: 'aktif',
      ytdCalc: 'toplam',
      numeratorKpiId: null,
      denominatorKpiId: null,
      cumulativeSourceIds: [],
      formulaText: null,
      target: null,
      onlyCumulative: false,
      hasTargetData: false,
      monthlyAverage: false,
      targetFormulaText: null,
      calculationType: 'direct',
    });
  });

  it('maps percentage sources (numerator/denominator)', () => {
    const status: KpiStatus = 'aktif';
    const ytdCalc: YtdCalc = 'ortalama';

    const payload = toBackendPayload({
      name: 'Dönüşüm Oranı',
      category: 'Pazarlama',
      unit: '%',
      status,
      ytdCalc,
      numeratorKpiId: 'kpi_num',
      denominatorKpiId: 'kpi_den',
    });

    expect(payload.numeratorKpiId).toBe('kpi_num');
    expect(payload.denominatorKpiId).toBe('kpi_den');
    expect(payload.cumulativeSourceIds).toEqual([]);
    expect(payload.formulaText).toBeNull();
  });

  it('maps cumulative sources array', () => {
    const status: KpiStatus = 'aktif';
    const ytdCalc: YtdCalc = 'toplam';

    const payload = toBackendPayload({
      name: 'Toplam Harcama',
      category: 'Finans',
      unit: 'TL',
      status,
      ytdCalc,
      cumulativeSourceIds: ['kpi_a', 'kpi_b'],
    });

    expect(payload.cumulativeSourceIds).toEqual(['kpi_a', 'kpi_b']);
    expect(payload.numeratorKpiId).toBeNull();
    expect(payload.denominatorKpiId).toBeNull();
  });

  it('maps formula text when provided', () => {
    const status: KpiStatus = 'aktif';
    const ytdCalc: YtdCalc = 'toplam';

    const payload = toBackendPayload({
      name: 'Özel Formül KPI',
      category: 'Genel',
      unit: 'TL',
      status,
      ytdCalc,
      formulaText: 'A + B - C',
    });

    expect(payload.formulaText).toBe('A + B - C');
  });

  it('includes target when provided', () => {
    const status: KpiStatus = 'aktif';
    const ytdCalc: YtdCalc = 'toplam';

    const payload = toBackendPayload({
      name: 'Yıllık Hedef KPI',
      category: 'Genel',
      unit: 'Adet',
      status,
      ytdCalc,
      target: '1200',
    });

    expect(payload.target).toBe('1200');
  });
});