/**
 * Hook for KPI computation logic
 */

import { useCallback } from 'react';
import { getUnitMeta } from '../utils/kpiFormatters.js';
import { evaluateArithmeticExpression, makeResolvers, type BrandData, type Kpi } from '../utils/kpiCalculations.js';

export type ComputedValue = {
  daily: number | null;
  cumulative: number;
  targetVal: number | null;
  unit?: string;
  isPercent: boolean;
  isTl: boolean;
  calcType?: Kpi['calculation_type'];
  onlyCum: boolean;
};

export function useKpiComputation(day: number) {
  const computeBrandValues = useCallback((bd: BrandData): Record<string, ComputedValue> => {
    const out: Record<string, ComputedValue> = {};
    const allKpis = bd.kpis;
    const { values, cumulativeSources, cumulativeOverrides } = bd;
    const { resolveRefId, getRefDayValue, getRefCumulativeValue } = makeResolvers(bd);
    
    for (const k of allKpis) {
      const unit = bd.unitById[k.id] || k.unit;
      const { isPercent, isTl } = getUnitMeta(unit);
      
      // Günlük
      let daily: number | null = null;
      if (k.only_cumulative !== true && k.calculation_type !== 'target') {
        if (k.calculation_type === 'cumulative') {
          const sources = cumulativeSources[k.id] || [];
          let sum = 0;
          for (const sid of sources) {
            sum += Number(values[String(sid)]?.[day]) || 0;
          }
          daily = sum;
        } else if (k.calculation_type === 'formula') {
          const expr = bd.formulaExpressions[k.id];
          if (expr) {
            const numericExpr = expr.replace(/\{\{([^}]+)\}\}|\[([^\]]+)\]/g, (_match: string, g1: string, g2: string) => {
              const rawId = (g1 ?? g2);
              const refId = resolveRefId(rawId);
              const n = refId ? getRefDayValue(String(refId), day) : 0;
              return String(n);
            });
            const val = evaluateArithmeticExpression(numericExpr);
            daily = (val != null && Number.isFinite(val)) ? Number(val) : 0;
          } else {
            daily = null;
          }
        } else if (k.calculation_type === 'percentage' && k.numerator_kpi_id && k.denominator_kpi_id) {
          const num = getRefDayValue(String(k.numerator_kpi_id), day);
          const den = getRefDayValue(String(k.denominator_kpi_id), day);
          daily = den === 0 ? 0 : (isPercent ? (num / den) * 100 : (num / den));
        } else {
          const v = values[k.id]?.[day];
          daily = v == null ? null : Number(v) || 0;
        }
      }

      // Kümülatif
      let cumulative = 0;
      if (k.only_cumulative === true) {
        cumulative = Number(cumulativeOverrides[k.id] ?? 0);
      } else if (k.calculation_type === 'cumulative') {
        const sources = cumulativeSources[k.id] || [];
        for (let d = 1; d <= day; d++) {
          for (const sid of sources) {
            cumulative += Number(values[String(sid)]?.[d]) || 0;
          }
        }
      } else if (k.calculation_type === 'formula') {
        const expr = bd.formulaExpressions[k.id];
        if (expr) {
          for (let d = 1; d <= day; d++) {
            const numericExpr = expr.replace(/\{\{([^}]+)\}\}|\[([^\]]+)\]/g, (_match: string, g1: string, g2: string) => {
              const rawId = (g1 ?? g2);
              const refId = resolveRefId(rawId);
              const n = refId ? getRefDayValue(String(refId), d) : 0;
              return String(n);
            });
            const val = evaluateArithmeticExpression(numericExpr);
            if (val != null && Number.isFinite(val)) cumulative += Number(val);
          }
        }
      } else if (k.calculation_type === 'target') {
        const expr = bd.formulaExpressions[k.id];
        if (expr) {
          const numericExpr = expr.replace(/\{\{([^}]+)\}\}|\[([^\]]+)\]/g, (_match: string, g1: string, g2: string) => {
            const rawId = (g1 ?? g2);
            const refId = resolveRefId(rawId);
            const n = refId ? getRefCumulativeValue(String(refId), day) : 0;
            return String(n);
          });
          const val = evaluateArithmeticExpression(numericExpr);
          cumulative = (val != null && Number.isFinite(val)) ? Number(val) : 0;
        }
      } else if (k.calculation_type === 'percentage' && k.numerator_kpi_id && k.denominator_kpi_id) {
        const numCum = getRefCumulativeValue(String(k.numerator_kpi_id), day);
        const denCum = getRefCumulativeValue(String(k.denominator_kpi_id), day);
        cumulative = denCum === 0 ? 0 : (isPercent ? (numCum / denCum) * 100 : (numCum / denCum));
      } else {
        for (let d = 1; d <= day; d++) {
          cumulative += Number(values[k.id]?.[d]) || 0;
        }
      }

      // Hedef
      const targetVal = k.calculation_type === 'target' 
        ? (bd.targets[k.id] ?? (k.target ?? null)) 
        : (bd.targets[k.id] ?? null);

      out[k.id] = { 
        daily, 
        cumulative, 
        targetVal, 
        unit, 
        isPercent, 
        isTl, 
        calcType: k.calculation_type, 
        onlyCum: !!k.only_cumulative 
      };
    }
    return out;
  }, [day]);

  return { computeBrandValues };
}

