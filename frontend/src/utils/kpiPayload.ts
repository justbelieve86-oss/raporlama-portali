import type { KpiStatus, YtdCalc } from '../types/kpi';

// Admin API için camelCase → snake_case payload dönüşümü
export const toBackendPayload = (item: {
  name: string;
  category: string;
  unit: string;
  status: KpiStatus;
  ytdCalc: YtdCalc;
  onlyCumulative?: boolean;
  hasTargetData?: boolean;
  monthlyAverage?: boolean;
  numeratorKpiId?: string;
  denominatorKpiId?: string;
  cumulativeSourceIds?: string[];
  formulaText?: string;
  targetFormulaText?: string;
  target?: string;
}) => ({
  // Backend API expects camelCase; server maps to DB columns
  name: item.name,
  category: (item.category || '').trim(),
  unit: (item.unit || '').trim(),
  status: item.status,
  ytdCalc: item.ytdCalc,
  onlyCumulative: !!item.onlyCumulative,
  hasTargetData: !!item.hasTargetData,
  monthlyAverage: !!item.monthlyAverage,
  numeratorKpiId: item.numeratorKpiId ?? null,
  denominatorKpiId: item.denominatorKpiId ?? null,
  cumulativeSourceIds: item.cumulativeSourceIds ?? [],
  formulaText: item.formulaText ?? null,
  targetFormulaText: item.targetFormulaText ?? null,
  target: item.target ?? null,
  // Calculation type türetimi: oran (pay/payda varsa) → percentage, hedef → target, kümülatif kaynak → cumulative, aksi → direct
  calculationType: (
    (item.numeratorKpiId && item.denominatorKpiId)
      ? 'percentage'
      : (item.hasTargetData
        ? 'target'
        : ((item.cumulativeSourceIds && item.cumulativeSourceIds.length > 0)
          ? 'cumulative'
          : 'direct'))
  ),
});