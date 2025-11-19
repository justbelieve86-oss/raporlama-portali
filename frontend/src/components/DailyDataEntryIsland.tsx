import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getUserId } from '../lib/authHelpers';
import { api } from '../lib/axiosClient';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DevDiagnosticsPanel from './DevDiagnosticsPanel';
import { getListItems } from '../utils/apiList';
import { getBrands, getBrandKpis, getKpiCumulativeSources, getKpiFormulas, getKpiMonthlyReports, getKpiDailyReports, getBrandKpiTargets, saveKpiDailyReport, saveBrandKpiMonthlyTarget, saveKpiReport, deleteBrandKpiMapping, getKpiDetails } from '../services/api';
import type { Kpi, KpiFormula, KpiDetail, KpiCumulativeSource } from '../types/api';
import KpiAddFormIsland from './KpiAddFormIsland';
import AutoSaveToggle from './AutoSaveToggle';
import type { BrandCategoryKey } from '../lib/brandCategories';
import { logger } from '../lib/logger';


type Brand = { id: string; name: string };
// Kpi type is imported from '../types/api' (line 24), no need to redefine
const DAILY_CATEGORY = 'Satış - Günlük KPI';
const normalize = (s: string | undefined | null): string => String(s || '').trim().toLowerCase();
// Ortak birim yardımcı fonksiyonu: TL/TRY/% gibi birimleri normalize eder
function getUnitMeta(unit?: string) {
  const unitNorm = String(unit || '').trim().toLowerCase();
  const isTl = unitNorm === 'tl' || unitNorm === 'try' || unitNorm.includes('₺');
  const isPercent = unitNorm.includes('yüzde') || unitNorm === '%';
  const unitLabel = unitNorm ? (isTl ? 'TL' : (isPercent ? '%' : unitNorm)) : '';
  return { unitNorm, isTl, isPercent, unitLabel };
}

