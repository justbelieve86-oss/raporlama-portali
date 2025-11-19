/**
 * Daily KPI Table Component
 * Marka-bazlı karşılaştırma tablosu
 */

import React, { useRef, useState, useMemo } from 'react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Brand } from '../../services/api.js';
import type { BrandData } from './utils/kpiCalculations.js';
import type { ComputedValue } from './hooks/useKpiComputation.js';
import { DailyKpiTableHeader } from './DailyKpiTableHeader.js';
import { DailyKpiTableRow } from './DailyKpiTableRow.js';
import { logger } from '../../lib/logger.js';
import { useTablePreferences } from './hooks/useTablePreferences.js';

interface DailyKpiTableProps {
  brands: Brand[];
  brandData: Record<string, BrandData>;
  computedByBrand: Record<string, Record<string, ComputedValue>>;
  allKpis: Array<{ id: string; name: string; unit?: string }>;
  useManualOrdering: boolean;
  canEditOrdering: boolean;
  orderedKpiIds: string[];
  setOrderedKpiIds: (ids: string[]) => void;
  isSavingOrder: boolean;
  setIsSavingOrder: (saving: boolean) => void;
  isOrderingLoaded: boolean;
  saveOrderingToBackend: (newOrderedIds: string[]) => Promise<void>;
  referenceBrandId: string | null;
}

