import { useState, useEffect, useCallback } from 'react';
import { getKpis, getKpiCategories, getKpiUnits } from '../services/api';
import type { KpiItem, KpiStatus, YtdCalc } from '../types/kpi';
import type { KpiDetail } from '../types/api';

export function useKpiData() {
  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['Satış']);
  const [units, setUnits] = useState<string[]>(['Puan', 'Adet', '%']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [kpiData, categoryData, unitData] = await Promise.all([
        getKpis(),
        getKpiCategories(),
        getKpiUnits(),
      ]);

      const mappedKpis: KpiItem[] = (kpiData || []).map((row: KpiDetail) => ({
        id: String(row.id),
        name: String(row.name ?? ''),
        category: String(row.category ?? 'Satış').trim(),
        unit: String(row.unit ?? 'Puan').trim(),
        status: (row.status === 'pasif' ? 'pasif' : 'aktif') as KpiStatus,
        reportCount: typeof row.report_count === 'number' ? row.report_count : 0,
        ytdCalc: (row.ytd_calc === 'toplam' ? 'toplam' : 'ortalama') as YtdCalc,
        onlyCumulative: !!row.only_cumulative,
        hasTargetData: !!row.has_target_data,
        monthlyAverage: !!row.monthly_average,
        averageData: !!row.average_data || (!!row.numerator_kpi_id && !!row.denominator_kpi_id && row.unit !== '%'),
        numeratorKpiId: row.numerator_kpi_id ? String(row.numerator_kpi_id) : undefined,
        denominatorKpiId: row.denominator_kpi_id ? String(row.denominator_kpi_id) : undefined,
        target: row.target != null ? String(row.target) : undefined,
        formulaText: row.formula_text ? String(row.formula_text) : undefined,
        targetFormulaText: row.target_formula_text ? String(row.target_formula_text) : undefined,
        cumulativeSourceIds: Array.isArray(row.cumulative_source_ids) ? row.cumulative_source_ids : [],
      }));
      setKpis(mappedKpis);

      if (categoryData && categoryData.length > 0) {
        setCategories(categoryData.map((c: string) => (c || '').trim()).filter(Boolean));
      } else {
        const catSet = new Set<string>(mappedKpis.map((k: KpiItem) => k.category).filter(Boolean));
        if (catSet.size) setCategories(Array.from(catSet));
      }

      if (unitData && unitData.length > 0) {
        setUnits(unitData.map((u: string) => (u || '').trim()).filter(Boolean));
      } else {
        const unitSet = new Set<string>(mappedKpis.map((k: KpiItem) => k.unit).filter(Boolean));
        if (unitSet.size) setUnits(Array.from(unitSet));
      }

    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(`Veri yüklenemedi: ${error?.message ?? String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { kpis, categories, units, isLoading, error, setKpis, setCategories, refetch: load };
}