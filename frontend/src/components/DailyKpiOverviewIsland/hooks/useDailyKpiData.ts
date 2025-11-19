/**
 * Hook for Daily KPI data fetching logic
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getBrands, getBrandKpis, getKpiCumulativeSources, getKpiFormulas, getKpiDailyReports, getBrandKpiTargets, getKpiMonthlyReports, getKpiDetails } from '../../../services/api.js';
import type { Brand } from '../../../services/api.js';
import type { KpiDetail, KpiFormula, KpiCumulativeSource, DailyReport, MonthlyReport, Target } from '../../../types/api.js';
import { logger } from '../../../lib/logger.js';
import { normalize } from '../utils/kpiFormatters.js';
import type { BrandData, Kpi } from '../utils/kpiCalculations.js';

export function useDailyKpiData(
  selectedCategory: string,
  year: number,
  month: number,
  day: number
) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandData, setBrandData] = useState<Record<string, BrandData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canonicalDailyCategory = useMemo(() => {
    if (selectedCategory === 'Satış') return 'Satış - Günlük KPI';
    if (selectedCategory === 'Servis') return 'Servis - Günlük KPI';
    if (selectedCategory === 'Kiralama') return 'Kiralama - Günlük KPI';
    if (selectedCategory === 'Ekspertiz') return 'Ekspertiz - Günlük KPI';
    return 'İkinci El - Günlük KPI';
  }, [selectedCategory]);

  const brandCategoryKey = useMemo(() => {
    if (selectedCategory === 'Satış') return 'satis-markalari';
    if (selectedCategory === 'Servis') return 'satis-markalari';
    if (selectedCategory === 'Kiralama') return 'kiralama-markalari';
    if (selectedCategory === 'Ekspertiz') return 'ekspertiz-markalari';
    return 'ikinci-el-markalari';
  }, [selectedCategory]);

  const loadBrands = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { brands: items } = await getBrands({ brandCategory: brandCategoryKey });
      const sorted = (items || []).slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'tr'));
      setBrands(sorted);
    } catch (e: unknown) {
      const error = e as { message?: string };
      setError(error?.message || 'Markalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [brandCategoryKey]);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  // Kategori değiştiğinde önce mevcut marka verilerini temizle
  useEffect(() => {
    setBrandData({});
  }, [selectedCategory]);

  const loadBrandData = useCallback(async (brandId: string) => {
    try {
      const resp = await getBrandKpis(brandId);
      const rawItems: KpiDetail[] = resp?.kpis || [];
      let list: Kpi[] = (rawItems || []).map((r: KpiDetail) => ({
        id: String(r.kpi_id ?? r.id ?? r?.kpi?.id ?? ''),
        name: String(r.kpi_name ?? r.name ?? r?.kpi?.name ?? ''),
        category: r.category ?? r?.kpi?.category,
        unit: r.unit ?? r?.kpi?.unit,
        calculation_type: r.calculation_type ?? r?.kpi?.calculation_type ?? 'direct',
        target: r.target == null ? null : Number(r.target),
        only_cumulative: !!(r.only_cumulative ?? r?.kpi?.only_cumulative),
        numerator_kpi_id: r.numerator_kpi_id ? String(r.numerator_kpi_id) : undefined,
        denominator_kpi_id: r.denominator_kpi_id ? String(r.denominator_kpi_id) : undefined,
      }));

      // DailyDataEntryIsland'daki alias eşlemesini yansıt
      const resolveCategoryAlias = (s: string): string => {
        const key = normalize(s);
        const map: Record<string, string> = {
          [normalize('2. El Satış - Günlük KPI')]: 'İkinci El - Günlük KPI',
          [normalize('İkinci El Satış - Günlük KPI')]: 'İkinci El - Günlük KPI',
          [normalize('2. El - Günlük KPI')]: 'İkinci El - Günlük KPI',
        };
        return map[key] || s;
      };
      const desiredCategory = resolveCategoryAlias(canonicalDailyCategory);
      list = list.filter(k => normalize(k.category) === normalize(desiredCategory));

      const kpiIds = list.map(k => k.id);
      const unitById: Record<string, string> = {};
      list.forEach(k => {
        const u = String(k.unit || '').trim();
        if (u) unitById[k.id] = u;
      });
      
      const unitDetailsPromise = (Object.keys(unitById).length === 0 && kpiIds.length > 0)
        ? getKpiDetails(kpiIds)
        : Promise.resolve([]);

      // Hızlı ilk render için, KPI listesini hemen yaz
      setBrandData(prev => ({
        ...prev,
        [brandId]: {
          kpis: list,
          values: prev[brandId]?.values || {},
          cumulativeOverrides: prev[brandId]?.cumulativeOverrides || {},
          targets: prev[brandId]?.targets || {},
          cumulativeSources: prev[brandId]?.cumulativeSources || {},
          formulaExpressions: prev[brandId]?.formulaExpressions || {},
          unitById: { ...(prev[brandId]?.unitById || {}), ...unitById },
        },
      }));

      // Formüller
      const formulaIds = list.filter(k => k.calculation_type === 'formula').map(k => k.id);
      const targetIds = list.filter(k => k.calculation_type === 'target').map(k => k.id);
      const formulasPromise = formulaIds.length > 0 ? getKpiFormulas(formulaIds) : Promise.resolve([]);
      const targetFormulaTextsPromise = targetIds.length > 0 ? getKpiDetails(targetIds) : Promise.resolve([]);

      // Kümülatif kaynaklar (formüllerde referanslanan kümülatifler dahil)
      const cumIds = new Set<string>(list.filter(k => k.calculation_type === 'cumulative').map(k => k.id));
      const extractTokens = (expr: string): string[] => {
        const tokens: string[] = [];
        expr.replace(/\{\{([^}]+)\}\}|\[([^\]]+)\]/g, (_match: string, g1: string, g2: string) => {
          const rawId = (g1 ?? g2);
          tokens.push(String(rawId).trim());
          return '';
        });
        return tokens;
      };
      
      // Günlük, only-cumulative override ve hedefleri paralel getir
      const dailyPromise = getKpiDailyReports(brandId, year, month, undefined, kpiIds.length > 0 ? kpiIds : undefined);
      const ocIds = list.filter(k => k.only_cumulative === true).map(k => k.id);
      const overridesPromise = ocIds.length > 0 ? getKpiMonthlyReports(brandId, year, month, ocIds) : Promise.resolve([]);
      const targetsPromise = getBrandKpiTargets(brandId, year, month, kpiIds.length > 0 ? kpiIds : undefined);

      const [detailsRes, formulaRes, targetFormulaRes, dailyRes, overridesRes, targetsRes] = await Promise.all([
        unitDetailsPromise,
        formulasPromise,
        targetFormulaTextsPromise,
        dailyPromise,
        overridesPromise,
        targetsPromise,
      ]);

      // Unit detaylarını uygula
      (detailsRes || []).forEach((r: KpiDetail) => {
        const kId = String(r?.id || '');
        const uRaw = (r?.unit ?? r?.kpi_unit ?? r?.kpi?.unit ?? r?.kpis?.unit ?? '');
        if (kId && String(uRaw || '').trim()) unitById[kId] = String(uRaw).trim();
      });

      // Formül ifadelerini hazırla
      const formulaExpressions: Record<string, string> = {};
      (formulaRes || []).forEach((r: KpiFormula) => {
        const kId = String(r.kpi_id);
        const exprRaw = (r && typeof r === 'object') ? (r.expression ?? r.display_expression ?? '') : '';
        const expr = String(exprRaw || '').trim();
        if (expr) formulaExpressions[kId] = expr;
      });
      (targetFormulaRes || []).forEach((r: KpiDetail) => {
        const kId = String(r.id);
        const exprRaw = (r && typeof r === 'object') ? (r.target_formula_text ?? '') : '';
        const expr = String(exprRaw || '').trim();
        if (expr) formulaExpressions[kId] = expr;
      });

      if (Object.keys(formulaExpressions).length > 0) {
        const allById = new Map<string, Kpi>(list.map(k => [String(k.id), k]));
        const allByName = new Map<string, Kpi>(list.map(k => [normalize(k.name), k]));
        Object.values(formulaExpressions).forEach(expr => {
          const tokens = extractTokens(expr);
          tokens.forEach(tok => {
            let ref: Kpi | undefined;
            if (allById.has(tok)) ref = allById.get(tok);
            else if (allByName.has(normalize(tok))) ref = allByName.get(normalize(tok));
            if (ref && ref.calculation_type === 'cumulative') cumIds.add(String(ref.id));
          });
        });
      }

      let cumulativeSources: Record<string, string[]> = {};
      if (cumIds.size > 0) {
        const cs = await getKpiCumulativeSources(Array.from(cumIds));
        const map: Record<string, string[]> = {};
        (cs || []).forEach((r: KpiCumulativeSource) => {
          const kId = String(r.kpi_id);
          const sId = String(r.source_kpi_id);
          if (!map[kId]) map[kId] = [];
          map[kId].push(sId);
        });
        cumulativeSources = map;
      }

      // Günlük değerler
      const rows = dailyRes as DailyReport[];
      const values: Record<string, Record<number, number>> = {};
      for (const r of (rows || [])) {
        const kpiId = String(r.kpi_id);
        const dayOfMonth = new Date(r.report_date).getDate();
        const value = Number(r.value || 0);
        if (!values[kpiId]) values[kpiId] = {};
        values[kpiId][dayOfMonth] = value;
      }

      // Only-cumulative monthly overrides
      const cumulativeOverrides: Record<string, number> = {};
      for (const r of ((overridesRes as MonthlyReport[]) || [])) {
        const kId = String(r.kpi_id);
        const v = Number(r.value || 0);
        cumulativeOverrides[kId] = v;
      }

      // Hedefler (aylık)
      const tRows = (targetsRes as Target[]) || [];
      const targets: Record<string, number> = {};
      for (const r of (tRows || [])) {
        const kId = String(r.kpi_id);
        const tVal = Number(r.target || 0);
        targets[kId] = tVal;
      }

      const data: BrandData = {
        kpis: list,
        values,
        cumulativeOverrides,
        targets,
        cumulativeSources,
        formulaExpressions,
        unitById,
      };
      setBrandData(prev => ({ ...prev, [brandId]: data }));
    } catch (e: unknown) {
      logger.error('Brand data load error', e instanceof Error ? e : { error: e });
      const error = e as { message?: string };
      setError(error?.message || 'Marka KPI verileri yüklenemedi');
    }
  }, [canonicalDailyCategory, year, month, day]);

  useEffect(() => {
    // Markalar değiştiğinde her marka için verileri getir
    const run = async () => {
      await Promise.allSettled(brands.map(b => loadBrandData(String(b.id))));
    };
    if (brands.length > 0) run();
  }, [brands, loadBrandData]);

  return {
    brands,
    brandData,
    loading,
    error,
  };
}

