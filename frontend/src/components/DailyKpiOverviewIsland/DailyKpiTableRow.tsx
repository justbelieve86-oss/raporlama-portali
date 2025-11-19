/**
 * Daily KPI Table Row Component
 * Tek satır bileşeni: DnD entegrasyonu ve hücrelerin çizimi
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Brand } from '../../services/api.js';
import type { BrandData } from './utils/kpiCalculations.js';
import type { ComputedValue } from './hooks/useKpiComputation.js';
import { getUnitMeta, formatNumber, formatCurrency, pillClass } from './utils/kpiFormatters.js';
import { ProgressBarWithTooltip } from './components/ProgressBarWithTooltip.js';
import { TrendIndicator } from './components/TrendIndicator.js';
import { StatusIcon } from './components/StatusIcon.js';
import type { ColumnVisibility } from './hooks/useTablePreferences.js';

interface DailyKpiTableRowProps {
  k: { id: string; name: string; unit?: string };
  idx: number;
  brands: Brand[];
  brandData: Record<string, BrandData>;
  computedByBrand: Record<string, Record<string, ComputedValue>>;
  useManualOrdering: boolean;
  canDrag: boolean;
  columnVisibility: ColumnVisibility;
}

// Memoized with deep comparison for computedByBrand
export const DailyKpiTableRow = React.memo(function DailyKpiTableRow({
  k,
  idx,
  brands,
  brandData,
  computedByBrand,
  useManualOrdering,
  canDrag,
  columnVisibility,
}: DailyKpiTableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: k.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.95 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  // Memoized computed values per brand to avoid recalculation
  const computedValues = React.useMemo(() => {
    const getComputedLocal = (brandId: string, bd: BrandData, kId: string) => {
      const kk = bd.kpis.find(x => String(x.id) === String(kId));
      if (!kk) return { daily: null, cumulative: 0, targetVal: null, unit: undefined, isPercent: false, isTl: false };
      const cached = computedByBrand[brandId]?.[kId];
      const unit = (cached?.unit ?? bd.unitById[kk.id] ?? kk.unit) as any;
      const meta = getUnitMeta(unit);
      return { daily: cached?.daily ?? null, cumulative: cached?.cumulative ?? 0, targetVal: cached?.targetVal ?? null, unit, isPercent: meta.isPercent, isTl: meta.isTl };
    };

    const values: Record<string, ReturnType<typeof getComputedLocal>> = {};
    brands.forEach(b => {
      const brandId = String(b.id);
      const bd = brandData[brandId];
      if (bd) {
        values[brandId] = getComputedLocal(brandId, bd, k.id);
      }
    });
    return values;
  }, [brands, brandData, k.id, computedByBrand]);

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`text-sm transition-colors duration-300 ${isDragging ? 'bg-blue-100 shadow-md' : isOver ? 'bg-blue-50' : 'hover:bg-gray-50 even:bg-white odd:bg-gray-50/30'}`}
      {...(useManualOrdering && canDrag ? attributes : {})}
      {...(useManualOrdering && canDrag ? listeners : {})}
    >
      <td className="py-3 px-4 border border-gray-200 align-middle sticky left-0 bg-white z-10 min-w-[200px] transition-colors duration-300">
        <div className="flex items-center gap-2">
                 {useManualOrdering && canDrag && (
                   <button
                     aria-label={`${k.name} KPI'sını sürükle-bırakla yeniden sırala`}
                     title="Sürükle-Bırak ile sırala (Klavye: Space/Enter ile aktif et, ok tuşları ile hareket ettir)"
                     className="mr-1 p-1.5 rounded hover:bg-gray-100 text-gray-600 cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
                     aria-grabbed={isDragging}
                     tabIndex={0}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter' || e.key === ' ') {
                         e.preventDefault();
                         // Enable drag mode on keyboard activation
                         if (attributes && listeners) {
                           (listeners as any).onKeyDown?.(e);
                         }
                       }
                     }}
                     {...attributes}
                     {...listeners}
                   >
                     <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                       <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
                     </svg>
                   </button>
                 )}
                 <span className="truncate font-semibold text-gray-900 text-sm" title={k.name}>
                   <span className="sr-only">KPI {idx + 1}: </span>
                   {idx + 1}. {k.name}
                 </span>
        </div>
      </td>
      {brands.map(b => {
        const brandId = String(b.id);
        const bd = brandData[brandId];
        const computedForBrand = computedByBrand[brandId];
        if (!bd || !computedForBrand) {
          const visibleColumns = [
            columnVisibility.daily,
            columnVisibility.cumulative,
            columnVisibility.target,
            columnVisibility.progress,
          ].filter(Boolean).length;
          return (
            <React.Fragment key={`cell-${b.id}-${k.id}`}>
              {columnVisibility.daily && <td className="py-3 px-3 border border-gray-200 text-right text-sm text-gray-400 bg-gray-50/50 transition-colors duration-300">-</td>}
              {columnVisibility.cumulative && <td className="py-3 px-3 border border-gray-200 text-right text-sm text-gray-400 bg-gray-50/50 transition-colors duration-300">-</td>}
              {columnVisibility.target && <td className="py-3 px-3 border border-gray-200 text-right text-sm text-gray-400 bg-gray-50/50 transition-colors duration-300">-</td>}
              {columnVisibility.progress && <td className="py-3 px-3 border border-gray-200 text-right text-sm text-gray-400 bg-gray-50/50 transition-colors duration-300">-</td>}
            </React.Fragment>
          );
        }
        // Use memoized computed values
        const computed = computedValues[brandId];
        if (!computed) {
          return (
            <React.Fragment key={`cell-${b.id}-${k.id}`}>
              {columnVisibility.daily && <td className="py-3 px-3 border border-gray-200 text-right text-sm text-gray-400 bg-gray-50/50 transition-colors duration-300">-</td>}
              {columnVisibility.cumulative && <td className="py-3 px-3 border border-gray-200 text-right text-sm text-gray-400 bg-gray-50/50 transition-colors duration-300">-</td>}
              {columnVisibility.target && <td className="py-3 px-3 border border-gray-200 text-right text-sm text-gray-400 bg-gray-50/50 transition-colors duration-300">-</td>}
              {columnVisibility.progress && <td className="py-3 px-3 border border-gray-200 text-right text-sm text-gray-400 bg-gray-50/50 transition-colors duration-300">-</td>}
            </React.Fragment>
          );
        }
        const { daily, cumulative, targetVal, isPercent, isTl, unit } = computed;
        const progressPct = targetVal && targetVal > 0 ? Math.max(0, Math.round((cumulative / Number(targetVal)) * 100)) : null;
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
          <React.Fragment key={`cell-${b.id}-${k.id}`}>
            {columnVisibility.daily && (
              <td className="py-3 px-3 border border-gray-200 text-right tabular-nums bg-white transition-colors duration-300">
                {daily == null ? (
                  <span className="text-sm text-gray-400">-</span>
                ) : (
                  <span className={`text-sm font-medium ${daily > 0 ? 'text-gray-900' : 'text-gray-500'}`}>
                    {isTl ? (daily ? `₺${formatCurrency(daily)}` : '—') : (daily ? `${formatNumber(daily)}${isPercent ? '%' : ''}` : '—')}
                  </span>
                )}
              </td>
            )}
            {columnVisibility.cumulative && (
              <td className="py-3 px-3 border border-gray-200 text-right tabular-nums bg-white transition-colors duration-300">
                <span className={`text-sm font-semibold ${cumulative > 0 ? 'text-gray-900' : 'text-gray-500'}`}>
                  {isTl ? (cumulative ? `₺${formatCurrency(cumulative)}` : '—') : (cumulative ? `${formatNumber(cumulative)}${isPercent ? '%' : ''}` : '—')}
                </span>
              </td>
            )}
            {columnVisibility.target && (
              <td className="py-3 px-3 border border-gray-200 text-right tabular-nums bg-white transition-colors duration-300">
                {targetVal == null ? (
                  <span className="text-sm text-gray-400">-</span>
                ) : (
                  <span className="text-sm font-medium text-gray-700">
                    {isTl ? (targetVal ? `₺${formatCurrency(targetVal)}` : '—') : (targetVal ? `${formatNumber(targetVal)}${isPercent ? '%' : ''}` : '—')}
                  </span>
                )}
              </td>
            )}
            {columnVisibility.progress && (
              <td className="py-3 px-3 border border-gray-200 text-right bg-white transition-colors duration-300">
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <StatusIcon progress={progressPct} size="sm" />
                    <span className={`px-3 py-1.5 text-sm font-semibold rounded-md ${pctClass} text-right tabular-nums min-w-[60px]`}>
                      {progressPct != null ? `${progressPct}%` : '-'}
                    </span>
                  </div>
                  <ProgressBarWithTooltip
                    value={pct}
                    target={targetVal}
                    cumulative={cumulative}
                    daily={daily}
                    unit={unit || undefined}
                    isPercent={isPercent}
                    isTl={isTl}
                  />
                </div>
              </td>
            )}
          </React.Fragment>
        );
      })}
    </tr>
  );
}, (prev, next) => {
  return (
    prev.k.id === next.k.id &&
    prev.k.name === next.k.name &&
    prev.idx === next.idx &&
    prev.brands.length === next.brands.length &&
    prev.brands.every((b, i) => b.id === next.brands[i]?.id) &&
    prev.useManualOrdering === next.useManualOrdering &&
    prev.canDrag === next.canDrag &&
    JSON.stringify(prev.computedByBrand) === JSON.stringify(next.computedByBrand)
  );
});

