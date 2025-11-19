import React, { useEffect, useMemo, useState } from 'react';
import supabase from '../lib/supabase';
import SkeletonLoader from './ui/SkeletonLoader';
import ErrorAlert from './ui/ErrorAlert';
import { toUserFriendlyError, type FriendlyError } from '../lib/errorUtils';
import { getBrandKpiMappings, addBrandKpiMapping } from '../services/api';
import type { BrandKpiMapping, Kpi } from '../types/api';
import { logger } from '../lib/logger';

// Kpi type is imported from '../types/api' (line 7), no need to redefine
type Props = { brandId?: string; onAdded?: (args: { brandId: string; kpiId: string }) => void; categoryFilter?: string };

export default function KpiAddFormIsland({ brandId: brandIdProp, onAdded, categoryFilter = 'Satış' }: Props) {
  const normalize = (s: string | undefined | null): string => String(s || '').trim().toLowerCase();
  // Kategori adı eşlemeleri: UI’da kullanılan isimleri veritabanındaki mevcut isimlere bağla
  const resolveCategoryAlias = (s: string): string => {
    const key = normalize(s);
    const map: Record<string, string> = {
      [normalize('2. El Satış - Günlük KPI')]: 'İkinci El - Günlük KPI',
      [normalize('İkinci El Satış - Günlük KPI')]: 'İkinci El - Günlük KPI',
      [normalize('2. El - Günlük KPI')]: 'İkinci El - Günlük KPI',
    };
    return map[key] || s;
  };
  const [open, setOpen] = useState(false);
  const [kpis, setKpis] = useState<Kpi[] | null>(null);
  const [error, setError] = useState<FriendlyError | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('');
  const [success, setSuccess] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([categoryFilter]);
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryFilter);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [existingKpiIds, setExistingKpiIds] = useState<string[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    const load = async () => {
      if (window.location.pathname === '/login') return;
      try {
        setLoading(true);
        setError(null);
        // UI’dan gelen kategori filtresini veritabanı için kanonik ada çevir
        const canonicalFilter = resolveCategoryAlias(categoryFilter);
        const [kpiRes, catRes] = await Promise.all([
          supabase
            .from('kpis')
            .select('id,name,category,unit,status,ytd_calc')
            .order('name', { ascending: true }),
          supabase
            .from('kpi_categories')
            .select('name')
            .order('name', { ascending: true })
        ]);
        if (kpiRes.error) throw kpiRes.error;
        type KpiRow = { id: string; name: string; category?: string };
        const mapped: Kpi[] = (kpiRes.data || []).map((row: KpiRow) => ({ id: String(row.id), name: String(row.name), category: String(row.category || '') }));

        // Sadece belirtilen kategorideki KPI'ları filtrele (case-insensitive ve trim)
        const filteredByCategory = mapped.filter(kpi => normalize(kpi.category) === normalize(canonicalFilter));
        setKpis(filteredByCategory);
        
        let cats: string[] = [];
        if (!catRes.error && Array.isArray(catRes.data)) {
          cats = (catRes.data || [])
            .map((r: { name?: string }) => (typeof r?.name === 'string' ? r.name : ''))
            .filter((s: string): s is string => s.length > 0 && normalize(s) === normalize(canonicalFilter));
        }
        if (!cats.length) {
          // Sadece belirtilen kategoriyi ekle
          // UI’da istenen adı göster (kanonik ad yerine)
          cats = [categoryFilter];
        }
        setCategories(cats);

        // Fetch existing KPI ids already added for this brand (common list from brand_kpi_mappings or aggregated from all users)
        const brandId = brandIdProp || ((typeof window !== 'undefined' && localStorage.getItem('selectedBrandId')) || '');
        if (brandId) {
          try {
            // Use the common KPI mappings endpoint which returns all KPIs for the brand (from brand_kpi_mappings or aggregated from all user_brand_kpis)
            const mappings = await getBrandKpiMappings(brandId);
            const ids = (mappings || []).map((r: BrandKpiMapping) => String(r.kpi_id || r.id || '')).filter((id: string) => id.length > 0);
            setExistingKpiIds(ids);
          } catch (err: unknown) {
            logger.warn('Failed to fetch existing KPI mappings', err);
            setExistingKpiIds([]);
          }
        } else {
          setExistingKpiIds([]);
        }
      } catch (err: unknown) {
        setError(toUserFriendlyError(err));
        setKpis([]);
        setExistingKpiIds([]);
      } finally {
        setLoading(false);
      }
    };
    if (open && kpis === null && !loading) {
      load();
    }
  }, [open, brandIdProp]);

  // Refresh existing KPI ids for current brand whenever the modal opens
  useEffect(() => {
    const refreshExisting = async () => {
      if (window.location.pathname === '/login') return;
      try {
        const brandId = brandIdProp || ((typeof window !== 'undefined' && localStorage.getItem('selectedBrandId')) || '');
        if (brandId) {
          // Use the common KPI mappings endpoint which returns all KPIs for the brand (from brand_kpi_mappings or aggregated from all user_brand_kpis)
          const mappings = await getBrandKpiMappings(brandId);
          const ids = (mappings || []).map((r: BrandKpiMapping) => String(r.kpi_id || r.id || '')).filter((id: string) => id.length > 0);
          setExistingKpiIds(ids);
        } else {
          setExistingKpiIds([]);
        }
      } catch (err: unknown) {
        logger.warn('Failed to refresh existing KPI mappings', err);
        setExistingKpiIds([]);
      }
    };
    if (open) {
      refreshExisting();
    }
  }, [open, brandIdProp]);

  // Listen for deletion events to re-include KPIs live while the modal is open
  useEffect(() => {
    if (!open) return;
    const handler = (e: React.ChangeEvent<HTMLInputElement>) => {
      try {
        const detail = e?.detail || {};
        const removedBrandId = String(detail?.brandId || '');
        const removedKpiId = String(detail?.kpiId || '');
        const brandId = brandIdProp || ((typeof window !== 'undefined' && localStorage.getItem('selectedBrandId')) || '');
        if (removedKpiId && removedBrandId && brandId && String(removedBrandId) === String(brandId)) {
          setExistingKpiIds(prev => prev.filter(id => id !== removedKpiId));
        }
      } catch {}
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('brand-kpi-removed', handler as any);
    }
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('brand-kpi-removed', handler as any);
    };
  }, [open, brandIdProp]);

  const filteredKpis = useMemo<Kpi[]>(() => {
    const arr: Kpi[] = Array.isArray(kpis) ? (kpis as Kpi[]) : [];
    // KPI'lar zaten kategoriye göre filtrelenmiş durumda, sadece mevcut olanları çıkar
    const existingSet = new Set(existingKpiIds.map(String));
    const withoutExisting = arr.filter((k: Kpi) => !existingSet.has(k.id));
    const term = searchTerm.trim().toLowerCase();
    if (!term) return withoutExisting;
    return withoutExisting.filter((k: Kpi) => {
      const name = (k.name || '').toLowerCase();
      const category = (k.category || '').toLowerCase();
      return name.includes(term) || category.includes(term);
    });
  }, [kpis, existingKpiIds, searchTerm]);

  const totalPages = useMemo<number>(() => {
    const count = filteredKpis.length;
    return Math.max(1, Math.ceil(count / pageSize));
  }, [filteredKpis.length, pageSize]);

  const pagedKpis = useMemo<Kpi[]>(() => {
    const start = (page - 1) * pageSize;
    return filteredKpis.slice(start, start + pageSize);
  }, [filteredKpis, page, pageSize]);

  useEffect(() => {
    // Filtre/arama veya sayfa boyutu değiştiğinde ilk sayfaya dön
    setPage(1);
  }, [selectedCategory, searchTerm, pageSize]);

  useEffect(() => {
    // Toplam sayfa değiştiğinde mevcut sayfayı sınırla
    setPage(p => Math.min(p, totalPages));
  }, [totalPages]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    if (!selectedId) {
      setError(toUserFriendlyError(new Error('Lütfen bir KPI seçin.')));
      return;
    }
    if (existingKpiIds.includes(selectedId)) {
      setError(toUserFriendlyError(new Error('Bu marka için bu KPI zaten ekli.')));
      return;
    }
    const chosen = (kpis || []).find((k: Kpi) => k.id === selectedId);
    const brandId = brandIdProp || ((typeof window !== 'undefined' && localStorage.getItem('selectedBrandId')) || '');

    if (!brandId) {
      setError(toUserFriendlyError(new Error('Lütfen önce bir marka seçin.')));
      return;
    }

    // Use the common KPI mapping endpoint which adds to brand_kpi_mappings (or falls back to user_brand_kpis)
    try {
      await addBrandKpiMapping(brandId, selectedId);
    } catch (insertErr: unknown) {
      setError(toUserFriendlyError(insertErr));
      return;
    }

    // Notify parent to refresh
    onAdded?.({ brandId, kpiId: selectedId });

    // Broadcast global event so other islands can refresh
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('brand-kpi-added', { detail: { brandId, kpiId: selectedId } }));
      }
    } catch {}

    setSuccess(`KPI eklendi: ${chosen?.name ?? selectedId}`);
    // Immediately prevent duplicate selection by updating local existing ids
    setExistingKpiIds(prev => [...prev, selectedId]);
    // Clear selection to allow adding another KPI without closing the form
    setSelectedId('');
    // Clear success message after 3 seconds (form stays open)
    setTimeout(() => {
      setSuccess(null);
    }, 3000);
  };

  return (
    <div className="inline-flex items-center space-x-3">
      {/* Trigger Button (matches existing style) */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg bg-violet-600 text-white shadow hover:bg-violet-700"
      >
        <span className="text-lg leading-none">+</span>
        <span className="text-sm">Yeni KPI Ekle</span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-transparent backdrop-blur-md supports-[backdrop-filter]:bg-white/5" onClick={() => setOpen(false)}></div>
          <div className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-lg animate-fadeInUp ring-1 ring-black/5">
            <div className="px-4 py-3 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">KPI Ekle</h3>
                <button className="w-8 h-8 rounded-lg border border-slate-200 bg-white" onClick={() => setOpen(false)}>✕</button>
              </div>
            </div>
            <form onSubmit={onSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label htmlFor="kpiSearch" className="block text-xs text-slate-500 mb-1">Arama</label>
                  <input
                    id="kpiSearch"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="KPI adı veya kategori..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">KPI Listesi</label>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <label htmlFor="pageSize" className="text-xs text-slate-500">Sayfa boyutu</label>
                      <select
                        id="pageSize"
                        value={pageSize}
                        onChange={e => setPageSize(Number(e.target.value))}
                        className="px-2 py-1 text-xs rounded-md border border-slate-200 bg-white"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className={`px-2 py-1 rounded-md border text-xs ${page <= 1 ? 'border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-300 hover:bg-slate-50'}`}
                      >
                        Önceki
                      </button>
                      <span className="text-xs text-slate-600">Sayfa {page}/{totalPages}</span>
                      <button
                        type="button"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className={`px-2 py-1 rounded-md border text-xs ${page >= totalPages ? 'border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-300 hover:bg-slate-50'}`}
                      >
                        Sonraki
                      </button>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200">
                    {loading && (
                      <div className="p-3 space-y-2">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <SkeletonLoader variant="circular" width={8} height={8} />
                              <SkeletonLoader width="120px" height="16px" />
                              <SkeletonLoader width="60px" height="12px" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {!loading && filteredKpis.length === 0 && (
                      <div className="p-3 text-xs text-slate-500">KPI bulunamadı</div>
                    )}
                    {!loading && filteredKpis.length > 0 && (
                      <ul>
                        {pagedKpis.map((k: Kpi) => {
                          const active = selectedId === k.id;
                          return (
                            <li key={k.id}>
                              <button
                                type="button"
                                onClick={() => setSelectedId(k.id)}
                                className={
                                  `w-full flex items-center justify-between px-3 py-2 text-sm ${
                                    active ? 'bg-violet-50 text-violet-700' : 'bg-white text-slate-800'
                                  } border-b border-slate-200 hover:bg-slate-50`
                                }
                              >
                                <span className="flex items-center gap-2">
                                  <span className="inline-block w-2 h-2 rounded-full bg-violet-400"></span>
                                  <span className="font-medium">{k.name}</span>
                                  {k.category && (
                                    <span className="text-xs text-slate-500">({k.category})</span>
                                  )}
                                </span>
                                {active && <span className="text-xs">Seçildi</span>}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
              {error && (
                <ErrorAlert
                  title="KPI’ler yüklenemedi"
                  message={error.message}
                  details={(error.status ? `Durum: ${error.status}` : '') || undefined}
                  onRetry={() => {
                    // Modal açıkken listeyi yeniden yüklemeye zorlar
                    setKpis(null);
                  }}
                />
              )}
              {success && <div className="text-xs text-emerald-600">{success}</div>}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" className="px-3 py-2 rounded-lg border border-slate-200" onClick={() => setOpen(false)}>İptal</button>
                <button type="submit" disabled={!selectedId} className={`px-3 py-2 rounded-lg text-white ${selectedId ? 'bg-violet-600' : 'bg-slate-400 cursor-not-allowed'}`}>Ekle</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}