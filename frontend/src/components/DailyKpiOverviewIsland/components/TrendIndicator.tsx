/**
 * Trend Indicator Component
 * Shows trend direction (↑ ↓ →) based on comparison
 */

import React from 'react';

interface TrendIndicatorProps {
  current: number;
  previous?: number | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function TrendIndicator({
  current,
  previous,
  className = '',
  size = 'sm',
}: TrendIndicatorProps) {
  if (previous == null || previous === 0) {
    return (
      <span className={`inline-flex items-center text-gray-400 ${className}`} title="Önceki veri yok">
        <span className="text-xs">—</span>
      </span>
    );
  }

  const change = ((current - previous) / previous) * 100;
  const absChange = Math.abs(change);

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  if (absChange < 0.1) {
    // No significant change
    return (
      <span className={`inline-flex items-center text-gray-500 ${sizeClasses[size]} ${className}`} title={`Değişim: ${change.toFixed(1)}%`}>
        <span className="mr-0.5">→</span>
        <span className="text-[10px]">{absChange.toFixed(1)}%</span>
      </span>
    );
  }

  if (change > 0) {
    // Positive trend
    return (
      <span className={`inline-flex items-center text-green-600 ${sizeClasses[size]} ${className}`} title={`Artış: ${change.toFixed(1)}%`}>
        <span className="mr-0.5">↑</span>
        <span className="text-[10px] font-semibold">{change.toFixed(1)}%</span>
      </span>
    );
  }

  // Negative trend
  return (
    <span className={`inline-flex items-center text-red-600 ${sizeClasses[size]} ${className}`} title={`Azalış: ${change.toFixed(1)}%`}>
      <span className="mr-0.5">↓</span>
      <span className="text-[10px] font-semibold">{Math.abs(change).toFixed(1)}%</span>
    </span>
  );
}

