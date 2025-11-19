/**
 * Daily KPI Table Header Component
 */

import React from 'react';
import type { Brand } from '../../services/api.js';
import type { ColumnVisibility } from '../hooks/useTablePreferences.js';

interface DailyKpiTableHeaderProps {
  brands: Brand[];
  columnVisibility: ColumnVisibility;
}

export const DailyKpiTableHeader = React.memo(function DailyKpiTableHeader({ brands, columnVisibility }: DailyKpiTableHeaderProps) {
      return (
        <>
          <tr className="text-sm text-gray-800 border-b-2 border-gray-300 sticky top-0 bg-gradient-to-b from-gray-50 to-white z-30 shadow-sm transition-colors duration-300">
            <th scope="col" className="text-left py-3 px-4 border-r-2 border-gray-300 sticky left-0 bg-gradient-to-b from-gray-50 to-white z-30 font-bold text-base text-gray-900 transition-colors duration-300">
              <span className="sr-only">KPI adı ve sıralama</span>
              KPI
            </th>
            {brands.map(b => {
              const visibleColumns = [
                columnVisibility.daily,
                columnVisibility.cumulative,
                columnVisibility.target,
                columnVisibility.progress,
              ].filter(Boolean).length;
              return (
              <th 
                key={`brand-head-${b.id}`} 
                scope="colgroup" 
                className="text-center py-3 px-4 border-r border-gray-200 font-bold text-base bg-gradient-to-b from-blue-50/50 to-white transition-colors duration-300" 
                colSpan={visibleColumns}
                aria-label={`${b.name} markası için KPI değerleri`}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-gray-900">{b.name}</span>
                  <div className="h-0.5 w-full bg-blue-400 rounded-full" aria-hidden="true"></div>
                </div>
              </th>
              );
            })}
          </tr>
          <tr className="text-xs text-gray-700 border-b border-gray-200 sticky top-[52px] bg-gradient-to-b from-gray-50 to-white z-30 transition-colors duration-300">
            <th scope="col" className="text-left py-2 px-4 border-r-2 border-gray-300 sticky left-0 bg-gradient-to-b from-gray-50 to-white z-30 font-semibold text-gray-700 transition-colors duration-300">
              <span className="sr-only">KPI adı</span>
            </th>
            {brands.map(b => (
              <React.Fragment key={`brand-sub-${b.id}`}>
                {columnVisibility.daily && (
                  <th scope="col" className="text-right py-2 px-3 border-r border-gray-200 font-semibold text-gray-700 bg-blue-50/30 transition-colors duration-300" aria-label={`${b.name} - Günlük değer`}>Günlük</th>
                )}
                {columnVisibility.cumulative && (
                  <th scope="col" className="text-right py-2 px-3 border-r border-gray-200 font-semibold text-gray-700 bg-blue-50/30 transition-colors duration-300" aria-label={`${b.name} - Kümülatif değer`}>Kümülatif</th>
                )}
                {columnVisibility.target && (
                  <th scope="col" className="text-right py-2 px-3 border-r border-gray-200 font-semibold text-gray-700 bg-blue-50/30 transition-colors duration-300" aria-label={`${b.name} - Hedef değer`}>Hedef</th>
                )}
                {columnVisibility.progress && (
                  <th scope="col" className="text-right py-2 px-3 border-r border-gray-200 font-semibold text-gray-700 bg-blue-50/30 transition-colors duration-300" aria-label={`${b.name} - Gerçekleşen yüzde`}>Gerçekleşen %</th>
                )}
              </React.Fragment>
            ))}
          </tr>
        </>
      );
}, (prev, next) => {
  return prev.brands.length === next.brands.length &&
    prev.brands.every((b, i) => b.id === next.brands[i]?.id && b.name === next.brands[i]?.name) &&
    prev.columnVisibility.daily === next.columnVisibility.daily &&
    prev.columnVisibility.cumulative === next.columnVisibility.cumulative &&
    prev.columnVisibility.target === next.columnVisibility.target &&
    prev.columnVisibility.progress === next.columnVisibility.progress;
});

