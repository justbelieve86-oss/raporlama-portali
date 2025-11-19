/**
 * Daily KPI Overview Island - Ana Container Component
 * Refactored version - küçük modüllere ayrılmış yapı
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { DailyKpiHeader } from './DailyKpiHeader.js';
import { DailyKpiTable } from './DailyKpiTable.js';
import { useDailyKpiDataQuery } from './hooks/useDailyKpiDataQuery.js';
import { useKpiComputation } from './hooks/useKpiComputation.js';
import { useKpiOrdering } from './hooks/useKpiOrdering.js';
import { useCurrentUser } from '../../hooks/useCurrentUser.js';
import type { Kpi } from './utils/kpiCalculations.js';
import type { ComputedValue } from './hooks/useKpiComputation.js';

function DailyKpiOverviewIslandContent() {
  const { user } = useCurrentUser();
  const canEditOrdering = true; // Her kullanıcı kendi KPI sıralamasını yapabilir

  // Tarih state'i - varsayılan olarak dün (1 gün önce)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const [year, setYear] = useState<number>(yesterday.getFullYear());
  const [month, setMonth] = useState<number>(yesterday.getMonth() + 1);
  const [day, setDay] = useState<number>(yesterday.getDate());

  const [selectedCategory, setSelectedCategory] = useState<'Satış' | 'Servis' | 'Kiralama' | 'İkinci El' | 'Ekspertiz'>('Satış');
  const [useManualOrdering, setUseManualOrdering] = useState<boolean>(true);
  const [sortMode, setSortMode] = useState<'name' | 'avgProgressDesc' | 'avgProgressAsc'>('name');
  const [computedByBrand, setComputedByBrand] = useState<Record<string, Record<string, ComputedValue>>>({});

  // Data fetching with TanStack Query (optimized with caching)
  const { brands, brandData, loading, error } = useDailyKpiDataQuery(selectedCategory, year, month, day);

  // KPI computation
  const { computeBrandValues } = useKpiComputation(day);

  // Reference brand
  const referenceBrandId = useMemo(() => brands.length > 0 ? String(brands[0].id) : null, [brands]);
  const referenceBrandName = useMemo(() => brands.length > 0 ? String(brands[0].name || '') : '', [brands]);

  // KPI ordering
  const {
    orderedKpiIds,
    setOrderedKpiIds,
    isSavingOrder,
    setIsSavingOrder,
    isOrderingLoaded,
    saveOrderingToBackend,
  } = useKpiOrdering(
    selectedCategory,
    useManualOrdering,
    referenceBrandId,
    brands,
    brandData,
    canEditOrdering
  );

  // Tarih değişikliği handler'ı
  const handleDateChange = useCallback((newYear: number, newMonth: number, newDay: number) => {
    setYear(newYear);
    setMonth(newMonth);
    setDay(newDay);
    // Tarih değiştiğinde verileri temizle (yeniden yüklenecek)
    setComputedByBrand({});
  }, []);

  // brandData key'lerini memoize et (infinite loop önleme)
  const brandDataKeys = useMemo(() => {
    return Object.keys(brandData).sort().join(',');
  }, [brandData]);

  // brands ID'lerini memoize et (infinite loop önleme)
  const brandsIds = useMemo(() => {
    return brands.map(b => String(b.id)).sort().join(',');
  }, [brands]);

  // Her marka verisi geldiğinde, değerleri hesaplayıp cache'e yaz (memoized batch update)
  useEffect(() => {
    // Boş brandData kontrolü
    if (brands.length === 0 || Object.keys(brandData).length === 0) {
      setComputedByBrand(prev => {
        if (Object.keys(prev).length > 0) {
          return {};
        }
        return prev; // Değişmediyse aynı referansı döndür
      });
      return;
    }

    setComputedByBrand(prev => {
      const newComputed: Record<string, Record<string, ComputedValue>> = {};
      let hasChanges = false;
      
      brands.forEach(b => {
        const id = String(b.id);
        const bd = brandData[id];
        if (bd) {
          const computed = computeBrandValues(bd);
          // Sadece gerçekten değiştiyse güncelle (shallow comparison)
          const prevComputed = prev[id];
          if (!prevComputed) {
            newComputed[id] = computed;
            hasChanges = true;
          } else {
            // Shallow comparison - sadece KPI ID'lerini kontrol et
            const prevKpiIds = Object.keys(prevComputed).sort().join(',');
            const newKpiIds = Object.keys(computed).sort().join(',');
            if (prevKpiIds !== newKpiIds) {
              newComputed[id] = computed;
              hasChanges = true;
            } else {
              // KPI ID'leri aynı, değerleri kontrol et (sadece cumulative ve targetVal)
              for (const kpiId of Object.keys(computed)) {
                const prevVal = prevComputed[kpiId];
                const newVal = computed[kpiId];
                if (!prevVal || 
                    prevVal.cumulative !== newVal.cumulative || 
                    prevVal.targetVal !== newVal.targetVal ||
                    prevVal.daily !== newVal.daily) {
                  newComputed[id] = computed;
                  hasChanges = true;
                  break;
                }
              }
            }
          }
        }
      });
      
      // Sadece değişiklik varsa state'i güncelle
      if (hasChanges) {
        const updated = { ...prev };
        Object.keys(newComputed).forEach(id => {
          updated[id] = newComputed[id];
        });
        return updated;
      }
      
      // Değişiklik yoksa aynı referansı döndür (re-render önleme)
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // brands ve brandData brandsIds ve brandDataKeys ile takip ediliyor (infinite loop önleme)
  }, [brandsIds, brandDataKeys, computeBrandValues]);

  // Tüm markalardaki KPI'ları birleştirerek satır setini oluştur
  const allKpis = useMemo(() => {
    const kpiMap: Record<string, Kpi> = {};
    for (const b of brands) {
      const bd = brandData[String(b.id)];
      if (!bd) continue;
      for (const k of bd.kpis) {
        if (!kpiMap[k.id]) kpiMap[k.id] = k;
      }
    }
    const allKpisRaw = Object.values(kpiMap);

    // Manuel sıralama aktifse, union KPIs'ı orderedKpiIds'ye göre sırala
    if (useManualOrdering) {
      const idToKpi = new Map<string, Kpi>();
      for (const k of allKpisRaw) idToKpi.set(String(k.id), k);
      const result: Kpi[] = [];
      
      // Eğer orderedKpiIds boşsa, tüm KPI'ları sıralı göster (fallback)
      if (orderedKpiIds.length === 0) {
        return allKpisRaw;
      }
      
      // Önce kayıtta olanlar
      for (const id of orderedKpiIds) {
        const k = idToKpi.get(String(id));
        if (k) result.push(k);
      }
      // Sonra kalanlar
      for (const k of allKpisRaw) {
        if (!orderedKpiIds.includes(String(k.id))) result.push(k);
      }
      return result;
    }

    // Otomatik sıralama
    const getAvgProgress = (k: Kpi): number | null => {
      let sum = 0;
      let cnt = 0;
      for (const b of brands) {
        const brandId = String(b.id);
        const comp = computedByBrand[brandId]?.[k.id];
        if (!comp) continue;
        const t = comp.targetVal;
        const c = comp.cumulative;
        if (t != null && Number(t) > 0) {
          sum += Math.max(0, Math.round((Number(c) / Number(t)) * 100));
          cnt++;
        }
      }
      if (cnt === 0) return null;
      return sum / cnt;
    };

    return allKpisRaw.slice().sort((a, b) => {
      if (sortMode === 'name') return a.name.localeCompare(b.name, 'tr');
      const ap = getAvgProgress(a);
      const bp = getAvgProgress(b);
      if (ap == null && bp == null) return a.name.localeCompare(b.name, 'tr');
      if (ap == null) return 1;
      if (bp == null) return -1;
      return sortMode === 'avgProgressDesc' ? (bp - ap) : (ap - bp);
    });
  }, [brands, brandData, useManualOrdering, orderedKpiIds, sortMode, computedByBrand]);

  // Hiç veri yoksa mesaj göster
  const anyDataLoaded = brands.some(b => !!brandData[String(b.id)]);

  return (
    <div className="space-y-6">
      {/* Skip link for screen readers */}
      <a 
        href="#daily-kpi-main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg"
        aria-label="Ana içeriğe atla"
      >
        Ana içeriğe atla
      </a>
      {/* Header with category dropdown and date picker */}
      <DailyKpiHeader
        selectedCategory={selectedCategory}
        onChangeCategory={(v) => setSelectedCategory(v as any)}
        useManualOrdering={useManualOrdering}
        onToggleManualOrdering={(v) => setUseManualOrdering(v)}
        referenceBrandName={referenceBrandName}
        isSavingOrder={isSavingOrder}
        canEditOrdering={canEditOrdering}
        year={year}
        month={month}
        day={day}
        onChangeDate={handleDateChange}
      />

      {/* Content */}
      {loading ? (
        <div role="status" aria-live="polite" aria-busy="true" className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-50 border border-gray-200 rounded h-10 transition-colors duration-300" aria-hidden="true" />
          ))}
          <div className="text-xs text-gray-500">Veriler yükleniyor…</div>
        </div>
      ) : error ? (
        <div className="text-sm text-red-600" role="alert" aria-live="assertive">
          <span className="sr-only">Hata: </span>
          {error}
        </div>
             ) : (
               <div className="space-y-6" id="daily-kpi-main-content" role="main" aria-label="Günlük KPI Dashboard">
                 {brands.length === 0 ? (
                   <div className="text-sm text-gray-500" role="status" aria-live="polite">
                     Bu kategori için ilişkilendirilmiş marka bulunamadı.
                   </div>
                 ) : !anyDataLoaded ? (
                   <div className="bg-white rounded-xl border border-gray-200 p-4 transition-colors duration-300" role="status" aria-live="polite" aria-busy="true">
                     <div className="text-sm text-gray-500">Veriler yükleniyor…</div>
                   </div>
                 ) : (
                   <>
                     <DailyKpiTable
                       brands={brands}
                       brandData={brandData}
                       computedByBrand={computedByBrand}
                       allKpis={allKpis.map(k => ({ id: k.id, name: k.name, unit: k.unit }))}
                       useManualOrdering={useManualOrdering}
                       canEditOrdering={canEditOrdering}
                       orderedKpiIds={orderedKpiIds}
                       setOrderedKpiIds={setOrderedKpiIds}
                       isSavingOrder={isSavingOrder}
                       setIsSavingOrder={setIsSavingOrder}
                       isOrderingLoaded={isOrderingLoaded}
                       saveOrderingToBackend={saveOrderingToBackend}
                       referenceBrandId={referenceBrandId}
                     />
                   </>
          )}
        </div>
      )}
    </div>
  );
}

export default DailyKpiOverviewIslandContent;

