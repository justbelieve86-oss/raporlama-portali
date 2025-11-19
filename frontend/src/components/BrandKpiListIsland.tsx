import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  deleteBrandKpiMapping,
  getBrandKpiMappings,
  getKpiDetails,
  getBrandKpiYearlyTargets,
  getKpiMonthlyReportsForUser,
  deleteKpiReport,
  saveKpiReport,
  deleteBrandKpiYearlyTarget,
  saveBrandKpiYearlyTarget,
  verifyPassword as verifyPasswordApi,
} from '../services/api';
import type { BrandKpiMapping, KpiDetail, MonthlyReport, Target } from '../types/api';
import { getUserId } from '../lib/authHelpers';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { KpiCardSkeleton } from './ui/SkeletonLoader';
import ErrorAlert from './ui/ErrorAlert';
import { toUserFriendlyError, type FriendlyError } from '../lib/errorUtils';
import { QueryProvider } from './providers/QueryProvider';
import { logger } from '../lib/logger';
import { parseNumberInput } from '../lib/formatUtils';

type Kpi = { 
  id: string; 
  name: string; 
  category?: string; 
  unit?: string; 
  ytd_calc?: 'ortalama' | 'toplam';
  calculation_type?: 'direct' | 'percentage' | 'target';
  numerator_kpi_id?: string;
  denominator_kpi_id?: string;
  target?: string;
  has_target_data?: boolean;
  monthly_average?: boolean;
};
type Props = { brandId: string; year: number; reloadToken?: number; autoSave?: boolean; categoryFilter?: string };

