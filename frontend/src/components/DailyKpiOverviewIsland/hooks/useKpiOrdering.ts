/**
 * Hook for KPI ordering logic
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { api } from '../../../lib/axiosClient.js';
import { getListItems } from '../../../utils/apiList.js';
import { logger } from '../../../lib/logger.js';
import type { Brand } from '../../../services/api.js';
import type { BrandData } from '../utils/kpiCalculations.js';

export function useKpiOrdering(
  selectedCategory: string,
  useManualOrdering: boolean,
  referenceBrandId: string | null,
  brands: Brand[],
  brandData: Record<string, BrandData>,
  canEditOrdering: boolean
) {
  const [orderedKpiIds, setOrderedKpiIds] = useState<string[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState<boolean>(false);
  const [isOrderingLoaded, setIsOrderingLoaded] = useState<boolean>(false);

  // localStorage kullanımı kaldırıldı - sıralama sadece backend'de saklanıyor
  // Böylece aynı kullanıcı farklı bilgisayarlarda aynı sıralamayı görecek

  // brandData'dan KPI ID'lerini extract et (memoized)
  const allKpiIdsFromBrandData = useMemo(() => {
    const kpiSet = new Set<string>();
    for (const brand of brands) {
      const brandId = String(brand.id);
      const bd = brandData[brandId];
      if (bd?.kpis) {
        for (const k of bd.kpis) {
          kpiSet.add(String(k.id));
        }
      }
    }
    return Array.from(kpiSet).sort().join(',');
  }, [brands, brandData]);

  // Loading flag ref (infinite loop önleme)
  const isLoadingRef = useRef(false);
  
  // Manuel mod aktifken backend'den sıralamayı yükle (optimized - infinite loop önleme)
  const loadOrderingForManualMode = useCallback(async () => {
    if (!useManualOrdering) return;
    if (!referenceBrandId) return;
    if (brands.length === 0) return;
    if (Object.keys(brandData).length === 0) return; // brandData yoksa bekle
    
    // Zaten yükleniyorsa tekrar yükleme (ref kullanarak infinite loop önleme)
    if (isLoadingRef.current) {
      logger.debug('Sıralama zaten yükleniyor, atlanıyor...');
      return;
    }
    
    isLoadingRef.current = true;
    setIsOrderingLoaded(false);
    try {
      logger.debug('KPI sıralaması yükleniyor', { referenceBrandId, context: 'daily-overview' });
      const res = await api.get(`/kpi-ordering/${referenceBrandId}?context=daily-overview`);
      type KpiOrderingItem = { kpi_id: string; order_index: number };
      const items = getListItems<KpiOrderingItem>(res.data);
      logger.debug('Backend\'den gelen sıralama', { items, count: items?.length });
      const sorted = (items || []).slice().sort((a, b) => (Number(a?.order_index ?? 999) - Number(b?.order_index ?? 999)));
      const refIds = sorted.map((r) => String(r.kpi_id));
      logger.debug('Reference brand KPI ID\'leri', { refIds, count: refIds.length });
      
      // Tüm markaların KPI'larını birleştir (union)
      const allKpiIds = new Set<string>();
      for (const brand of brands) {
        const brandId = String(brand.id);
        const bd = brandData[brandId];
        if (bd?.kpis) {
          for (const k of bd.kpis) {
            allKpiIds.add(String(k.id));
          }
        }
      }
      
      const completeIds = [...refIds, ...Array.from(allKpiIds).filter(id => !refIds.includes(String(id)))];
      logger.debug('Tüm KPI\'lar için sıralama', { completeIds, count: completeIds.length });
      
      // State'i güncelle (React otomatik olarak duplicate check yapar)
      setOrderedKpiIds(prev => {
        const prevStr = [...prev].sort().join(',');
        const newStr = [...completeIds].sort().join(',');
        if (prevStr === newStr) {
          return prev; // Değişmediyse aynı referansı döndür
        }
        return completeIds;
      });
    } catch (e) {
      logger.error('KPI sıralaması yüklenemedi', e instanceof Error ? e : { error: e });
    } finally {
      setIsOrderingLoaded(true);
      isLoadingRef.current = false;
    }
  }, [useManualOrdering, referenceBrandId, brands.length, allKpiIdsFromBrandData]);

  // Tek bir useEffect ile tüm yükleme mantığını birleştir (infinite loop önleme)
  useEffect(() => {
    if (!useManualOrdering || !referenceBrandId || brands.length === 0) {
      return;
    }
    
    // brandData yüklenene kadar bekle
    const hasBrandData = Object.keys(brandData).length > 0;
    if (!hasBrandData) {
      return;
    }
    
    // Debounce: Çok hızlı değişiklikleri önle
    const timeoutId = setTimeout(() => {
      loadOrderingForManualMode();
    }, 300); // 300ms debounce
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [useManualOrdering, referenceBrandId, selectedCategory, brands.length, allKpiIdsFromBrandData, loadOrderingForManualMode]);

  // Sayfa focus olduğunda da sıralamayı yeniden yükle (başka kullanıcı değişiklik yaptıysa görmek için)
  useEffect(() => {
    if (!useManualOrdering || !referenceBrandId || brands.length === 0) return;
    
    const handleFocus = () => {
      const hasBrandData = Object.keys(brandData).length > 0;
      if (hasBrandData) {
        // Debounce ile yükle
        const timeoutId = setTimeout(() => {
          loadOrderingForManualMode();
        }, 500);
        return () => clearTimeout(timeoutId);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [useManualOrdering, referenceBrandId, brands.length, loadOrderingForManualMode]);

  // Periyodik olarak backend'den sıralamayı kontrol et (her 30 saniyede bir)
  useEffect(() => {
    if (!useManualOrdering || !referenceBrandId || brands.length === 0) return;

    const hasBrandData = Object.keys(brandData).length > 0;
    if (!hasBrandData) return;

    // İlk yükleme hemen yapılsın
    const initialTimeout = setTimeout(() => {
      loadOrderingForManualMode();
    }, 1000); // 1 saniye sonra ilk yükleme

    // Sonra her 30 saniyede bir kontrol et
    const interval = setInterval(() => {
      const hasData = Object.keys(brandData).length > 0;
      if (hasData) {
        loadOrderingForManualMode();
      }
    }, 30000); // 30 saniye

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [useManualOrdering, referenceBrandId, brands.length, selectedCategory, loadOrderingForManualMode]);

  const saveOrderingToBackend = useCallback(async (newOrderedIds: string[]) => {
    logger.debug('saveOrderingToBackend çağrıldı:', { 
      newOrderedIdsCount: newOrderedIds.length, 
      newOrderedIds,
      canEditOrdering, 
      referenceBrandId 
    });
    
    if (!canEditOrdering) {
      logger.warn('saveOrderingToBackend: canEditOrdering false');
      return;
    }
    
    if (!referenceBrandId) {
      logger.warn('saveOrderingToBackend: referenceBrandId eksik');
      return;
    }
    
    const allKpiIds = new Set<string>();
    const kpiToBrands = new Map<string, Set<string>>();
    
    for (const brand of brands) {
      const brandId = String(brand.id);
      const bd = brandData[brandId];
      if (bd?.kpis) {
        for (const k of bd.kpis) {
          const kId = String(k.id);
          allKpiIds.add(kId);
          if (!kpiToBrands.has(kId)) {
            kpiToBrands.set(kId, new Set());
          }
          kpiToBrands.get(kId)!.add(brandId);
        }
      }
    }
    
    logger.debug('Tüm KPI ID\'leri:', Array.from(allKpiIds));
    
    const filtered = newOrderedIds.filter(id => allKpiIds.has(String(id)));
    const missing = Array.from(allKpiIds).filter(id => !filtered.includes(String(id)));
    // complete array'i tüm markaların KPI'larını içeriyor - Günlük KPI Dashboard için tüm KPI'ları kaydetmeliyiz
    const complete = [...filtered, ...missing];
    
    logger.debug('Filtreleme sonuçları:', { 
      filteredCount: filtered.length, 
      missingCount: missing.length, 
      completeCount: complete.length,
      complete
    });
    
    // Günlük KPI Dashboard birden fazla marka gösterdiği için, tüm KPI'ları kaydetmeliyiz
    // Reference brand sadece hangi brandId ile kaydedileceğini belirler, ama tüm KPI'lar kaydedilir
    const payload = { kpiOrdering: complete.map((kpi_id, index) => ({ kpi_id, order_index: index })) };
    
    if (complete.length === 0) {
      logger.warn('complete boş, kayıt yapılmıyor');
      return;
    }
    
    try {
      logger.debug(`Backend'e KPI sıralaması kaydediliyor (brandId: ${referenceBrandId}, context: daily-overview)...`, {
        payloadCount: payload.kpiOrdering.length,
        completeCount: complete.length,
        payload: payload.kpiOrdering
      });
      await api.put(`/kpi-ordering/${referenceBrandId}`, { ...payload, context: 'daily-overview' });
      logger.debug(`Backend'e KPI sıralaması başarıyla kaydedildi (${payload.kpiOrdering.length} KPI, context: daily-overview)`);
    } catch (error: unknown) {
      logger.error('Backend kayıt hatası', error);
      throw error;
    }
  }, [referenceBrandId, brandData, brands, canEditOrdering]);

  return {
    orderedKpiIds,
    setOrderedKpiIds,
    isSavingOrder,
    setIsSavingOrder,
    isOrderingLoaded,
    saveOrderingToBackend,
  };
}

