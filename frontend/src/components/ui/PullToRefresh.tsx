import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

export interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  disabled?: boolean;
  threshold?: number; // Pull distance in pixels (default: 80)
  className?: string;
}

/**
 * Pull to Refresh Component
 * Native-like pull to refresh functionality for mobile
 */
export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  threshold = 80,
  className,
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const scrollTop = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      scrollTop.current = container.scrollTop;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartY.current === null) return;
      if (scrollTop.current > 0) return; // Don't pull if scrolled

      const touchY = e.touches[0].clientY;
      const deltaY = touchY - touchStartY.current;

      if (deltaY > 0) {
        // Pulling down
        const distance = Math.min(deltaY * 0.5, threshold * 1.5); // Damping effect
        setPullDistance(distance);
        setIsPulling(distance > 10);

        if (distance > threshold) {
          // Ready to refresh
          container.style.transform = `translateY(${threshold}px)`;
        } else {
          container.style.transform = `translateY(${distance}px)`;
        }
      }
    };

    const handleTouchEnd = async () => {
      if (touchStartY.current === null) return;

      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        setIsPulling(false);
        setPullDistance(threshold);

        try {
          await onRefresh();
        } finally {
          setTimeout(() => {
            setIsRefreshing(false);
            setPullDistance(0);
            if (container) {
              container.style.transform = '';
            }
          }, 300);
        }
      } else {
        // Reset
        setIsPulling(false);
        setPullDistance(0);
        if (container) {
          container.style.transform = '';
        }
      }

      touchStartY.current = null;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, disabled, threshold, pullDistance, isRefreshing]);

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const shouldShowIndicator = isPulling || isRefreshing;

  return (
    <div className={clsx('relative', className)}>
      {/* Pull Indicator */}
      {shouldShowIndicator && (
        <div
          className={clsx(
            'absolute top-0 left-0 right-0',
            'flex items-center justify-center',
            'h-16 z-10',
            'transition-opacity duration-200',
            isRefreshing ? 'opacity-100' : 'opacity-75'
          )}
          style={{
            transform: `translateY(${Math.min(pullDistance, threshold)}px)`,
          }}
        >
          {isRefreshing ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray-600">Yenileniyor...</span>
            </div>
          ) : (
            <div
              className="flex flex-col items-center gap-2"
              style={{
                transform: `scale(${0.5 + pullProgress * 0.5})`,
                opacity: pullProgress,
              }}
            >
              <svg
                className="w-6 h-6 text-primary-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{
                  transform: `rotate(${pullProgress * 180}deg)`,
                }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
              <span className="text-xs text-gray-600">
                {pullProgress >= 1 ? 'Bırakın' : 'Aşağı çekin'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div
        ref={containerRef}
        className={clsx(
          'transition-transform duration-200 ease-out',
          isRefreshing && 'pointer-events-none'
        )}
        style={{
          paddingTop: shouldShowIndicator ? '64px' : '0',
        }}
      >
        {children}
      </div>
    </div>
  );
}