export function DailyKpiTable({
  brands,
  brandData,
  computedByBrand,
  allKpis,
  useManualOrdering,
  canEditOrdering,
  orderedKpiIds,
  setOrderedKpiIds,
  isSavingOrder,
  setIsSavingOrder,
  isOrderingLoaded,
  saveOrderingToBackend,
  referenceBrandId,
}: DailyKpiTableProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [windowedRowsCount, setWindowedRowsCount] = useState<number>(60);
  const { columnVisibility } = useTablePreferences();

  // Virtual scrolling sadece otomatik sıralama modunda kullan (DnD ile uyumlu değil)
  const useVirtualScrolling = !useManualOrdering && allKpis.length > 50;

  // Virtual scrolling with TanStack Virtual (sadece otomatik sıralama modunda)
  const virtualizer = useVirtualizer({
    count: useVirtualScrolling ? allKpis.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 60, // Estimated row height
    overscan: 5, // Render 5 extra items outside viewport
    enabled: useVirtualScrolling,
  });

  // Memoized display KPIs
  const displayKpis = useMemo(() => {
    if (useManualOrdering) {
      // Manuel sıralama: tüm KPIs göster (DnD için gerekli)
      return allKpis;
    }
    if (useVirtualScrolling) {
      // Virtual scrolling: tüm KPIs (virtualizer render edecek)
      return allKpis;
    }
    // Windowed rendering: sadece görünen satırları göster
    return allKpis.slice(0, Math.min(windowedRowsCount, allKpis.length));
  }, [allKpis, useManualOrdering, useVirtualScrolling, windowedRowsCount]);

  // Virtual items for rendering (sadece virtual scrolling aktifse)
  const virtualItems = useVirtualScrolling ? virtualizer.getVirtualItems() : [];

  // Scroll handler: sayfa sonuna yaklaşıldığında daha fazla satır yükle (sadece windowed rendering için)
  const onScroll = useMemo(() => {
    if (useVirtualScrolling || useManualOrdering) return undefined;
    return (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 100;
      if (nearBottom) {
        setWindowedRowsCount(c => Math.min(c + 50, allKpis.length));
      }
    };
  }, [useVirtualScrolling, useManualOrdering, allKpis.length]);

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg p-6 transition-colors duration-300">
      {/* Skip link for screen readers */}
      <a 
        href="#kpi-table-main" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg"
        aria-label="Ana tabloya atla"
      >
        Ana tabloya atla
      </a>
      <div className="overflow-x-auto rounded-lg border border-gray-200 -mx-6 sm:mx-0">
        <div 
          ref={scrollRef} 
          onScroll={onScroll} 
          className="max-h-[75vh] overflow-y-auto"
          id="kpi-table-main"
          role="region"
          aria-label="KPI karşılaştırma tablosu"
          tabIndex={0}
        >
          <DndContext 
            onDragMove={(event) => {
              if (!useManualOrdering) return;
              const el = scrollRef.current;
              if (!el) return;
              const rect = (event as any)?.active?.rect?.current?.translated || (event as any)?.active?.rect?.current?.initial;
              if (!rect) return;
              const container = el.getBoundingClientRect();
              const topOffset = rect.top - container.top;
              const height = rect.height ?? ((rect.bottom && rect.top) ? (rect.bottom - rect.top) : 0);
              const bottomOffset = container.bottom - (rect.top + height);
              const threshold = 80;
              const step = 20;
              if (topOffset < threshold) el.scrollTop -= step;
              else if (bottomOffset < threshold) el.scrollTop += step;
            }} 
            onDragEnd={(event) => {
              const { active, over } = event as any;
              logger.debug('onDragEnd tetiklendi:', { active: active.id, over: over?.id, useManualOrdering, canEditOrdering });
              
              if (!useManualOrdering) {
                logger.debug('useManualOrdering false, işlem iptal edildi');
                return;
              }
              
              if (!canEditOrdering) {
                logger.debug('canEditOrdering false, işlem iptal edildi');
                return;
              }
              
              if (!over || active.id === over.id) {
                logger.debug('over yok veya active.id === over.id, işlem iptal edildi');
                return;
              }
              
              // Use allKpis instead of orderedKpiIds to ensure we have all KPIs (Aylık KPI Dashboard ile aynı mantık)
              const currentIds = allKpis.map(k => String(k.id));
              logger.debug('Mevcut KPI ID\'leri (allKpis):', currentIds);
              
              if (currentIds.length === 0) {
                logger.debug('currentIds boş, işlem iptal edildi');
                return;
              }
              
              const oldIndex = currentIds.findIndex(id => String(id) === String(active.id));
              const newIndex = currentIds.findIndex(id => String(id) === String(over.id));
              
              logger.debug('Sıralama değişikliği:', { oldIndex, newIndex, activeId: active.id, overId: over.id });
              
              if (oldIndex === -1 || newIndex === -1) {
                logger.debug('oldIndex veya newIndex -1, işlem iptal edildi');
                return;
              }
              
              const next = arrayMove(currentIds, oldIndex, newIndex);
              logger.debug('Yeni sıralama:', next);
              setOrderedKpiIds(next);
              
              (async () => {
                try {
                  setIsSavingOrder(true);
                  logger.debug('Backend\'e kaydediliyor, next array:', next);
                  await saveOrderingToBackend(next);
                  logger.debug('KPI sıralaması başarıyla kaydedildi');
                } catch (e) {
                  logger.error('KPI sıralaması kaydedilemedi', e instanceof Error ? e : { error: e });
                } finally {
                  setIsSavingOrder(false);
                }
              })();
            }}
          >
            <table className="w-full border-collapse bg-white shadow-sm transition-colors duration-300" style={{ minWidth: `${Math.max(800, brands.length * 200 + 250)}px` }}>
              <thead>
                <DailyKpiTableHeader brands={brands} columnVisibility={columnVisibility} />
              </thead>
              <SortableContext 
                items={displayKpis.map(k => k.id)}
                strategy={verticalListSortingStrategy}
              >
                {useVirtualScrolling ? (
                  <tbody
                    style={{
                      height: `${virtualizer.getTotalSize()}px`,
                      width: '100%',
                      position: 'relative',
                    }}
                  >
                    {virtualItems.map((virtualRow) => {
                      const k = displayKpis[virtualRow.index];
                      if (!k) return null;
                      return (
                        <tr
                          key={`virtual-row-${k.id}`}
                          data-index={virtualRow.index}
                          ref={virtualizer.measureElement}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                        >
                          <td colSpan={brands.length * 4 + 1} style={{ padding: 0 }}>
                            <DailyKpiTableRow
                              k={k}
                              idx={virtualRow.index}
                              brands={brands}
                              brandData={brandData}
                              computedByBrand={computedByBrand}
                              useManualOrdering={useManualOrdering}
                              canDrag={canEditOrdering && (isOrderingLoaded || orderedKpiIds.length > 0)}
                              columnVisibility={columnVisibility}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                ) : (
                  <tbody>
                    {displayKpis.map((k, idx) => (
                      <DailyKpiTableRow
                        key={`row-${k.id}`}
                        k={k}
                        idx={idx}
                        brands={brands}
                        brandData={brandData}
                        computedByBrand={computedByBrand}
                        useManualOrdering={useManualOrdering}
                        canDrag={canEditOrdering && (isOrderingLoaded || orderedKpiIds.length > 0)}
                        columnVisibility={columnVisibility}
                      />
                    ))}
                  </tbody>
                )}
              </SortableContext>
            </table>
          </DndContext>
        </div>
      </div>
    </div>
  );
}