// Türk Lirası formatı için yardımcı fonksiyon
function formatNumber(amount: number): string {
  const hasFraction = amount % 1 !== 0;
  if (!hasFraction) {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// TL için: sadece küsurat varsa ondalık göster
function formatCurrency(amount: number): string {
  const hasFraction = amount % 1 !== 0;
  if (!hasFraction) {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Ham input değeri (focus'ta kullanılacak - binlik ayraçsız, virgül ondalık ayırıcı)
function formatRawInput(value: string | number | undefined): string {
  if (value === undefined || value === null || value === '' || value === 0) return '';
  
  // Number ise direkt formatla
  if (typeof value === 'number') {
    const hasFraction = value % 1 !== 0;
    if (hasFraction) {
      // Ondalık kısmı varsa, ondalık ayırıcı olarak virgül kullan
      return value.toString().replace('.', ',');
    }
    return value.toString();
  }
  
  // String değeri al ve binlik ayırıcıları temizle, ondalık ayırıcıyı virgül olarak koru
  // Eğer nokta varsa ve virgül yoksa, son noktayı virgüle çevir (ondalık ayırıcı)
  let cleanValue = String(value).replace(/\./g, '');
  // Eğer orijinal string'de nokta varsa ve virgül yoksa, son noktayı virgül yap
  const originalStr = String(value);
  const hasComma = originalStr.includes(',');
  const hasDot = originalStr.includes('.');
  
  if (hasDot && !hasComma) {
    // Nokta ondalık ayırıcı olarak kullanılmış, virgüle çevir
    const parts = originalStr.split('.');
    if (parts.length > 1) {
      // Son kısım ondalık
      cleanValue = parts.slice(0, -1).join('') + ',' + parts[parts.length - 1];
    }
  } else if (hasComma) {
    // Virgül zaten var, binlik ayırıcıları temizle
    cleanValue = originalStr.replace(/\./g, '');
  }
  
  return cleanValue;
}

// Rozet/Pill stilini tekilleştiren yardımcı: varyantlara göre sınıf üretir
function pillClass(variant: 'gray' | 'violet' | 'blue' | 'green' | 'amber' | 'red' = 'gray') {
  switch (variant) {
    case 'violet':
      return 'inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border border-violet-300 bg-violet-50 text-violet-700';
    case 'blue':
      return 'inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border border-blue-300 bg-blue-50 text-blue-700';
    case 'green':
      return 'inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border border-green-300 bg-green-50 text-green-700';
    case 'amber':
      return 'inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-700';
    case 'red':
      return 'inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border border-red-300 bg-red-50 text-red-700';
    case 'gray':
    default:
      return 'inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border border-gray-300 bg-gray-50 text-gray-700';
  }
}

export default function DailyDataEntryIsland({ categoryFilter, brandCategory = 'satis-markalari' }: { categoryFilter?: string; brandCategory?: BrandCategoryKey }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandId, setBrandId] = useState<string>('');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const [year, setYear] = useState<number>(yesterday.getFullYear());
  const [month, setMonth] = useState<number>(yesterday.getMonth() + 1); // 1-12
  const [day, setDay] = useState<number>(yesterday.getDate());
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [allKpis, setAllKpis] = useState<Kpi[]>([]);
  const [orderedKpis, setOrderedKpis] = useState<Kpi[]>([]);
  const [isOrderingLoaded, setIsOrderingLoaded] = useState<boolean>(false);
  const [_isSavingOrder, setIsSavingOrder] = useState<boolean>(false);
  const [values, setValues] = useState<Record<string, Record<number, number>>>({}); // kpiId -> day -> value
  const [targets, setTargets] = useState<Record<string, number>>({}); // kpiId -> target value (brand/year scoped)
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSave, setAutoSave] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('dailyAutoSave');
      if (v === 'false') return false;
      if (v === 'true') return true;
      return true; // default on
    } catch {
      return true;
    }
  });
  const [cumulativeSources, setCumulativeSources] = useState<Record<string, string[]>>({});
  const [formulaExpressions, setFormulaExpressions] = useState<Record<string, string>>({});
  const [cumulativeOverrides, setCumulativeOverrides] = useState<Record<string, number | null>>({}); // manual monthly values for only_cumulative KPIs
  const [unitById, setUnitById] = useState<Record<string, string>>({});
  const [isSavingData, setIsSavingData] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const cacheKeyBase = useMemo(() => `daily-entry-cache:${brandId}:${year}:${month}`, [brandId, year, month]);
  const userId = getUserId();
  const categoryKey = useMemo(() => normalize(categoryFilter ?? DAILY_CATEGORY), [categoryFilter]);
  const orderStorageKey = useMemo(() => `kpi-ordering:${userId || 'anon'}:${brandId}:${categoryKey}`,[userId, brandId, categoryKey]);

  // onTargetSave removed - not used

  // Drag & Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const daysInMonth = useMemo(() => {
    const d = new Date(year, month, 0); // last day of month
    return d.getDate();
  }, [year, month]);

  // Sync autoSave changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('dailyAutoSave', autoSave ? 'true' : 'false');
    } catch {}
  }, [autoSave]);

  // Listen for autoSave changes from other islands (header toggle)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'dailyAutoSave') {
        setAutoSave(e.newValue === 'true');
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handler);
      }
    };
  }, []);

  // Ay/yıl değişince seçili günü geçerli aralığa sıkıştır
  useEffect(() => {
    setDay((prev) => {
      const clamped = Math.max(1, Math.min(prev, daysInMonth));
      return clamped;
    });
  }, [daysInMonth]);

  const years = useMemo(() => {
    const arr: number[] = [];
    const base = new Date().getFullYear();
    for (let y = base - 3; y <= base + 1; y++) arr.push(y);
    return arr.reverse();
  }, []);

  const months = useMemo(() => (
    [
      { value: 1, label: 'Ocak' }, { value: 2, label: 'Şubat' }, { value: 3, label: 'Mart' },
      { value: 4, label: 'Nisan' }, { value: 5, label: 'Mayıs' }, { value: 6, label: 'Haziran' },
      { value: 7, label: 'Temmuz' }, { value: 8, label: 'Ağustos' }, { value: 9, label: 'Eylül' },
      { value: 10, label: 'Ekim' }, { value: 11, label: 'Kasım' }, { value: 12, label: 'Aralık' },
    ]
  ), []);

  // Yerel cache'den bekleyen düzenlemeleri yükle (varsa)
  useEffect(() => {
    try {
      if (!brandId || !kpis.length) return;
      const raw = typeof window !== 'undefined' ? localStorage.getItem(`${cacheKeyBase}`) : null;
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const cachedValues: Record<string, Record<number, number>> = parsed?.values || {};
      const cachedTargets: Record<string, number> = parsed?.targets || {};
      // Mevcut state ile birleştir (mevcut olmayan günler için uygula)
      setValues(prev => {
        const next = { ...prev };
        Object.entries(cachedValues).forEach(([kpiId, byDay]) => {
          if (!next[kpiId]) next[kpiId] = {} as Record<number, number>;
          Object.entries(byDay as Record<string, unknown>).forEach(([d, val]) => {
            const dayNum = Number(d);
            if (next[kpiId][dayNum] == null) next[kpiId][dayNum] = Number(val);
          });
        });
        return next;
      });
      setTargets(prev => ({ ...prev, ...cachedTargets }));
    } catch {}
  }, [cacheKeyBase, brandId, kpis.length]);

  const persistCache = useCallback((nextValues?: Record<string, Record<number, number>>, nextTargets?: Record<string, number>) => {
    try {
      if (!brandId) return;
      const payload = {
        values: nextValues ?? values,
        targets: nextTargets ?? targets,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${cacheKeyBase}`, JSON.stringify(payload));
      }
    } catch {}
  }, [brandId, values, targets, cacheKeyBase]);

  useEffect(() => {
    const loadBrands = async () => {
      try {
        setError(null);
        // Marka listesini services/api.getBrands ile yükle (kategori filtresi dahil)
        const cat = brandCategory;
        const { brands: list } = await getBrands({ brandCategory: cat });
        setBrands(list);
        const currentSel = typeof window !== 'undefined' ? localStorage.getItem('selectedBrandId') : null;
        const initial = currentSel && list?.find((b) => String(b.id) === String(currentSel)) ? String(currentSel) : (list?.[0]?.id ? String(list[0].id) : '');
        if (initial) {
          setBrandId(initial);
          try { localStorage.setItem('selectedBrandId', initial); } catch {}
        }
      } catch (e: unknown) {
        // 401 durumunda session/token temizleyip login'e yönlendir
        const msg = String(e?.response?.data?.message || e?.message || '').toLowerCase();
        if (e?.response?.status === 401 || msg.includes('geçersiz token') || msg.includes('eksik yetki')) {
          try {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('user_role');
            }
          } catch {}
          setBrands([]);
          setError('Oturum geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.');
          setTimeout(() => { try { window.location.href = '/login?message=Oturum%20s%C3%BCresi%20dolmu%C5%9F'; } catch {} }, 800);
          return;
        }
        logger.error('Markalar yüklenemedi', e);
        setError('Markalar yüklenemedi');
      }
    };
    loadBrands();
  }, [brandCategory]);

  const loadKpis = useCallback(async (brandIdStr: string) => {
    if (!brandIdStr) { setKpis([]); return; }
    try {
      setLoading(true);
      setError(null);
      
      const resp = await getBrandKpis(brandIdStr);
      // getBrandKpis artık { kpis: [...] } formatında döner (sendList formatı)
      const kpiRows = resp?.kpis || [];

      const next: Kpi[] = (kpiRows || []).map((r) => ({ 
        id: String(r.id || ''), 
        name: String(r.name || ''), 
        category: String(r.category || ''), 
        unit: String((r?.unit ?? r?.kpi_unit ?? r?.kpi?.unit ?? r?.kpis?.unit ?? '') || ''),
        calculation_type: (r.calculation_type || 'direct') as Kpi['calculation_type'], 
        target: r.target != null ? Number(r.target) : null, 
        only_cumulative: !!r.only_cumulative,
        numerator_kpi_id: r.numerator_kpi_id ? String(r.numerator_kpi_id) : undefined,
        denominator_kpi_id: r.denominator_kpi_id ? String(r.denominator_kpi_id) : undefined,
      }));
      // Tüm marka KPI'larını sakla (formül referans çözümlemesi için)
      setAllKpis(next);

      const desiredCategory = categoryFilter ?? DAILY_CATEGORY;
      // UI’da kullanılan kategori adlarını mevcut veritabanı kategorilerine eşle
      const resolveCategoryAlias = (s: string): string => {
        const key = normalize(s);
        const map: Record<string, string> = {
          [normalize('2. El Satış - Günlük KPI')]: 'İkinci El - Günlük KPI',
          [normalize('İkinci El Satış - Günlük KPI')]: 'İkinci El - Günlük KPI',
          [normalize('2. El - Günlük KPI')]: 'İkinci El - Günlük KPI',
        };
        return map[key] || s;
      };
      const canonicalDesired = resolveCategoryAlias(desiredCategory);
      const filtered = next.filter(k => normalize(k.category) === normalize(canonicalDesired));
      setKpis(filtered);
      // Unit bilgisini doğrudan KPI listesinden doldur (ordering fallback'ı ayrıca yapılacak)
      try {
        const unitsFromKpis: Record<string, string> = {};
        (filtered || []).forEach(k => {
          const u = String(k.unit || '').trim();
          if (u) unitsFromKpis[k.id] = u;
        });
        if (Object.keys(unitsFromKpis).length > 0) setUnitById(unitsFromKpis);
      } catch {}
      
      setOrderedKpis((prev) => {
        if (!prev || prev.length === 0) return filtered;
        const allowed = new Map(filtered.map(k => [k.id, k]));
        const kept = prev.filter(k => allowed.has(k.id));
        const keptIds = new Set(kept.map(k => k.id));
        const toAdd = filtered.filter(k => !keptIds.has(k.id));
        return [...kept, ...toAdd];
      });
      setIsOrderingLoaded(false);

      // Formül ifadelerini yükle: formula tipleri formül tablosundan, target tipleri kpi detaylarından
      const formulaIds = filtered.filter(k => k.calculation_type === 'formula').map(k => k.id);
      const targetIds = filtered.filter(k => k.calculation_type === 'target').map(k => k.id);
      if (formulaIds.length > 0 || targetIds.length > 0) {
        const fmap: Record<string, string> = {};

        if (formulaIds.length > 0) {
          const fRows = await getKpiFormulas(formulaIds);
          (fRows || []).forEach((r: KpiFormula) => {
            const kId = String(r.kpi_id);
            const exprRaw = (r && typeof r === 'object') ? (r.expression ?? r.display_expression ?? '') : '';
            const expr = String(exprRaw || '').trim();
            if (expr) fmap[kId] = expr;
          });
        }

        if (targetIds.length > 0) {
          const tRows = await getKpiDetails(targetIds);
          (tRows || []).forEach((r: KpiDetail) => {
            const kId = String(r.id);
            const exprRaw = (r && typeof r === 'object') ? (r.target_formula_text ?? '') : '';
            const expr = String(exprRaw || '').trim();
            if (expr) fmap[kId] = expr;
          });
        }
        setFormulaExpressions(fmap);

        // Formül referanslarındaki kümülatif KPI'ların kaynaklarını da yükle
        const extractTokens = (expr: string): string[] => {
          const tokens: string[] = [];
          // Destekle: {{...}} ve [...]
          expr.replace(/\{\{([^}]+)\}\}|\[([^\]]+)\]/g, (_match: string, g1: string, g2: string) => {
            const rawId = (g1 ?? g2);
            tokens.push(String(rawId).trim());
            return '';
          });
          return tokens;
        };
        const normalizeLocal = (s: string) => String(s || '').trim().toLowerCase();
        const allById = new Map<string, Kpi>(allKpis.map(k => [String(k.id), k]));
        const allByName = new Map<string, Kpi>(allKpis.map(k => [normalizeLocal(k.name), k]));
        const referencedCumIds = new Set<string>();
        Object.values(fmap).forEach(expr => {
          const tokens = extractTokens(expr);
          tokens.forEach(tok => {
            let ref: Kpi | undefined = undefined;
            // önce ID eşleşmesi
            if (allById.has(tok)) ref = allById.get(tok);
            else if (allByName.has(normalizeLocal(tok))) ref = allByName.get(normalizeLocal(tok));
            if (ref && ref.calculation_type === 'cumulative') {
              referencedCumIds.add(String(ref.id));
            }
          });
        });
        // Sayfadaki kümülatif KPI’larla birleştir
        filtered.filter(k => k.calculation_type === 'cumulative').forEach(k => referencedCumIds.add(k.id));

        if (referencedCumIds.size > 0) {
          const cumRows = await getKpiCumulativeSources(Array.from(referencedCumIds));
          const map: Record<string, string[]> = {};
          (cumRows || []).forEach((r: KpiCumulativeSource) => {
            const kId = String(r.kpi_id);
            const sId = String(r.source_kpi_id);
            if (!map[kId]) map[kId] = [];
            map[kId].push(sId);
          });
          setCumulativeSources(map);
        } else {
          setCumulativeSources({});
        }
      } else {
        setFormulaExpressions({});
        // Formül yoksa sadece sayfadaki kümülatif KPI’ların kaynaklarını yükle
        const cumIds = filtered.filter(k => k.calculation_type === 'cumulative').map(k => k.id);
        if (cumIds.length > 0) {
          const cumRows = await getKpiCumulativeSources(cumIds);
          const map: Record<string, string[]> = {};
          (cumRows || []).forEach((r: KpiCumulativeSource) => {
            const kId = String(r.kpi_id);
            const sId = String(r.source_kpi_id);
            if (!map[kId]) map[kId] = [];
            map[kId].push(sId);
          });
          setCumulativeSources(map);
        } else {
          setCumulativeSources({});
        }
      }

      // Only-cumulative monthly overrides
      const ocIds = filtered.filter(k => k.only_cumulative === true).map(k => k.id);
      if (ocIds.length > 0) {
        const rRows = await getKpiMonthlyReports(brandIdStr, year, month, ocIds);
        const map: Record<string, number> = {};
        for (const r of (rRows || [])) {
          const kId = String(r.kpi_id);
          const v = Number(r.value || 0);
          map[kId] = v;
        }
        setCumulativeOverrides(map);
      } else {
        setCumulativeOverrides({});
      }
      // Birim bilgisini KPI detaylarından da getir (getBrandKpis bu alanı taşımıyorsa)
      try {
        const unitsFromKpis: Record<string, string> = {};
        (filtered || []).forEach(k => {
          const u = String(k.unit || '').trim();
          if (u) unitsFromKpis[k.id] = u;
        });
        if (Object.keys(unitsFromKpis).length > 0) {
          setUnitById(unitsFromKpis);
        } else if ((filtered || []).length > 0) {
          const details = await getKpiDetails(filtered.map(k => k.id));
          const unitsFromDetails: Record<string, string> = {};
          (details || []).forEach((r: KpiDetail) => {
            const kId = String(r?.id || '');
            const uRaw = (r?.unit ?? r?.kpi_unit ?? r?.kpi?.unit ?? r?.kpis?.unit ?? '');
            if (kId && String(uRaw || '').trim()) unitsFromDetails[kId] = String(uRaw).trim();
          });
          if (Object.keys(unitsFromDetails).length > 0) setUnitById(unitsFromDetails);
        }
      } catch {}
    } catch (e: unknown) {
      const error = e as { message?: string };
      setError(error?.message || 'KPI\'ler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [year, month, categoryFilter]);

  // Dışarıdan KPI eklendiğinde listeyi yenile
  useEffect(() => {
    const handler = (e: React.ChangeEvent<HTMLInputElement>) => {
      try {
        const detail = e?.detail || {};
        const addedBrandId = String(detail?.brandId || '');
        if (brandId && addedBrandId && String(addedBrandId) === String(brandId)) {
          loadKpis(brandId);
        }
      } catch {}
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('brand-kpi-added', handler as (e: Event) => void);
    }
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('brand-kpi-added', handler as (e: Event) => void);
    };
  }, [brandId, loadKpis]);

  const loadValues = useCallback(async (brandIdStr: string, yearNum: number, monthNum: number, targetKpiIds?: string[]) => {
    if (!brandIdStr) return;
    try {
      setLoading(true);
      setError(null);
      const rows = await getKpiDailyReports(brandIdStr, yearNum, monthNum, undefined, targetKpiIds && targetKpiIds.length > 0 ? targetKpiIds : undefined);
      const map: Record<string, Record<number, number>> = {};
      for (const r of (rows || [])) {
        const kpiId = String(r.kpi_id);
        const dayOfMonth = new Date(r.report_date).getDate();
        const value = Number(r.value || 0);
        if (!map[kpiId]) map[kpiId] = {};
        map[kpiId][dayOfMonth] = value;
      }
      setValues(map);
    } catch (e: unknown) {
      const error = e as { message?: string };
      setError(error?.message || 'Değerler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  // onSave removed - not used, inline save logic is used instead



  useEffect(() => { if (brandId) { loadKpis(brandId); } }, [brandId]);
  // KPI listesi yüklendikten sonra günlük değerleri yalnızca ilgili KPI’lar için getir
  useEffect(() => {
    if (brandId) {
      const ids = (kpis || []).map(k => k.id);
      loadValues(brandId, year, month, ids.length > 0 ? ids : undefined);
    }
  }, [brandId, year, month, kpis, loadValues]);

  // KPI ordering load after KPIs are fetched
  useEffect(() => {
    const loadKpiOrdering = async () => {
      if (!brandId || kpis.length === 0 || isOrderingLoaded) return;
      try {
        const { data } = await api.get(`/kpi-ordering/${brandId}`);
        type KpiOrderingItem = { kpi_id: string; order_index: number; kpis?: { unit?: string }; kpi?: { unit?: string }; unit?: string; kpi_unit?: string };
        const rowsSource: KpiOrderingItem[] = getListItems<KpiOrderingItem>(data);
        const rows: Array<{ kpi_id: string; order_index: number }> = rowsSource.slice().sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999));
        // Unit bilgisini çıkar
        const units: Record<string, string> = {};
        (rowsSource || []).forEach((r: KpiOrderingItem) => {
          const kId = String(r?.kpi_id || '');
          const uRaw = (r?.kpis?.unit ?? r?.kpi?.unit ?? r?.unit ?? r?.kpi_unit);
          if (kId && uRaw != null) units[kId] = String(uRaw);
        });
        if (Object.keys(units).length > 0) setUnitById(prev => ({ ...prev, ...units }));
        if (rows.length === 0) {
          // initialize ordering for this brand
          await api.post(`/kpi-ordering/${brandId}/initialize`);
          const { data: data2 } = await api.get(`/kpi-ordering/${brandId}`);
          const rows2Source: KpiOrderingItem[] = getListItems<KpiOrderingItem>(data2);
          const rows2: Array<{ kpi_id: string; order_index: number }> = rows2Source.slice().sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999));
          const orderMap2 = new Map<string, number>();
          rows2.forEach((r: { kpi_id: string; order_index: number }) => orderMap2.set(String(r.kpi_id), Number(r.order_index)));
          const ordered = [...kpis].sort((a, b) => (orderMap2.get(a.id) ?? 999) - (orderMap2.get(b.id) ?? 999));
          // Unit bilgisini güncelle
          const units2: Record<string, string> = {};
          (rows2Source || []).forEach((r: KpiOrderingItem) => {
            const kId = String(r?.kpi_id || '');
            const uRaw = (r?.kpis?.unit ?? r?.kpi?.unit ?? r?.unit ?? r?.kpi_unit);
            if (kId && uRaw != null) units2[kId] = String(uRaw);
          });
          if (Object.keys(units2).length > 0) setUnitById(prev => ({ ...prev, ...units2 }));
          setOrderedKpis(ordered);
          try { localStorage.setItem(orderStorageKey, JSON.stringify(ordered.map(k => k.id))); } catch {
            // localStorage erişim hatası - sessizce yoksay
          }
        } else {
          const orderMap = new Map<string, number>();
          rows.forEach((r: { kpi_id: string; order_index: number }) => orderMap.set(String(r.kpi_id), Number(r.order_index)));
          const ordered = [...kpis].sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
          setOrderedKpis(ordered);
          try { localStorage.setItem(orderStorageKey, JSON.stringify(ordered.map(k => k.id))); } catch {
            // localStorage erişim hatası - sessizce yoksay
          }
        }
        setIsOrderingLoaded(true);
      } catch (_err) {
        logger.error('KPI ordering yüklenemedi', _err);
        // Local storage fallback
        try {
          const raw = typeof window !== 'undefined' ? localStorage.getItem(orderStorageKey) : null;
          if (raw) {
            const ids: string[] = JSON.parse(raw);
            const idToKpi = new Map(kpis.map(k => [k.id, k] as const));
            const orderedFromStorage = ids.map(id => idToKpi.get(id)).filter(Boolean) as Kpi[];
            const leftover = kpis.filter(k => !ids.includes(k.id));
            setOrderedKpis([...orderedFromStorage, ...leftover]);
          } else {
            setOrderedKpis(kpis);
          }
        } catch {
          setOrderedKpis(kpis);
        }
        setIsOrderingLoaded(true);
      }
    };
    loadKpiOrdering();
  }, [brandId, kpis, isOrderingLoaded, orderStorageKey]);

  const loadTargets = useCallback(async (brandIdStr: string, yearNum: number, targetKpiIds?: string[]) => {
    if (!brandIdStr) return;
    try {
      setLoading(true);
      setError(null);
      const tRows = await getBrandKpiTargets(brandIdStr, yearNum, undefined, targetKpiIds && targetKpiIds.length > 0 ? targetKpiIds : undefined);

      const map: Record<string, number> = {};
      for (const r of (tRows || [])) {
        const kId = String(r.kpi_id);
        const tVal = Number(r.target || 0);
        map[kId] = tVal;
      }
      setTargets(map);
    } catch (e: unknown) {
      const error = e as { message?: string };
      setError(error?.message || 'Hedefler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  // KPI listesi yüklendikten sonra yalnızca ilgili KPI’ların hedeflerini getir
  useEffect(() => {
    if (brandId) {
      const ids = (kpis || []).map(k => k.id);
      loadTargets(brandId, year, ids.length > 0 ? ids : undefined);
    }
  }, [brandId, year, kpis, loadTargets]);

  const saveValue = useCallback(async (kpiId: string, day: number, valueNum: number) => {
    try {
      if (!brandId) return;
      setIsSavingData(true);
      await saveKpiDailyReport(brandId, year, month, day, kpiId, valueNum);
      setLastSavedAt(new Date());
    } catch (e: unknown) {
      logger.error('Değer kaydedilemedi', e);
      const error = e as { message?: string };
      setError(error?.message || 'Değer kaydedilemedi');
    } finally {
      setIsSavingData(false);
    }
  }, [brandId, year, month]);

  const onChangeCell = (kpiId: string, day: number, raw: string) => {
    // Türkçe format: virgül ondalık ayırıcı, nokta binlik ayırıcı
    // Parse: binlik ayırıcıları (nokta) kaldır, virgülü noktaya çevir
    const lastComma = raw.lastIndexOf(',');
    const lastDot = raw.lastIndexOf('.');
    let clean: string;
    if (lastComma > lastDot) {
      // Virgül ondalık ayırıcı
      clean = raw.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
      // Nokta ondalık ayırıcı (legacy format - uyumluluk için)
      const parts = raw.split('.');
      if (parts.length > 1) {
        clean = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
      } else {
        clean = raw.replace(/\./g, '');
      }
    } else {
      // Binlik ayırıcıları kaldır
      clean = raw.replace(/\./g, '');
    }
    const num = Number(clean);
    if (!isFinite(num)) {
      setError('Geçersiz sayı girdisi. Lütfen geçerli bir değer girin.');
      return;
    }
    setError(null);
    setValues(prev => {
      const next = { ...prev };
      const row = { ...(next[kpiId] || {}) };
      row[day] = num;
      next[kpiId] = row;
      // Yerel cache'i güncelle
      persistCache(next, undefined);
      return next;
    });
    if (autoSave) saveValue(kpiId, day, num);
  };

  const saveTarget = useCallback(async (kpiId: string, valueNum: number) => {
    try {
      if (!brandId) return;
      setIsSavingData(true);
      await saveBrandKpiMonthlyTarget(brandId, year, month, kpiId, valueNum);
      setLastSavedAt(new Date());
    } catch (e: unknown) {
      logger.error('Hedef kaydedilemedi', e);
      const error = e as { message?: string };
      setError(error?.message || 'Hedef kaydedilemedi');
    } finally {
      setIsSavingData(false);
    }
  }, [brandId, year, month]);

  const onChangeTarget = (kpiId: string, raw: string) => {
    // Türkçe format: virgül ondalık ayırıcı, nokta binlik ayırıcı
    const lastComma = raw.lastIndexOf(',');
    const lastDot = raw.lastIndexOf('.');
    let clean: string;
    if (lastComma > lastDot) {
      clean = raw.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
      const parts = raw.split('.');
      if (parts.length > 1) {
        clean = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
      } else {
        clean = raw.replace(/\./g, '');
      }
    } else {
      clean = raw.replace(/\./g, '');
    }
    const num = Number(clean);
    if (!isFinite(num)) return;
    setTargets(prev => {
      const next = { ...prev, [kpiId]: num };
      persistCache(undefined, next);
      return next;
    });
    if (autoSave) saveTarget(kpiId, num);
  };

  // KPI silme (mapping kaldırma) – hafif doğrulama ile
  const onDeleteKpi = useCallback(async (kpiId: string) => {
    try {
      if (!brandId) return;
      const ok = typeof window !== 'undefined' ? window.confirm('Bu KPI bu marka için kaldırılacak ve ilgili kayıtlar silinebilir. Devam edilsin mi?') : true;
      if (!ok) return;
      await deleteBrandKpiMapping(String(brandId), String(kpiId));
      // Yerel state güncellemeleri
      setKpis(prev => prev.filter(k => k.id !== kpiId));
      setOrderedKpis(prev => prev.filter(k => k.id !== kpiId));
      setValues(prev => { const next = { ...prev }; delete next[kpiId]; persistCache(next, undefined); return next; });
      setTargets(prev => { const next = { ...prev }; delete next[kpiId]; persistCache(undefined, next); return next; });
      setCumulativeOverrides(prev => { const next = { ...prev }; delete next[kpiId]; return next; });
      // Olay yayınla (add form ile senkronizasyon için)
      try { if (typeof window !== 'undefined') { window.dispatchEvent(new CustomEvent('brand-kpi-removed', { detail: { brandId, kpiId } })); } } catch {}
    } catch (e: unknown) {
      const error = e as { message?: string };
      setError(error?.message || 'KPI silme işleminde hata oluştu');
    }
  }, [brandId, persistCache]);

  // Basit aritmetik ifadeyi değerlendir ( + - * / ve parantez )
  function evaluateArithmeticExpression(expr: string): number | null {
    const tokens: (string | number)[] = [];
    let i = 0;
    while (i < expr.length) {
      const ch = expr[i];
      if (ch === ' ' || ch === '\t' || ch === '\n') { i++; continue; }
      if ('+-*/()'.includes(ch)) { tokens.push(ch); i++; continue; }
      if ((ch >= '0' && ch <= '9') || ch === '.') {
        let j = i + 1;
        while (j < expr.length) {
          const cj = expr[j];
          if ((cj >= '0' && cj <= '9') || cj === '.') j++; else break;
        }
        const numStr = expr.slice(i, j);
        const num = Number(numStr);
        if (!Number.isFinite(num)) return null;
        tokens.push(num);
        i = j;
        continue;
      }
      return null;
    }
    const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };
    const output: (number | string)[] = [];
    const ops: string[] = [];
    const isOp = (t: unknown): t is '+' | '-' | '*' | '/' => typeof t === 'string' && ['+', '-', '*', '/'].includes(t);
    for (const t of tokens) {
      if (typeof t === 'number') {
        output.push(t);
      } else if (t === '(') {
        ops.push(t);
      } else if (t === ')') {
        while (ops.length && ops[ops.length - 1] !== '(') output.push(ops.pop() as string);
        if (!ops.length) return null; // mismatched
        ops.pop();
      } else if (isOp(t)) {
        while (ops.length && isOp(ops[ops.length - 1]) && prec[ops[ops.length - 1]] >= prec[t]) {
          output.push(ops.pop() as string);
        }
        ops.push(t);
      } else {
        return null;
      }
    }
    while (ops.length) {
      const op = ops.pop() as string;
      if (op === '(' || op === ')') return null;
      output.push(op);
    }
    const stack: number[] = [];
    for (const t of output) {
      if (typeof t === 'number') stack.push(t);
      else if (isOp(t)) {
        if (stack.length < 2) return null;
        const b = stack.pop() as number;
        const a = stack.pop() as number;
        let r = 0;
        if (t === '+') r = a + b;
        else if (t === '-') r = a - b;
        else if (t === '*') r = a * b;
        else if (t === '/') { if (b === 0) return null; r = a / b; }
        stack.push(r);
      }
    }
    return stack.length === 1 ? stack[0] : null;
  }

  const cumulative = useMemo(() => {
    const result: Record<string, number> = {};

    // Referans çözümleyici: {{...}} içindeki değer ID değilse isimden ID’ye eşle
    const resolveRefId = (raw: string): string | null => {
      const token = String(raw || '').trim();
      // Önce birebir ID eşleşmesi (tüm marka KPI’larında)
      if (allKpis.some(k => String(k.id) === token)) return token;
      // İsim bazlı eşleşme (case-insensitive, trim) – tüm marka KPI’larında ara
      const byName = allKpis.find(k => normalize(k.name) === normalize(token));
      return byName ? String(byName.id) : null;
    };

    // Yardımcı: Bir referans KPI'ın belirli günde kullanılacak değerini hesapla
    const getRefDayValue = (refId: string, d: number): number => {
      // Önce direkt günlük değer varsa kullan
      const direct = values[String(refId)]?.[d];
      if (direct != null) return Number(direct) || 0;
      // Yoksa KPI türüne göre türet
      const refKpi = (allKpis || []).find(x => String(x.id) === String(refId));
      if (!refKpi) return 0;
      if (refKpi.only_cumulative === true) {
        // Only-cumulative KPI’ların günlük değeri yok; günlük için 0 döndür.
        return 0;
      }
      if (refKpi.calculation_type === 'cumulative') {
        // O gün için kümülatif KPI’ın kaynaklarının günlük toplamını kullan
        const sources = cumulativeSources[refId] || [];
        let daySum = 0;
        for (const sid of sources) {
          const v = values[String(sid)]?.[d];
          daySum += Number(v) || 0;
        }
        return daySum;
      }
      // Diğer tiplerde günlük değer yoksa 0
      return 0;
    };

    // Yardımcı: Bir referans KPI'ın belirli güne kadar kümülatif değerini hesapla
    const getRefCumulativeValue = (refId: string, d: number): number => {
      const refKpi = (allKpis || []).find(x => String(x.id) === String(refId));
      if (!refKpi) return 0;
      if (refKpi.only_cumulative === true) {
        return Number(cumulativeOverrides[refId] ?? 0);
      }
      if (refKpi.calculation_type === 'cumulative') {
        const sources = cumulativeSources[refId] || [];
        let sum = 0;
        for (let i = 1; i <= d; i++) {
          for (const sid of sources) {
            sum += Number(values[String(sid)]?.[i]) || 0;
          }
        }
        return sum;
      }
      // direct veya diğer tipler: kendi günlük değerlerinin toplamı
      let sum = 0;
      const row = values[String(refId)] || {};
      for (let i = 1; i <= d; i++) {
        sum += Number(row[i]) || 0;
      }
      return sum;
    };

    for (const k of kpis) {
      let sum = 0;
      if (k.only_cumulative === true) {
        // Use manual override for only-cumulative KPIs
        sum = Number(cumulativeOverrides[k.id] ?? 0);
      } else if (k.calculation_type === 'cumulative') {
        const sources = cumulativeSources[k.id] || [];
        for (let d = 1; d <= day; d++) {
          for (const sid of sources) {
            const v = values[sid]?.[d];
            sum += Number(v) || 0;
          }
        }
      } else if (k.calculation_type === 'formula') {
        const expr = formulaExpressions[k.id];
        if (expr) {
          for (let d = 1; d <= day; d++) {
            const numericExpr = expr.replace(/\{\{([^}]+)\}\}|\[([^\]]+)\]/g, (_match: string, g1: string, g2: string) => {
              const rawId = (g1 ?? g2);
              const refId = resolveRefId(rawId);
              const n = refId ? getRefDayValue(String(refId), d) : 0;
              return String(n);
            });
            const val = evaluateArithmeticExpression(numericExpr);
            if (val != null && Number.isFinite(val)) sum += val;
          }
        }
      } else if (k.calculation_type === 'target') {
        // Hedef KPI: formülü varsa referansları kümülatif değerlerle değerlendir
        const expr = formulaExpressions[k.id];
        if (expr) {
          const numericExpr = expr.replace(/\{\{([^}]+)\}\}|\[([^\]]+)\]/g, (_match: string, g1: string, g2: string) => {
            const rawId = (g1 ?? g2);
            const refId = resolveRefId(rawId);
            const n = refId ? getRefCumulativeValue(String(refId), day) : 0;
            return String(n);
          });
          const val = evaluateArithmeticExpression(numericExpr);
          sum = (val != null && Number.isFinite(val)) ? Number(val) : 0;
        } else {
          sum = 0;
        }
      } else if (k.calculation_type === 'percentage' && k.numerator_kpi_id && k.denominator_kpi_id) {
        // Oran/Yüzde KPI: Toplam pay / toplam payda. % birimde 100 ile çarp.
        const numCum = getRefCumulativeValue(String(k.numerator_kpi_id), day);
        const denCum = getRefCumulativeValue(String(k.denominator_kpi_id), day);
        if (denCum === 0) {
          sum = 0;
        } else {
          const raw = numCum / denCum;
          const isPercentUnit = String(k.unit || '').trim() === '%';
          sum = isPercentUnit ? (raw * 100) : raw;
        }
      } else {
        const row = values[k.id] || {};
        for (let d = 1; d <= day; d++) {
          sum += Number(row[d]) || 0;
        }
      }
      result[k.id] = sum;
    }
    return result;
  }, [kpis, allKpis, values, day, cumulativeSources, formulaExpressions, cumulativeOverrides]);

  const onChangeCumulativeOverride = useCallback(async (kpiId: string, strVal: string) => {
    const clean = String(strVal).replace(/\./g, '').replace(',', '.');
    const num = clean === '' ? null : Number(clean);

    if (clean !== '' && (num === null || !isFinite(num))) {
      // Invalid number, do nothing.
      return;
    }

    setCumulativeOverrides(prev => ({ ...prev, [kpiId]: num }));

    if (!autoSave) return;

    try {
      if (!brandId) return;
      await saveKpiReport(brandId, year, month, kpiId, num);
    } catch (e: unknown) {
      logger.error('Kümülatif değer kaydedilemedi', e);
      const error = e as { message?: string };
      setError(error?.message || 'Kümülatif değer kaydedilemedi');
    }
  }, [autoSave, brandId, month, year]);

  // Save KPI ordering (merge daily subset order into full brand ordering)
  const saveKpiOrdering = useCallback(async (newOrderedDaily: Kpi[]) => {
    logger.debug('saveKpiOrdering başladı', { brandId, newOrderedDaily: newOrderedDaily.map(k => k.id) });
    if (!brandId) {
      logger.warn('saveKpiOrdering: brandId eksik, işlem iptal edildi.');
      return;
    }
    try {
      // 1) Mevcut tam sıralamayı yükle
      logger.debug('Mevcut sıralama yükleniyor', { endpoint: `/kpi-ordering/${brandId}` });
      type KpiOrderingItem = { kpi_id: string; order_index: number };
      let fullSource: KpiOrderingItem[] = [];
      try {
        const { data } = await api.get(`/kpi-ordering/${brandId}`);
        logger.debug('GET /kpi-ordering yanıtı', { data });
        fullSource = getListItems<KpiOrderingItem>(data);
      } catch (getErr) {
        logger.warn('GET /kpi-ordering başarısız, initialize ile denenecek', getErr);
        fullSource = [];
      }

      let fullList: string[] = fullSource
        .slice()
        .sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999))
        .map((r) => String(r.kpi_id));
      logger.debug('fullList (GET sonrası)', { fullList });

      // 2) Eğer tam sıralama boşsa, initialize etmeyi dene
      if (fullList.length === 0) {
        logger.debug('fullList boş; initialize çağrılıyor');
        try {
          const initResponse = await api.post(`/kpi-ordering/${brandId}/initialize`);
          logger.debug('Initialize yanıtı', { initResponse });
          const { data: data2 } = await api.get(`/kpi-ordering/${brandId}`);
          logger.debug('GET /kpi-ordering (initialize sonrası) yanıtı', { data2 });
          const fullSource2: KpiOrderingItem[] = getListItems<KpiOrderingItem>(data2);
          fullList = fullSource2
            .slice()
            .sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999))
            .map((r) => String(r.kpi_id));
          logger.debug('fullList (initialize sonrası)', { fullList });
        } catch (initErr) {
          logger.warn('Initialize başarısız veya gerekmedi', initErr);
        }
      }

      // 3) Initialize hâlâ boşsa, tüm marka KPI listesine fallback yap
      if (fullList.length === 0) {
        fullList = (allKpis || []).map(k => k.id);
        logger.debug('fullList (fallback tüm KPIlar)', { fullList });
      }

      const dailyIds = newOrderedDaily.map(k => k.id);
      logger.debug('dailyIds (sürüklenenler)', { dailyIds });
      const dailySet = new Set(dailyIds);

      // 4) Günlük KPI'ları tam liste içinde yeniden sırala
      const newFullList = [...dailyIds, ...fullList.filter(id => !dailySet.has(id))];
      logger.debug('Birleştirilmiş yeni tam liste', { newFullList });

      const payload = { kpiOrdering: newFullList.map((kpi_id, index) => ({ kpi_id, order_index: index })) };
      logger.debug('Gönderilecek payload', { payload, endpoint: `/kpi-ordering/${brandId}` });

      const response = await api.put(`/kpi-ordering/${brandId}`, payload);
      logger.debug('PUT yanıtı', { response });
      logger.debug('KPI ordering başarıyla kaydedildi');
      try { 
        localStorage.setItem(orderStorageKey, JSON.stringify(newOrderedDaily.map(k => k.id))); 
        logger.debug('localStorage güncellendi', { orderStorageKey });
      } catch (lsErr) {
        logger.error('localStorage kaydetme hatası', lsErr);
      }
    } catch (err: unknown) {
      logger.error('KPI ordering kaydedilemedi', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const apiError = err as { response?: { data?: unknown; status?: number; headers?: unknown }; message?: string };
        logger.error('Hata yanıtı', { data: apiError.response?.data, status: apiError.response?.status, headers: apiError.response?.headers });
      }
      const error = err as { message?: string };
      setError(error?.message || 'KPI ordering kaydedilemedi');
      // Yine de lokal fallback olarak kaydet
      try { 
        localStorage.setItem(orderStorageKey, JSON.stringify(newOrderedDaily.map(k => k.id))); 
        logger.debug('localStorage (hata durumunda) güncellendi', { orderStorageKey });
      } catch (lsErr) {
        logger.error('localStorage kaydetme hatası (hata durumu)', lsErr);
      }
    }
  }, [brandId, allKpis, orderStorageKey]);

  // Drag end handler
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedKpis.findIndex(k => k.id === active.id);
    const newIndex = orderedKpis.findIndex(k => k.id === over.id);
    const newOrdered = arrayMove(orderedKpis, oldIndex, newIndex);
    setOrderedKpis(newOrdered);
    setIsSavingOrder(true);
    try {
      await saveKpiOrdering(newOrdered);
    } finally {
      setIsSavingOrder(false);
    }
  }, [orderedKpis, saveKpiOrdering]);

  return (
    <div className="space-y-6">
      {/* Debug diagnostics panel (visible when ?debug=1 or localStorage debug=1) */}
      <DevDiagnosticsPanel />
      {/* Üst kontrol çubuğu (Sayfa header'ından bağımsız) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div>
            <div className="text-xs text-gray-600 mb-1 flex items-center gap-1"><span className="text-blue-600 text-xs">🏷️</span> Marka</div>
            <select
              value={brandId}
              onChange={(e) => { const id = e.target.value; setBrandId(id); try { localStorage.setItem('selectedBrandId', id); } catch {} }}
              className="w-full sm:min-w-[200px] px-2 py-2 sm:py-1.5 text-sm rounded-lg border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent touch-manipulation"
            >
              {brands.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1 flex items-center gap-1"><span className="text-blue-600 text-xs">📅</span> Yıl</div>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="w-full sm:min-w-[120px] px-2 py-2 sm:py-1.5 text-sm rounded-lg border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent touch-manipulation"
            >
              {years.map(y => (<option key={y} value={y}>{y}</option>))}
            </select>
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1 flex items-center gap-1"><span className="text-blue-600 text-xs">📆</span> Ay</div>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value, 10))}
              className="w-full sm:min-w-[160px] px-2 py-2 sm:py-1.5 text-sm rounded-lg border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent touch-manipulation"
            >
              {months.map(m => (<option key={m.value} value={m.value}>{m.label}</option>))}
            </select>
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1 flex items-center gap-1"><span className="text-blue-600 text-xs">🗓️</span> Gün</div>
            <select
              value={day}
              onChange={(e) => setDay(parseInt(e.target.value, 10))}
              className="w-full sm:min-w-[120px] px-2 py-2 sm:py-1.5 text-sm rounded-lg border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent touch-manipulation"
            >
              {Array.from({ length: daysInMonth }).map((_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}</option>
              ))}
            </select>
          </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 md:gap-4">
            <div className="flex-1 sm:flex-none">
              <KpiAddFormIsland categoryFilter={categoryFilter ?? DAILY_CATEGORY} />
            </div>
            <AutoSaveToggle />
          </div>
        </div>
      </div>

      {/* Seçili gün için KPI giriş formu */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-3 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-blue-600">📅</span>
            <h3 className="text-xs sm:text-sm font-medium text-gray-700">{year} / {months.find(m => m.value === month)?.label} / {day}. gün – KPI Veri Girişi</h3>
          </div>
          <div className="sm:ml-auto flex items-center" aria-live="polite" aria-atomic="true">
            {isSavingData ? (
              <span className={pillClass('blue')}>
                <span aria-hidden="true" className="mr-1">💾</span> Kaydediliyor…
              </span>
            ) : lastSavedAt ? (
              <span className={pillClass('green')}>
                <span aria-hidden="true" className="mr-1">✅</span> Kaydedildi {lastSavedAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            ) : null}
          </div>
        </div>
        <div className="p-3 sm:p-4">
          {loading ? (
            <div role="status" aria-live="polite" className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-50 border border-gray-200 rounded h-10" />
              ))}
              <div className="text-xs text-gray-500">Veriler yükleniyor…</div>
            </div>
          ) : kpis.length === 0 ? (
            <div className="flex items-center justify-center p-10">
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">📊</div>
                <p className="text-sm font-medium text-gray-900">Seçili markaya ait aktif KPI bulunmuyor</p>
                <p className="text-xs text-gray-500">Bu panelden yeni KPI ekleyebilir veya farklı marka seçebilirsiniz</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <table className="min-w-full table-fixed">
                  <thead>
                    <tr className="text-xs text-gray-700 border-b">
                      <th className="w-1/3 text-left py-2 px-2">KPI</th>
                      <th className="w-1/6 text-right py-2 px-2">Günlük</th>
                      <th className="w-1/6 text-right py-2 px-2">Kümülatif</th>
                      <th className="w-1/6 text-right py-2 px-2">Hedef</th>
                      <th className="w-1/6 text-right py-2 px-2">Gerçekleşen %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <SortableContext items={orderedKpis.map(k => k.id)} strategy={verticalListSortingStrategy}>
                      {orderedKpis.map((k, index) => {
                        const v: number | undefined = values[k.id]?.[day];
                        const isAutoDaily = k.calculation_type === 'cumulative' || k.calculation_type === 'formula' || k.calculation_type === 'target' || k.calculation_type === 'percentage';
                        const isDailyClosed = k.only_cumulative === true;
                        const targetVal = (k.calculation_type === 'target' || k.has_target_data === true) ? (targets[k.id] ?? null) : null;
                        return (
                          <MemoSortableDailyTableRow
                            key={k.id}
                            kpi={k}
                            index={index}
                            day={day}
                            v={v}
                            isAutoDaily={isAutoDaily}
                            isDailyClosed={isDailyClosed}
                            targetVal={targetVal}
                            cumulative={cumulative[k.id] || 0}
                            cumulativeOverride={cumulativeOverrides[k.id] ?? 0}
                            unit={unitById[k.id] ?? k.unit}
                            onChangeCell={onChangeCell}
                            onChangeCumulativeOverride={onChangeCumulativeOverride}
                            onChangeTarget={onChangeTarget}
                            onDelete={onDeleteKpi}
                            year={year}
                            month={month}
                          />
                        );
                      })}
                    </SortableContext>
                  </tbody>
                </table>
              </DndContext>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="text-xs text-gray-500" role="status" aria-live="polite">Yükleniyor...</div>
      )}
      {error && (
        <div className="text-xs text-red-600" role="alert" aria-live="assertive">{error}</div>
      )}
    </div>
  );
}

// Sortable row component for daily-entry grid (unused - kept for future use)
function _SortableDailyRow({
  kpi,
  index,
  day,
  v,
  isAutoDaily,
  isDailyClosed,
  targetVal,
  cumulative,
  cumulativeOverride,
  unit,
  onChangeCell,
  onChangeCumulativeOverride,
  onChangeTarget,
}: {
  kpi: Kpi;
  index: number;
  day: number;
  v: number | undefined;
  isAutoDaily: boolean;
  isDailyClosed: boolean;
  targetVal: number | null;
  cumulative: number;
  cumulativeOverride: number;
  unit?: string;
  onChangeCell: (kpiId: string, day: number, value: string) => void;
  onChangeCumulativeOverride: (kpiId: string, value: string) => void;
  onChangeTarget: (kpiId: string, value: string) => void;
  year: number;
  month: number;
}) {
  const [isDailyFocused, setIsDailyFocused] = useState(false);
  const [isCumulativeFocused, setIsCumulativeFocused] = useState(false);
  const [isTargetFocused, setIsTargetFocused] = useState(false);
  const { unitNorm, isTl, isPercent, unitLabel } = getUnitMeta(unit);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: kpi.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
  } as any;

  const isTarget = kpi.calculation_type === 'target' || kpi.has_target_data === true;
  const calcLabel = kpi.calculation_type === 'percentage' ? 'Yüzde' : kpi.calculation_type === 'cumulative' ? 'Kümülatif' : kpi.calculation_type === 'formula' ? 'Formül' : isTarget ? 'Hedef' : 'Doğrudan';
  const progressTarget = isTarget && targetVal && targetVal > 0 ? targetVal : null;
  const currentCum = kpi.only_cumulative === true ? (Number(cumulativeOverride) || 0) : (Number(cumulative) || 0);
  const progressPct = progressTarget ? Math.max(0, Math.round((currentCum / progressTarget) * 100)) : null;

  const dailyInputId = `daily-${kpi.id}-${day}`;
  const cumulativeInputId = `cum-${kpi.id}-${day}`;
  const targetInputId = `target-${kpi.id}-${day}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="row"
      className={`grid grid-cols-[minmax(16rem,20rem)_8rem_8rem_8rem_8rem] items-center gap-x-2 border-b px-2 py-1 ${
        isDragging ? 'bg-blue-50' : isOver ? 'bg-blue-50' : 'hover:bg-gray-50'
      }`}
    >
      {/* KPI adı + drag handle + küçük rozetler */}
      <div className="text-sm text-gray-800 flex items-center gap-2 min-w-0">
        <button
          {...attributes}
          {...listeners}
          aria-label="Sürükleyerek sıralamayı değiştirin"
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-100 text-gray-400 focus:outline-none"
          title="Sürükleyerek sıralamayı değiştirin"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
          </svg>
        </button>
        <span className="truncate font-medium" title={kpi.name}>{index + 1}. {kpi.name}</span>
        <span className="ml-1 inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{calcLabel}</span>
        {isDailyClosed ? (
          <span className="ml-1 inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-700" aria-label="Günlük girişi kapalı">Kapalı</span>
        ) : isAutoDaily ? (
          <span className="ml-1 inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700" aria-label="Günlük değeri otomatik">Otomatik</span>
        ) : null}
      </div>

      {/* Günlük sütunu */}
      {isDailyClosed ? (
        <div className="w-full px-2 py-1 text-xs rounded border border-gray-200 bg-gray-50 text-gray-500">Kapalı</div>
      ) : isAutoDaily ? (
        <div className="w-full px-2 py-1 text-xs rounded border border-gray-200 bg-gray-50 text-gray-500">Otomatik</div>
      ) : (
        <input
          id={dailyInputId}
          type="text"
          inputMode="decimal"
          value={v === undefined ? '' : (isDailyFocused ? formatRawInput(v) : (isTl ? formatCurrency(v) : formatNumber(v)))}
          onChange={(e) => onChangeCell(kpi.id, day, e.target.value)}
          onFocus={() => setIsDailyFocused(true)}
          onBlur={() => setIsDailyFocused(false)}
          className="w-full px-2 py-1 text-xs rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-right tabular-nums"
          aria-label="Günlük"
        />
      )}

      {/* Kümülatif sütunu */}
      {kpi.only_cumulative === true ? (
        <input
          id={cumulativeInputId}
          type="text"
          inputMode="decimal"
          value={cumulativeOverride != null ? (isCumulativeFocused ? formatRawInput(cumulativeOverride) : (isTl ? formatCurrency(cumulativeOverride) : formatNumber(cumulativeOverride))) : ''}
          onChange={(e) => onChangeCumulativeOverride(kpi.id, e.target.value)}
          onFocus={() => setIsCumulativeFocused(true)}
          onBlur={() => setIsCumulativeFocused(false)}
          aria-label="Kümülatif"
          className="w-full px-2 py-1 text-xs rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-right tabular-nums"
        />
      ) : (
        <input
          id={cumulativeInputId}
          type="text"
          value={currentCum ? (isTl ? formatCurrency(currentCum) : formatNumber(currentCum)) : ''}
          readOnly
          aria-label="Kümülatif"
          className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-gray-50 text-gray-700 text-right tabular-nums"
        />
      )}

      {/* Hedef sütunu */}
      {isTarget ? (
        <input
          id={targetInputId}
          type="text"
          inputMode="decimal"
          value={targetVal != null ? (isTargetFocused ? formatRawInput(targetVal) : (isTl ? formatCurrency(targetVal) : formatNumber(targetVal))) : ''}
          onChange={(e) => onChangeTarget(kpi.id, e.target.value)}
          onFocus={() => setIsTargetFocused(true)}
          onBlur={() => setIsTargetFocused(false)}
          placeholder="Hedef değeri"
          aria-label="Hedef"
          className="w-full px-2 py-1 text-xs rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-right tabular-nums"
        />
      ) : (
        <input
          id={targetInputId}
          type="text"
          value={''}
          readOnly
          disabled
          aria-label="Hedef"
          className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-gray-50 text-gray-700 text-right tabular-nums"
        />
      )}

      {/* Gerçekleşme % sütunu */}
      <input
        type="text"
        value={progressPct !== null ? `${progressPct}%` : ''}
        readOnly
        placeholder="-"
        aria-label="Gerçekleşme Oranı"
        className="w-full px-2 py-1 text-xs rounded border border-gray-200 bg-gray-50 text-gray-700 text-right tabular-nums"
      />
    </div>
  );
}

// Yeni kart tabanlı satır bileşeni
function SortableDailyCard({
  kpi,
  index,
  day,
  v,
  isAutoDaily,
  isDailyClosed,
  targetVal,
  cumulative,
  cumulativeOverride,
  unit,
  onChangeCell,
  onChangeCumulativeOverride,
  onChangeTarget,
  onDelete,
  year,
  month,
}: {
  kpi: Kpi;
  index: number;
  day: number;
  v: number | undefined;
  isAutoDaily: boolean;
  isDailyClosed: boolean;
  targetVal: number | null;
  cumulative: number;
  cumulativeOverride: number;
  unit?: string;
  onChangeCell: (kpiId: string, day: number, value: string) => void;
  onChangeCumulativeOverride: (kpiId: string, value: string) => void;
  onChangeTarget: (kpiId: string, value: string) => void;
  onDelete: (kpiId: string) => void;
  year: number;
  month: number;
}) {
  // Focus durumlarını takip et
  const [isDailyFocused, setIsDailyFocused] = useState(false);
  const [isCumulativeFocused, setIsCumulativeFocused] = useState(false);
  const [isTargetFocused, setIsTargetFocused] = useState(false);
  const { unitNorm, isTl, isPercent, unitLabel } = getUnitMeta(unit);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: kpi.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
  } as any;

  const isTarget = kpi.calculation_type === 'target' || kpi.has_target_data === true;
  const calcLabel = kpi.calculation_type === 'percentage' ? 'Yüzde' : kpi.calculation_type === 'cumulative' ? 'Kümülatif' : kpi.calculation_type === 'formula' ? 'Formül' : isTarget ? 'Hedef' : 'Doğrudan';
  const progressTarget = isTarget && targetVal && targetVal > 0 ? targetVal : null;
  const currentCum = kpi.only_cumulative === true ? (Number(cumulativeOverride) || 0) : (Number(cumulative) || 0);
  const progressPct = progressTarget ? Math.max(0, Math.round((currentCum / progressTarget) * 100)) : null;

  const dailyInputId = `daily-${kpi.id}-${day}`;
  const cumulativeInputId = `cum-${kpi.id}-${day}`;
  const targetInputId = `target-${kpi.id}-${day}`;

  const handleKeyNav = (e: React.KeyboardEvent<HTMLInputElement>, field: 'daily' | 'cumulative' | 'target') => {
    const key = e.key;
    const itemEl = (e.currentTarget.closest('[role="listitem"]') as HTMLElement) || undefined;
    if (!itemEl) return;
    const focusSameField = (sibling: Element | null) => {
      if (!sibling || !(sibling as HTMLElement)) return;
      const idPrefix = field === 'daily' ? 'daily-' : field === 'cumulative' ? 'cum-' : 'target-';
      const targetInput = (sibling as HTMLElement).querySelector(`input[id^="${idPrefix}"]`) as HTMLInputElement | null;
      if (targetInput) {
        // Önceki render tamamlandıktan sonra odakla; ani odak değişimiyle oluşan blur’u azaltır
        e.preventDefault();
        requestAnimationFrame(() => {
          targetInput.focus();
          targetInput.select?.();
        });
      }
    };
    if (key === 'ArrowDown') {
      focusSameField(itemEl.nextElementSibling);
    } else if (key === 'ArrowUp') {
      focusSameField(itemEl.previousElementSibling);
    }
    // Enter ile satır değiştirme devre dışı: beklenmeyen odak kayıplarını engeller
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="listitem"
      aria-label={`${kpi.name} – KPI kartı`}
      className={`group bg-white rounded-lg border border-violet-300 shadow-sm hover:shadow-md transition px-3 py-3 ${
        isDragging ? 'ring-2 ring-blue-300 bg-blue-50' : isOver ? 'ring-1 ring-blue-200' : ''
      }`}
    >
      {/* Üst başlık alanı: drag, isim, rozetler */}
      <div className="flex items-center gap-2 mb-3">
        <button
          {...attributes}
          {...listeners}
          aria-label="Sürükleyerek sıralamayı değiştirin"
          className="cursor-grab active:cursor-grabbing p-1.5 rounded hover:bg-gray-100 text-gray-400 focus:outline-none"
          title="Sürükleyerek sıralamayı değiştirin"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
          </svg>
        </button>
        <span className="truncate font-medium text-gray-900" title={kpi.name}>{index + 1}. {kpi.name}</span>
        <span className={`ml-1 ${pillClass('gray')}`} title={`Hesaplama türü: ${calcLabel}`}>{calcLabel}</span>
        {unitLabel ? (
          <span className={`ml-1 ${pillClass('gray')}`} title="Birim">
            {unitLabel}
          </span>
        ) : null}
        {isDailyClosed ? (
          <span className={`ml-1 ${pillClass('gray')}`} aria-label="Günlük girişi kapalı">Kapalı</span>
        ) : isAutoDaily ? (
          <span className={`ml-1 ${pillClass('blue')}`} aria-label="Günlük değeri otomatik">Otomatik</span>
        ) : null}
        {(() => {
          const overrideActive = (kpi.only_cumulative === true) || (cumulativeOverride ?? 0) !== (currentCum || 0);
          return overrideActive ? (
            <span className={`ml-1 ${pillClass('amber')}`} title="Manuel kümülatif değer">
              Override
            </span>
          ) : null;
        })()}
        {/* Sağ özet alanı ve aksiyonlar */}
        <div className="ml-auto flex items-center gap-3">
          {/* Özet rozetleri: hedef ve YTD/progress */}
          <div className="hidden md:flex items-center gap-2">
            <span className={pillClass('violet')}>
              <span aria-hidden="true" className="mr-1">🎯</span> {year} Ay Hedefi: {isTarget && targetVal != null ? targetVal : '—'}
            </span>
            {(() => {
              const pctClass = (
                progressPct == null
                  ? pillClass('gray')
                  : progressPct >= 100
                    ? pillClass('green')
                    : progressPct >= 80
                      ? pillClass('amber')
                      : pillClass('red')
              );
              return (
                <span className={pctClass}>
                  <span aria-hidden="true" className="mr-1">📈</span> Gerçekleşme %: {progressPct != null ? `${progressPct}%` : '—'}
                </span>
              );
            })()}
          </div>
          {/* Aksiyonlar */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onDelete(kpi.id)}
              className="p-1.5 rounded hover:bg-red-50 text-red-600 focus:outline-none"
              title="KPI'yı kaldır"
              aria-label="KPI'yı kaldır"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M6 2a1 1 0 0 0-1 1v1H3.5a.5.5 0 0 0 0 1H5h10h1.5a.5.5 0 0 0 0-1H15V3a1 1 0 0 0-1-1H6zm1 4a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-1.5 0v-7.5A.75.75 0 0 1 7 6zm6 0a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-1.5 0v-7.5A.75.75 0 0 1 13 6zM9.75 6a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-1.5 0v-7.5A.75.75 0 0 1 9.75 6z"/>
              </svg>
            </button>
            <button
              type="button"
              className="p-1.5 rounded hover:bg-gray-100 text-gray-600 focus:outline-none"
              title="Detay"
              aria-label="Detay"
              onClick={() => {
                try {
                  if (typeof window !== 'undefined') {
                    alert(`KPI Detay\nAd: ${kpi.name}\nTür: ${calcLabel}\nID: ${kpi.id}`);
                  }
                } catch {}
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M10 3a7 7 0 1 0 0 14A7 7 0 0 0 10 3zm0 2a5 5 0 0 1 0 10A5 5 0 0 1 10 5zm0 2a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0V8a1 1 0 0 0-1-1zm0 6.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Form alanları: 4 sütunlu grid */}
      <fieldset className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-labelledby={`legend-${kpi.id}`}>
        <legend id={`legend-${kpi.id}`} className="sr-only">{kpi.name} veri girişi</legend>
        <div>
          <label htmlFor={dailyInputId} className="block text-xs font-medium text-gray-700 mb-1">Günlük {(!isDailyClosed && !isAutoDaily) ? <span className="text-red-600" aria-hidden="true">*</span> : null}</label>
          {isDailyClosed ? (
            <div className="w-full px-2 py-1 text-xs rounded border border-gray-200 bg-gray-50 text-gray-500" id={`help-${dailyInputId}`}>Kapalı</div>
          ) : isAutoDaily ? (
            <div className="w-full px-2 py-1 text-xs rounded border border-gray-200 bg-gray-50 text-gray-500" id={`help-${dailyInputId}`}>Otomatik</div>
          ) : (
            <div className="relative">
              {isTl ? (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs" aria-hidden="true">₺</span>
              ) : null}
              {isPercent ? (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs" aria-hidden="true">%</span>
              ) : null}
              <input
                id={dailyInputId}
                type="text"
                inputMode="decimal"
                value={v === undefined ? '' : (isDailyFocused ? formatRawInput(v) : formatNumber(Number(v)))}
                onChange={(e) => onChangeCell(kpi.id, day, e.target.value)}
                onFocus={() => setIsDailyFocused(true)}
                onBlur={() => setIsDailyFocused(false)}
                onKeyDown={(e) => handleKeyNav(e, 'daily')}
                className={`w-full ${isTl ? 'pl-5' : ''} ${isPercent ? 'pr-5' : ''} px-2 py-1 text-xs rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-right tabular-nums`}
                aria-label="Günlük"
                aria-required={(!isDailyClosed && !isAutoDaily) ? true : undefined}
                required={(!isDailyClosed && !isAutoDaily) ? true : undefined}
                aria-describedby={`help-${dailyInputId}`}
              />
            </div>
          )}
        </div>

        <div>
          <label htmlFor={cumulativeInputId} className="block text-xs font-medium text-gray-700 mb-1">Kümülatif</label>
          {kpi.only_cumulative === true ? (
            <div className="relative">
              {isTl ? (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs" aria-hidden="true">₺</span>
              ) : null}
              {isPercent ? (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs" aria-hidden="true">%</span>
              ) : null}
              <input
                id={cumulativeInputId}
                type="text"
                inputMode="decimal"
                value={cumulativeOverride != null ? (isCumulativeFocused ? formatRawInput(cumulativeOverride) : formatNumber(Number(cumulativeOverride))) : ''}
                onChange={(e) => onChangeCumulativeOverride(kpi.id, e.target.value)}
                onFocus={() => setIsCumulativeFocused(true)}
                onBlur={() => setIsCumulativeFocused(false)}
                aria-label="Kümülatif"
                onKeyDown={(e) => handleKeyNav(e, 'cumulative')}
                className={`w-full ${isTl ? 'pl-5' : ''} ${isPercent ? 'pr-5' : ''} px-2 py-1 text-xs rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-right tabular-nums`}
              />
            </div>
          ) : (
            isTl ? (
              <div
                id={cumulativeInputId}
                aria-label="Kümülatif"
                className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-gray-50 text-gray-700 text-right"
              >
                {currentCum ? formatCurrency(currentCum) : '—'}
              </div>
            ) : (
              <input
                id={cumulativeInputId}
                type="text"
                value={currentCum ? formatNumber(currentCum) : ''}
                readOnly
                aria-label="Kümülatif"
                className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-gray-50 text-gray-700 text-right tabular-nums"
              />
            )
          )}
        </div>

        <div>
          <label htmlFor={targetInputId} className="block text-xs font-medium text-gray-700 mb-1">Hedef {isTarget ? <span className="text-red-600" aria-hidden="true">*</span> : null}</label>
          {isTarget ? (
            <div className="flex items-center justify-end gap-2">
              <div className="relative w-full">
                {isTl ? (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs" aria-hidden="true">₺</span>
                ) : null}
                {isPercent ? (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs" aria-hidden="true">%</span>
                ) : null}
                <input
                  id={targetInputId}
                  type="text"
                  inputMode="decimal"
                  value={targetVal != null ? (isTargetFocused ? formatRawInput(targetVal) : formatNumber(Number(targetVal))) : ''}
                  onChange={(e) => onChangeTarget(kpi.id, e.target.value)}
                  onFocus={() => setIsTargetFocused(true)}
                  onBlur={() => setIsTargetFocused(false)}
                  onKeyDown={(e) => handleKeyNav(e, 'target')}
                  placeholder="Hedef değeri"
                  aria-label="Hedef"
                  aria-required={true}
                  required
                  className={`w-full ${isTl ? 'pl-5' : ''} ${isPercent ? 'pr-5' : ''} px-2 py-1 text-xs rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-right tabular-nums`}
                />
              </div>
              {isTl && targetVal != null ? (
                <span className={`${pillClass('gray')} text-[10px]`} title="TL önizleme">
                  {targetVal ? formatCurrency(targetVal) : '—'}
                </span>
              ) : null}
            </div>
          ) : (
            <input
              id={targetInputId}
              type="text"
              value={''}
              readOnly
              disabled
              aria-label="Hedef"
              className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-gray-50 text-gray-700 text-right tabular-nums"
            />
          )}
        </div>

        <div>
          <span className="block text-xs font-medium text-gray-700 mb-1">Gerçekleşme %</span>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded bg-gray-100 overflow-hidden" title="İlerleme Çubuğu">
                <div
                  className="h-full bg-green-500"
                  style={{ width: progressPct !== null ? `${Math.min(progressPct, 100)}%` : '0%' }}
                  aria-hidden="true"
                />
              </div>
              <input
                type="text"
                value={progressPct !== null ? `${progressPct}%` : ''}
                readOnly
                placeholder="-"
                aria-label="Gerçekleşme Oranı"
                className={`w-20 px-2 py-1 text-xs rounded ${pillClass('gray')} text-right tabular-nums`}
              />
            </div>
        </div>
      </fieldset>
    </div>
  );
}

// Re-render azaltmak için shallow karşılaştırma
const _MemoSortableDailyCard = React.memo(SortableDailyCard, (prev, next) => {
  return (
    prev.kpi.id === next.kpi.id &&
    prev.kpi.name === next.kpi.name &&
    prev.kpi.calculation_type === next.kpi.calculation_type &&
    prev.kpi.only_cumulative === next.kpi.only_cumulative &&
    prev.index === next.index &&
    prev.day === next.day &&
    prev.year === next.year &&
    prev.month === next.month &&
    prev.v === next.v &&
    prev.isAutoDaily === next.isAutoDaily &&
    prev.isDailyClosed === next.isDailyClosed &&
    prev.targetVal === next.targetVal &&
    prev.cumulative === next.cumulative &&
    prev.cumulativeOverride === next.cumulativeOverride &&
    prev.unit === next.unit
  );
});

// Tablo satırı bileşeni: 5 sütunlu düzen
function SortableDailyTableRow({
  kpi,
  index,
  day,
  v,
  isAutoDaily,
  isDailyClosed,
  targetVal,
  cumulative,
  cumulativeOverride,
  unit,
  onChangeCell,
  onChangeCumulativeOverride,
  onChangeTarget,
  onDelete,
  year,
  month,
}: {
  kpi: Kpi;
  index: number;
  day: number;
  v: number | undefined;
  isAutoDaily: boolean;
  isDailyClosed: boolean;
  targetVal: number | null;
  cumulative: number;
  cumulativeOverride: number;
  unit?: string;
  onChangeCell: (kpiId: string, day: number, value: string) => void;
  onChangeCumulativeOverride: (kpiId: string, value: string) => void;
  onChangeTarget: (kpiId: string, value: string) => void;
  onDelete: (kpiId: string) => void;
  year: number;
  month: number;
}) {
  const [isDailyFocused, setIsDailyFocused] = useState(false);
  const [isCumulativeFocused, setIsCumulativeFocused] = useState(false);
  const [isTargetFocused, setIsTargetFocused] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: kpi.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
  };

  const isTarget = kpi.calculation_type === 'target' || kpi.has_target_data === true;
  const calcLabel = kpi.calculation_type === 'percentage' ? 'Yüzde' : kpi.calculation_type === 'cumulative' ? 'Kümülatif' : kpi.calculation_type === 'formula' ? 'Formül' : isTarget ? 'Hedef' : 'Doğrudan';
  const progressTarget = isTarget && targetVal && targetVal > 0 ? targetVal : null;
  const currentCum = kpi.only_cumulative === true ? (Number(cumulativeOverride) || 0) : (Number(cumulative) || 0);
  const { isTl: _isTl } = getUnitMeta(unit);
  const progressPct = progressTarget ? Math.max(0, Math.round((currentCum / progressTarget) * 100)) : null;

  const dailyInputId = `daily-${kpi.id}-${day}`;
  const cumulativeInputId = `cum-${kpi.id}-${day}`;
  const targetInputId = `target-${kpi.id}-${day}`;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`text-sm odd:bg-gray-50 hover:bg-gray-100 ${isDragging ? 'bg-blue-50' : isOver ? 'bg-blue-50' : ''}`}
    >
      {/* KPI hücresi */}
      <td className="py-2 px-2 align-middle sticky left-0 bg-white z-10">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            aria-label="Sürükleyerek sıralamayı değiştirin"
            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-100 text-gray-400 focus:outline-none"
            title="Sürükleyerek sıralamayı değiştirin"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
            </svg>
          </button>
          <span className="truncate font-medium text-gray-900" title={kpi.name}>{index + 1}. {kpi.name}</span>
          <span className={`ml-1 ${pillClass('gray')} text-[10px]`} title={`Hesaplama türü: ${calcLabel}`}>{calcLabel}</span>
          {unitLabel ? (
            <span className={`ml-1 ${pillClass('gray')} text-[10px]`} title="Birim">
              {unitLabel}
            </span>
          ) : null}
          {kpi.only_cumulative === true ? (
            <span className={`ml-1 ${pillClass('gray')} text-[10px]`}>Kapalı</span>
          ) : isAutoDaily ? (
            <span className={`ml-1 ${pillClass('blue')} text-[10px]`}>Otomatik</span>
          ) : null}
          {/* Override active check - kept for future use */}
          {(() => {
            const _overrideActive = (kpi.only_cumulative === true) || (cumulativeOverride ?? 0) !== (currentCum || 0);
            return null;
          })()}
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => onDelete(kpi.id)}
              className="p-1 rounded hover:bg-red-50 text-red-600 focus:outline-none"
              title="KPI'yı kaldır"
              aria-label="KPI'yı kaldır"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M6 2a1 1 0 0 0-1 1v1H3.5a.5.5 0 0 0 0 1H5h10h1.5a.5.5 0 0 0 0-1H15V3a1 1 0 0 0-1-1H6zm1 4a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-1.5 0v-7.5A.75.75 0 0 1 7 6zm6 0a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-1.5 0v-7.5A.75.75 0 0 1 13 6zM9.75 6a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-1.5 0v-7.5A.75.75 0 0 1 9.75 6z"/>
              </svg>
            </button>
          </div>
        </div>
      </td>

      {/* Günlük hücresi */}
      <td className="py-2 px-2 align-middle text-right tabular-nums">
        {isTarget ? (
          <div className="w-28" />
        ) : kpi.only_cumulative === true ? (
          <span className="text-xs text-gray-500">Kapalı</span>
        ) : isAutoDaily ? (
          <span className="text-xs text-gray-500">Otomatik</span>
        ) : (
          <div className="relative inline-block w-28">
            {isTl ? (
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]" aria-hidden="true">₺</span>
            ) : null}
            {isPercent ? (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]" aria-hidden="true">%</span>
            ) : null}
            <input
              id={dailyInputId}
              type="text"
              inputMode="decimal"
              value={v === undefined ? '' : (isDailyFocused ? formatRawInput(v) : formatNumber(Number(v)))}
              onChange={(e) => onChangeCell(kpi.id, day, e.target.value)}
              onFocus={() => setIsDailyFocused(true)}
              onBlur={() => setIsDailyFocused(false)}
              className={`w-full ${isTl ? 'pl-5' : ''} ${isPercent ? 'pr-5' : ''} px-2 py-1 text-xs rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-right tabular-nums`}
              aria-label="Günlük"
              title="Günlük değer"
            />
          </div>
        )}
      </td>

      {/* Kümülatif hücresi */}
      <td className="py-2 px-2 align-middle text-right tabular-nums">
        {kpi.only_cumulative === true ? (
          <div className="relative inline-block w-28">
            {isTl ? (
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]" aria-hidden="true">₺</span>
            ) : null}
            {isPercent ? (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]" aria-hidden="true">%</span>
            ) : null}
            <input
              id={cumulativeInputId}
              type="text"
              inputMode="decimal"
              value={cumulativeOverride != null ? (isCumulativeFocused ? formatRawInput(cumulativeOverride) : formatNumber(Number(cumulativeOverride))) : ''}
              onChange={(e) => onChangeCumulativeOverride(kpi.id, e.target.value)}
              onFocus={() => setIsCumulativeFocused(true)}
              onBlur={() => setIsCumulativeFocused(false)}
              aria-label="Kümülatif"
              className={`w-full ${isTl ? 'pl-5' : ''} ${isPercent ? 'pr-5' : ''} px-2 py-1 text-xs rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-right tabular-nums`}
            />
          </div>
        ) : (
          isTl ? (
            <div
              id={cumulativeInputId}
              aria-label="Kümülatif"
              className="inline-block w-28 px-2 py-1 text-xs rounded border border-gray-300 bg-gray-50 text-gray-700 text-right tabular-nums"
              title="Kümülatif toplam (otomatik)"
            >
                {currentCum ? formatCurrency(currentCum) : '—'}
            </div>
          ) : (
            <input
              id={cumulativeInputId}
              type="text"
              value={currentCum ? formatNumber(currentCum) : ''}
              readOnly
              aria-label="Kümülatif"
              className="w-28 px-2 py-1 text-xs rounded border border-gray-300 bg-gray-50 text-gray-700 text-right tabular-nums"
            />
          )
        )}
      </td>

      {/* Hedef hücresi */}
      <td className="py-2 px-2 align-middle text-right tabular-nums">
        {isTarget ? (
          <div className="relative inline-block w-28">
            {isTl ? (
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]" aria-hidden="true">₺</span>
            ) : null}
            {isPercent ? (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]" aria-hidden="true">%</span>
            ) : null}
            <input
              id={targetInputId}
              type="text"
              inputMode="decimal"
              value={targetVal != null ? (isTargetFocused ? formatRawInput(targetVal) : formatNumber(Number(targetVal))) : ''}
              onChange={(e) => onChangeTarget(kpi.id, e.target.value)}
              onFocus={() => setIsTargetFocused(true)}
              onBlur={() => setIsTargetFocused(false)}
              placeholder="Hedef"
              aria-label="Hedef"
              className={`w-full ${isTl ? 'pl-5' : ''} ${isPercent ? 'pr-5' : ''} px-2 py-1 text-xs rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-right tabular-nums`}
            />
          </div>
        ) : <div className="w-28"/>}
      </td>

      {/* Gerçekleşen % hücresi */}
      <td className="py-2 px-2 align-middle text-right">
        {(() => {
          const pctClass = (
            progressPct == null
              ? pillClass('gray')
              : progressPct >= 100
                ? pillClass('green')
                : progressPct >= 80
                  ? pillClass('amber')
                  : pillClass('red')
          );
          const pct = Math.min(100, Math.max(0, progressPct || 0));
          return (
            <div className="flex flex-col items-end">
              <input
                type="text"
                value={progressPct !== null ? `${progressPct}%` : ''}
                readOnly
                placeholder="-"
                aria-label="Gerçekleşme Oranı"
                className={`w-20 px-2 py-1 text-xs rounded ${pctClass} text-right tabular-nums`}
              />
              <div className="w-20 h-1 mt-1 rounded bg-gray-200 overflow-hidden" aria-hidden="true">
                <div
                  className={`h-1 ${progressPct == null ? 'bg-gray-300' : progressPct >= 100 ? 'bg-green-500' : progressPct >= 80 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })()}
      </td>
    </tr>
  );
}

const MemoSortableDailyTableRow = React.memo(SortableDailyTableRow, (prev, next) => {
  return (
    prev.kpi.id === next.kpi.id &&
    prev.index === next.index &&
    prev.day === next.day &&
    prev.year === next.year &&
    prev.month === next.month &&
    prev.v === next.v &&
    prev.isAutoDaily === next.isAutoDaily &&
    prev.isDailyClosed === next.isDailyClosed &&
    prev.targetVal === next.targetVal &&
    prev.cumulative === next.cumulative &&
    prev.cumulativeOverride === next.cumulativeOverride
  );
});