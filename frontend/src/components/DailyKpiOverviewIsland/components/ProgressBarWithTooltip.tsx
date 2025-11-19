/**
 * Enhanced Progress Bar with Tooltip
 * Gradient colors, animations, and detailed tooltip
 */

import React, { useState, useRef, useEffect } from 'react';

interface ProgressBarWithTooltipProps {
  value: number; // 0-100
  target?: number | null;
  cumulative?: number;
  daily?: number | null;
  unit?: string;
  isPercent?: boolean;
  isTl?: boolean;
  className?: string;
}

export function ProgressBarWithTooltip({
  value,
  target,
  cumulative,
  daily,
  unit,
  isPercent = false,
  isTl = false,
  className = '',
}: ProgressBarWithTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Clamp value between 0 and 100
  const clampedValue = Math.min(100, Math.max(0, value));

  // Determine color based on value
  const getColorClass = () => {
    if (clampedValue >= 100) return 'from-green-500 to-green-600';
    if (clampedValue >= 80) return 'from-amber-500 to-amber-600';
    if (clampedValue >= 50) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  // Format number for display
  const formatValue = (val: number | null | undefined): string => {
    if (val == null) return '-';
    if (isTl) return `₺${new Intl.NumberFormat('tr-TR').format(val)}`;
    if (isPercent) return `${new Intl.NumberFormat('tr-TR').format(val)}%`;
    return new Intl.NumberFormat('tr-TR').format(val);
  };

  // Calculate tooltip position
  const updateTooltipPosition = () => {
    if (!containerRef.current || !tooltipRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;
    
    // Position above the progress bar
    let top = rect.top + scrollY - tooltipRect.height - 8;
    let left = rect.left + scrollX + rect.width / 2 - tooltipRect.width / 2;
    
    // Ensure tooltip stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    if (left < 10) left = 10;
    if (left + tooltipRect.width > viewportWidth - 10) {
      left = viewportWidth - tooltipRect.width - 10;
    }
    
    if (top < scrollY + 10) {
      // If not enough space above, position below
      top = rect.bottom + scrollY + 8;
    }
    
    setTooltipPosition({ top, left });
  };

  useEffect(() => {
    if (showTooltip) {
      updateTooltipPosition();
      const handleResize = () => updateTooltipPosition();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [showTooltip]);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="w-32 h-2.5 rounded-full bg-gray-200 overflow-hidden shadow-inner transition-colors duration-300" aria-hidden="true">
        <div
          className={`h-full transition-all duration-500 ease-out bg-gradient-to-r ${getColorClass()}`}
          style={{
            width: `${clampedValue}%`,
            animation: showTooltip ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
          }}
        />
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          ref={tooltipRef}
          className="absolute z-50 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg pointer-events-none whitespace-nowrap"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
          }}
        >
          <div className="space-y-1">
            <div className="font-semibold border-b border-gray-700 pb-1 mb-1">
              Gerçekleşme: {clampedValue.toFixed(1)}%
            </div>
            {cumulative != null && (
              <div className="text-gray-300">
                Kümülatif: {formatValue(cumulative)}
              </div>
            )}
            {target != null && (
              <div className="text-gray-300">
                Hedef: {formatValue(target)}
              </div>
            )}
            {daily != null && (
              <div className="text-gray-300">
                Günlük: {formatValue(daily)}
              </div>
            )}
            {target != null && cumulative != null && (
              <div className="text-gray-300 pt-1 border-t border-gray-700">
                Fark: {formatValue(cumulative - target)}
              </div>
            )}
          </div>
          {/* Tooltip arrow */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
}