function BrandKpiListIslandContent({ brandId, year, reloadToken = 0, autoSave = true, categoryFilter }: Props) {
  // Ensure brand ID is always a string
  const brandIdStr = String(brandId);
  
  // Normalize function for case-insensitive and trim-aware string comparison
  const normalize = (s: string | undefined | null): string => String(s || '').trim().toLowerCase();
  
  // Format number with thousand separators (Turkish format: 1.000, 10.000)
  const formatNumberForDisplay = (value: string | number | undefined): string => {
    if (value === undefined || value === null || value === '' || value === 0) return '';
    const cleanValue = String(value).replace(/\./g, '').replace(',', '.');
    const num = Number(cleanValue);
    if (Number.isNaN(num)) return String(value);
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(num);
  };

  // Clean formatted number (Türkçe format: virgül ondalık ayırıcı, nokta binlik ayırıcı)
  // Parse için: binlik ayırıcıları kaldır, virgülü noktaya çevir
  const cleanNumberInput = (raw: string): string => {
    const lastComma = raw.lastIndexOf(',');
    const lastDot = raw.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Virgül ondalık ayırıcı
      return raw.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
      // Nokta ondalık ayırıcı (legacy format)
      const parts = raw.split('.');
      if (parts.length > 1) {
        return parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
      } else {
        return raw.replace(/\./g, '');
      }
    } else {
      return raw.replace(/\./g, '');
    }
  };
  
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FriendlyError | null>(null);
  
  // Track focus states for all inputs (inputId -> isFocused)
  const [focusStates, setFocusStates] = useState<Record<string, boolean>>({});

  const monthNames = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
  const [valuesByKpi, setValuesByKpi] = useState<Record<string, Record<number, string>>>({});
  const [targetByKpi, setTargetByKpi] = useState<Record<string, string>>({});
  const [originalValuesByKpi, setOriginalValuesByKpi] = useState<Record<string, Record<number, string>>>({});
  const [originalTargetByKpi, setOriginalTargetByKpi] = useState<Record<string, string>>({});
  // Debounce zamanlayıcıları: hedef ve aylık değerler için ayrı saklarız
  const targetSaveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const valueSaveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [deleteModal, setDeleteModal] = useState<{ kpiId: string | null; step: 0 | 1 | 2 | 3; loading?: boolean; error?: string | null; password?: string }>({ kpiId: null, step: 0, loading: false, error: null, password: '' });

  const load = useCallback(async () => {
    if (!brandIdStr) {
      setKpis([]);
      setValuesByKpi({});
      setOriginalValuesByKpi({});
      setTargetByKpi({});
      setOriginalTargetByKpi({});
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const mappings = await getBrandKpiMappings(brandIdStr);
      const kpiIds = (mappings || []).map((m: BrandKpiMapping) => m.kpi_id);

      if (!kpiIds.length) {
        setKpis([]);
        setValuesByKpi({});
        setOriginalValuesByKpi({});
        setTargetByKpi({});
        setOriginalTargetByKpi({});
        return;
      }

      const [kpiDetails, targets, reports] = await Promise.all([
        getKpiDetails(kpiIds),
        getBrandKpiYearlyTargets(brandIdStr, year, kpiIds),
        getKpiMonthlyReportsForUser(brandIdStr, year, kpiIds),
      ]);

      let kpis: Kpi[] = (kpiDetails || []).map((r: KpiDetail) => ({ 
        id: String(r.id), 
        name: String(r.name), 
        category: r.category, 
        unit: r.unit, 
        ytd_calc: r.ytd_calc,
        calculation_type: r.calculation_type || 'direct',
        numerator_kpi_id: r.numerator_kpi_id ? String(r.numerator_kpi_id) : undefined,
        denominator_kpi_id: r.denominator_kpi_id ? String(r.denominator_kpi_id) : undefined,
        target: r.target == null ? undefined : String(r.target),
      }));

      // Kategori filtresi - MonthlyKpiOverviewIsland ile aynı mantık
      if (categoryFilter) {
        // İlk önce tam kategori eşleşmesi dene
        let filtered = kpis.filter(kpi => {
          const kpiCategory = String(kpi.category || '').trim();
          return kpiCategory === categoryFilter;
        });
        
        // Eğer tam eşleşme yoksa, normalize edilmiş eşleşme dene
        if (filtered.length === 0) {
          filtered = kpis.filter(kpi => {
            const kpiCategory = normalize(kpi.category || '');
            const filterCategory = normalize(categoryFilter);
            return kpiCategory === filterCategory;
          });
        }
        
        // Hala eşleşme yoksa, esnek eşleştirme yap (kategori adında anahtar kelime ara)
        if (filtered.length === 0) {
          const categoryKeywords: Record<string, string[]> = {
            'Satış': ['satış', 'sales'],
            'Satış - Aylık KPI': ['satış', 'sales', 'aylık'],
            'Servis': ['servis', 'service'],
            'Servis - Aylık KPI': ['servis', 'service', 'aylık'],
            'Kiralama': ['kiralama', 'rental'],
            'Kiralama - Aylık KPI': ['kiralama', 'rental', 'aylık'],
            'İkinci El': ['ikinci el', '2. el', 'second hand', 'second-hand'],
            'İkinci El - Aylık KPI': ['ikinci el', '2. el', 'second hand', 'second-hand', 'aylık'],
            'Ekspertiz': ['ekspertiz', 'expertise'],
            'Ekspertiz - Aylık KPI': ['ekspertiz', 'expertise', 'aylık'],
          };
          
          const selectedKeywords = categoryKeywords[categoryFilter] || [normalize(categoryFilter)];
          
          filtered = kpis.filter(k => {
            const kCategory = normalize(k.category || '');
            // Seçilen kategori anahtar kelimeleriyle eşleşiyor mu?
            return selectedKeywords.some(keyword => kCategory.includes(keyword));
          });
        }
        
        kpis = filtered;
      }
      setKpis(kpis);

      const values: Record<string, Record<number, string>> = {};
      kpis.forEach(k => { values[k.id] = {}; });
      (reports || []).forEach((report: MonthlyReport) => {
        if (!values[report.kpi_id]) values[report.kpi_id] = {};
        values[report.kpi_id][report.month] = String(report.value ?? '');
      });
      setValuesByKpi(values);
      setOriginalValuesByKpi(values);

      const targetsByKpi: Record<string, string> = {};
      (targets || []).forEach((target: Target) => {
        // Show empty string if target is null, undefined, or 0
        const targetVal = target.target;
        targetsByKpi[target.kpi_id] = (targetVal != null && targetVal !== 0) ? String(targetVal) : '';
      });
      kpis.forEach(k => {
        // All KPIs can have targets, initialize empty if not set
        if (!(k.id in targetsByKpi)) {
          // Show empty string if target is null, undefined, or 0
          const targetVal = k.target;
          // Convert to number for comparison if it's a string
          const targetNum = typeof targetVal === 'string' ? (parseNumberInput(targetVal) ?? null) : (typeof targetVal === 'number' ? targetVal : null);
          targetsByKpi[k.id] = (targetNum != null && !isNaN(targetNum) && targetNum !== 0) ? String(targetNum) : '';
        }
      });
      setTargetByKpi(targetsByKpi);
      setOriginalTargetByKpi(targetsByKpi);

    } catch (e: unknown) {
      logger.error('KPI list error', e);
      setError(toUserFriendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [brandIdStr, year, categoryFilter]);

  useEffect(() => {
    if (brandId) {
      // Always use string version of brandId
      load();
    } else {
      setKpis([]);
      setValuesByKpi({});
    }
    // Sayfa/marka/yıl değişiminde bekleyen zamanlayıcıları temizle
    return () => {
      try {
        Object.values(targetSaveTimersRef.current).forEach((t) => clearTimeout(t));
        targetSaveTimersRef.current = {};
        Object.values(valueSaveTimersRef.current).forEach((t) => clearTimeout(t));
        valueSaveTimersRef.current = {};
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandIdStr, year, reloadToken]);

  const saveValue = useCallback(async (kpiId: string, monthIndex: number, raw: string) => {
    try {
      const cleanRaw = cleanNumberInput(raw);
      const val = cleanRaw === '' ? null : Number(cleanRaw);
      
      if (val == null || Number.isNaN(val)) {
        await deleteKpiReport(brandIdStr, year, monthIndex, kpiId);

        setOriginalValuesByKpi(prev => ({
          ...prev,
          [kpiId]: { ...(prev[kpiId] || {}), [monthIndex]: '' }
        }));
      } else {
        await saveKpiReport(brandIdStr, year, monthIndex, kpiId, val);

        setOriginalValuesByKpi(prev => ({
          ...prev,
          [kpiId]: { ...(prev[kpiId] || {}), [monthIndex]: String(val) }
        }));
      }
    } catch (e: unknown) {
      logger.error('Value save error', e);
      setError(toUserFriendlyError(e));
    }
  }, [brandIdStr, year]);

  const saveTarget = useCallback(async (kpiId: string, raw: string) => {
    try {
      const cleanRaw = cleanNumberInput(raw).trim();
      const val = cleanRaw === '' ? null : Number(cleanRaw);
      if (!brandIdStr) return;
      // All KPIs can have target entry regardless of calculation type
      
      if (val == null || Number.isNaN(val) || val === 0) {
        await deleteBrandKpiYearlyTarget(brandIdStr, year, kpiId);

        setOriginalTargetByKpi(prev => ({ ...prev, [kpiId]: '' }));
      } else {
        await saveBrandKpiYearlyTarget(brandIdStr, year, kpiId, val);

        setOriginalTargetByKpi(prev => ({ ...prev, [kpiId]: String(val) }));
      }
    } catch (e) {
      logger.error('Target save error', e);
      setError(toUserFriendlyError(e));
    }
  }, [brandIdStr, year, kpis]);

  // Debounced kaydetme yardımcıları
  function scheduleSaveTarget(kpiId: string, raw: string, immediate = false) {
    // Önce mevcut zamanlayıcıyı iptal et
    const prev = targetSaveTimersRef.current[kpiId];
    if (prev) {
      clearTimeout(prev);
      delete targetSaveTimersRef.current[kpiId];
    }
    const run = () => {
      saveTarget(kpiId, raw);
    };
    if (immediate) {
      run();
      return;
    }
    const timer = setTimeout(run, 300);
    targetSaveTimersRef.current[kpiId] = timer;
  }

  function scheduleSaveValue(kpiId: string, monthIndex: number, raw: string, immediate = false) {
    const key = `${kpiId}-${monthIndex}`;
    const prev = valueSaveTimersRef.current[key];
    if (prev) {
      clearTimeout(prev);
      delete valueSaveTimersRef.current[key];
    }
    const run = () => {
      saveValue(kpiId, monthIndex, raw);
    };
    if (immediate) {
      run();
      return;
    }
    const timer = setTimeout(run, 300);
    valueSaveTimersRef.current[key] = timer;
  }

  function normalizeNumericInput(raw: string | undefined): string {
    const s = (raw ?? '').trim();
    if (s === '') return '';
    const n = parseNumberInput(s) ?? 0;
    if (Number.isNaN(n)) return s;
    return String(n);
  }

  function isDirty(kpiId: string): boolean {
    // target
    const tCurr = normalizeNumericInput(targetByKpi[kpiId]);
    const tOrig = normalizeNumericInput(originalTargetByKpi[kpiId]);
    if (tCurr !== tOrig) return true;
    // months
    const curr = valuesByKpi[kpiId] || {};
    const orig = originalValuesByKpi[kpiId] || {};
    for (let m = 1; m <= 12; m++) {
      const c = normalizeNumericInput(curr[m]);
      const o = normalizeNumericInput(orig[m]);
      if (c !== o) return true;
    }
    return false;
  }

  async function saveKpi(kpiId: string) {
    try {
      // All KPIs can have target entry regardless of calculation type
      // Save target
      await saveTarget(kpiId, targetByKpi[kpiId] ?? '');
      // Save monthly values (1..12)
      const current = valuesByKpi[kpiId] || {};
      for (let monthIndex = 1; monthIndex <= 12; monthIndex++) {
        const raw = current[monthIndex] ?? '';
        // when autoSave is off, persist all current inputs
        await saveValue(kpiId, monthIndex, raw);
      }
      // After successful save, align originals to current so button disables
      setOriginalTargetByKpi(prev => ({ ...prev, [kpiId]: targetByKpi[kpiId] ?? '' }));
      setOriginalValuesByKpi(prev => ({
        ...prev,
        [kpiId]: { ...current }
      }));
    } catch (e) {
      logger.error('KPI kaydetme hatası', e);
      setError(toUserFriendlyError(e));
    }
  }

  const { user } = useCurrentUser();

  const verifyPassword = useCallback(async (password: string): Promise<boolean> => {
    try {
      if (!user?.email || !password) {
        return false;
      }
      const { verified } = await verifyPasswordApi(password);
      return verified;
    } catch (e) {
      logger.error('Şifre doğrulama işleminde hata', e);
      return false;
    }
  }, [user]);

  async function performDeleteKpi(kpiId: string) {
    try {
      setDeleteModal(prev => ({ ...prev, loading: true, error: null }));
      const userId = await getUserId();
      if (!userId || !brandId) {
        setDeleteModal(prev => ({ ...prev, loading: false }));
        return;
      }

      // The API call now handles deleting the mapping and all associated data.
      // This is a single transaction on the backend.
      await deleteBrandKpiMapping(brandIdStr, kpiId);

      // Reload data
      load();
      // Update local UI state: remove KPI and its values/targets
      setKpis(prev => prev.filter(k => k.id !== kpiId));
      setValuesByKpi(prev => { const next = { ...prev }; delete next[kpiId]; return next; });
      setOriginalValuesByKpi(prev => { const next = { ...prev }; delete next[kpiId]; return next; });
      setTargetByKpi(prev => { const next = { ...prev }; delete next[kpiId]; return next; });
      setOriginalTargetByKpi(prev => { const next = { ...prev }; delete next[kpiId]; return next; });

      setDeleteModal({ kpiId: null, step: 0, loading: false, error: null, password: '' });

      // Notify other UI (e.g., add form) that a KPI was removed for this brand
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('brand-kpi-removed', { detail: { brandId, kpiId } }));
        }
      } catch {}
    } catch (e: unknown) {
      logger.error('KPI silme hatası', e);
      setDeleteModal(prev => ({ ...prev, loading: false, error: e?.message ?? 'Silme işleminde hata oluştu.' }));
    }
  }

  function renderDeleteModal() {
    if (deleteModal.step === 0) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-transparent backdrop-blur-md supports-[backdrop-filter]:bg-white/5"></div>
        <div className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-lg animate-fadeInUp ring-1 ring-black/5">
          <div className="px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">KPI Silme Onayı</h3>
              <button className="w-8 h-8 rounded-lg border border-slate-200 bg-white" onClick={() => { if (!deleteModal.loading) setDeleteModal({ kpiId: null, step: 0, loading: false, error: null, password: '' }); }}>✕</button>
            </div>
          </div>
          <div className="p-4 space-y-4">
            {deleteModal.step === 1 && (
              <p className="text-sm text-slate-700">Bu KPI kaldırılacak ve bu marka için tüm yıl(lar)a ait aylık değerler ile hedefler topluca silinecek. Devam etmek istiyor musunuz?</p>
            )}
            {deleteModal.step === 2 && (
              <p className="text-sm text-red-700">Bu işlem geri alınamaz. Kesinlikle silmek istediğinize emin misiniz?</p>
            )}
            {deleteModal.step === 3 && (
              <div className="space-y-3">
                <p className="text-sm text-red-700">Güvenlik için lütfen mevcut şifrenizi girin:</p>
                <input
                  type="password"
                  placeholder="Şifrenizi girin"
                  value={deleteModal.password || ''}
                  onChange={(e) => setDeleteModal(prev => ({ ...prev, password: e.target.value, error: null }))}
                  autoComplete="current-password"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  disabled={deleteModal.loading}
                  autoFocus
                />
              </div>
            )}
            {deleteModal.error && (
              <div className="text-xs text-red-600">{deleteModal.error}</div>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" className="px-3 py-2 rounded-lg border border-slate-200" disabled={deleteModal.loading} onClick={() => setDeleteModal({ kpiId: null, step: 0, loading: false, error: null, password: '' })}>İptal</button>
              {deleteModal.step === 1 && (
                <button type="button" className="px-3 py-2 rounded-lg text-white bg-violet-600" disabled={deleteModal.loading} onClick={() => setDeleteModal(prev => ({ ...prev, step: 2 }))}>Devam Et</button>
              )}
              {deleteModal.step === 2 && (
                <button type="button" className="px-3 py-2 rounded-lg text-white bg-orange-600" disabled={deleteModal.loading} onClick={() => setDeleteModal(prev => ({ ...prev, step: 3 }))}>Şifre Gir</button>
              )}
              {deleteModal.step === 3 && (
                <button 
                  type="button" 
                  className="px-3 py-2 rounded-lg text-white bg-red-600" 
                  disabled={deleteModal.loading || !deleteModal.password?.trim()} 
                  onClick={async () => {
                    if (!deleteModal.password?.trim() || !deleteModal.kpiId) return;
                    
                    setDeleteModal(prev => ({ ...prev, loading: true, error: null }));
                    
                    const isPasswordValid = await verifyPassword(deleteModal.password);
                    if (!isPasswordValid) {
                      setDeleteModal(prev => ({ ...prev, loading: false, error: 'Şifre yanlış. Lütfen tekrar deneyin.' }));
                      return;
                    }
                    
                    performDeleteKpi(deleteModal.kpiId);
                  }}
                >
                  {deleteModal.loading ? 'Siliniyor...' : 'Evet, Sil'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function computeYtd(kpi: Kpi): number {
    // For percentage/ratio KPIs, calculate from numerator/denominator
    if (kpi.calculation_type === 'percentage' && kpi.numerator_kpi_id && kpi.denominator_kpi_id) {
      const numeratorYtd = computeDirectYtd(kpi.numerator_kpi_id);
      const denominatorYtd = computeDirectYtd(kpi.denominator_kpi_id);
      if (denominatorYtd === 0) return 0;
      const val = numeratorYtd / denominatorYtd;
      return (kpi.unit === '%') ? (val * 100) : val;
    }
    // For target KPIs, there are no monthly values to aggregate
    if (kpi.calculation_type === 'target' && kpi.has_target_data !== true) {
      return 0;
    }
    
    // For direct KPIs, use existing logic
    return computeDirectYtd(kpi.id);
  }

  function computeDirectYtd(kpiId: string): number {
    const kpi = kpis.find(k => k.id === kpiId);
    const vals = valuesByKpi[kpiId] || {};
    const monthsUpTo = new Date().getFullYear() === year ? new Date().getMonth() + 1 : 12;
    const arr: number[] = [];
    for (let m = 1; m <= monthsUpTo; m++) {
      const v = vals[m];
      if (v !== undefined && v !== '') {
        const n = parseNumberInput(String(v)) ?? 0;
        if (!Number.isNaN(n)) arr.push(n);
      }
    }
    if (arr.length === 0) return 0;
    if (kpi?.ytd_calc === 'toplam') return arr.reduce((a, b) => a + b, 0);
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function computePercentageValue(kpi: Kpi, monthIndex: number): string {
    if (kpi.calculation_type !== 'percentage' || !kpi.numerator_kpi_id || !kpi.denominator_kpi_id) {
      return '';
    }
    const nVal = valuesByKpi[kpi.numerator_kpi_id]?.[monthIndex] ?? '';
    const dVal = valuesByKpi[kpi.denominator_kpi_id]?.[monthIndex] ?? '';
    if (nVal === '' || dVal === '') return '';
    const n = parseNumberInput(String(nVal)) ?? 0;
    const d = parseNumberInput(String(dVal)) ?? 0;
    if (Number.isNaN(n) || Number.isNaN(d) || d === 0) return '';
    const val = n / d;
    const scaled = (kpi.unit === '%') ? (val * 100) : val;
    return scaled.toFixed(2);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <KpiCardSkeleton key={index} animate={true} />
        ))}
      </div>
    );
  }
  if (error) {
    const details = [
      typeof error.status === 'number' ? `Durum: ${error.status}` : null,
      error.code ? `Kod: ${error.code}` : null,
    ].filter(Boolean).join(' | ');
    return (
      <ErrorAlert
        title="KPI’ler yüklenemedi"
        message={error.message}
        details={details || undefined}
        onRetry={() => load()}
      />
    );
  }

  if (!kpis.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="text-sm text-slate-600">Seçili markaya ait aktif KPI bulunmuyor. Lütfen “Yeni KPI Ekle” ile ekleyin.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {kpis.map((kpi) => (
        <div key={kpi.id} className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="h-1 rounded-t-xl bg-violet-600"></div>
          <div className="p-4 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <h2 className="text-base font-semibold">{kpi.name}</h2>
                {kpi.category && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-violet-600 text-white">{kpi.category}</span>}
                {kpi.calculation_type === 'percentage' && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                    📊 Otomatik Hesaplanan
                  </span>
                )}
                {kpi.unit && <span className="text-xs text-slate-500">({kpi.unit})</span>}
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <div className="text-[10px] text-slate-500">{year} HEDEF</div>
                <input
                  value={(targetByKpi[kpi.id] && targetByKpi[kpi.id] !== '0') ? targetByKpi[kpi.id] : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTargetByKpi(prev => ({ ...prev, [kpi.id]: val }));
                    if (autoSave) scheduleSaveTarget(kpi.id, val);
                  }}
                  onBlur={(e) => { if (autoSave) scheduleSaveTarget(kpi.id, e.target.value, true); }}
                  placeholder="Hedef"
                  className="w-28 px-3 py-2 text-sm rounded-lg border shadow-sm text-right border-slate-200 bg-white"
                />
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-500">{year} YTD {kpi.ytd_calc === 'toplam' ? 'Toplam' : 'Ortalama'}</div>
                <div className="text-sm font-semibold text-emerald-600">{computeYtd(kpi).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              {!autoSave ? (
                <button
                  className={isDirty(kpi.id) ? 'w-8 h-8 rounded-lg border border-slate-200 bg-white shadow-sm' : 'w-8 h-8 rounded-lg border border-slate-200 bg-white shadow-sm opacity-50 cursor-not-allowed'}
                  onClick={() => { if (isDirty(kpi.id)) saveKpi(kpi.id); }}
                  disabled={!isDirty(kpi.id)}
                  title="KPI için değişiklikleri kaydet"
                  type="button"
                >💾</button>
              ) : null}
              <button
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white shadow-sm"
                onClick={() => setDeleteModal({ kpiId: kpi.id, step: 1, loading: false, error: null, password: '' })}
                title="KPI’ı kaldır (tüm hedef ve aylık veriler silinir)"
              >🗑️</button>
            </div>
          </div>
          <div className="px-4 pb-4 overflow-x-auto">
            <div className="min-w-[960px] grid grid-cols-12 gap-3">
              {monthNames.map((m, idx) => {
                const monthIndex = idx + 1;
                const isDisabledKpi = kpi.calculation_type === 'percentage' || (kpi.calculation_type === 'target' && kpi.has_target_data !== true);
                const rawValue = kpi.calculation_type === 'percentage' 
                  ? computePercentageValue(kpi, monthIndex)
                  : (isDisabledKpi ? '' : (valuesByKpi[kpi.id]?.[monthIndex] ?? ''));
                
                // Track focus state for each input
                const inputId = `kpi-${kpi.id}-month-${monthIndex}`;
                const isFocused = focusStates[inputId] || false;
                
                // Format value for display (with thousand separators when not focused)
                const displayValue = isDisabledKpi 
                  ? rawValue 
                  : (isFocused 
                      ? rawValue 
                      : (rawValue === '' ? '' : formatNumberForDisplay(rawValue)));
                
                return (
                  <div key={m}>
                    <div className="text-[11px] text-slate-500 mb-1">{m}</div>
                    <input
                      id={inputId}
                      type="text"
                      inputMode="decimal"
                      value={displayValue}
                      onChange={isDisabledKpi ? undefined : (e) => {
                        const newValue = e.target.value;
                        setValuesByKpi((prev) => ({
                          ...prev,
                          [kpi.id]: { ...(prev[kpi.id] || {}), [monthIndex]: newValue }
                        }));
                        if (autoSave) scheduleSaveValue(kpi.id, monthIndex, newValue);
                      }}
                      onFocus={() => setFocusStates(prev => ({ ...prev, [inputId]: true }))}
                      onBlur={(e) => {
                        setFocusStates(prev => ({ ...prev, [inputId]: false }));
                        if (!isDisabledKpi && autoSave) {
                          scheduleSaveValue(kpi.id, monthIndex, e.target.value, true);
                        }
                      }}
                      disabled={isDisabledKpi}
                      readOnly={isDisabledKpi}
                      placeholder={kpi.calculation_type === 'percentage' ? "Otomatik hesaplanır" : (kpi.calculation_type === 'target' && kpi.has_target_data !== true ? "Hedef KPI" : "")}
                      className={`w-full px-3 py-2 text-sm rounded-lg border shadow-sm text-right tabular-nums ${
                        isDisabledKpi 
                          ? 'border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed' 
                          : 'border-slate-200 bg-white'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    {renderDeleteModal()}
    </div>
    );
}

export default function BrandKpiListIsland(props: Props) {
  return (
    <QueryProvider>
      <BrandKpiListIslandContent {...props} />
    </QueryProvider>
  );
}