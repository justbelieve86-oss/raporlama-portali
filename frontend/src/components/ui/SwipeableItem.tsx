import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';

export interface SwipeableItemProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  threshold?: number;
  className?: string;
}

/**
 * Swipeable Item Component
 * Allows swipe gestures to reveal actions (e.g., delete, edit)
 */
export function SwipeableItem({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  threshold = 100,
  className,
}: SwipeableItemProps) {
  const [offset, setOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const startOffset = useRef<number>(0);

  const { elementRef } = useSwipeGesture({
    onSwipeLeft: () => {
      if (rightAction && onSwipeLeft) {
        setOffset(-threshold);
        onSwipeLeft();
      }
    },
    onSwipeRight: () => {
      if (leftAction && onSwipeRight) {
        setOffset(threshold);
        onSwipeRight();
      }
    },
    threshold: 50,
  });

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      startOffset.current = offset;
      setIsSwiping(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartX.current === null) return;

      const deltaX = e.touches[0].clientX - touchStartX.current;
      const newOffset = startOffset.current + deltaX;

      // Limit offset based on available actions
      let minOffset = 0;
      let maxOffset = 0;

      if (rightAction) minOffset = -threshold;
      if (leftAction) maxOffset = threshold;

      setOffset(Math.max(minOffset, Math.min(maxOffset, newOffset)));
    };

    const handleTouchEnd = () => {
      setIsSwiping(false);
      touchStartX.current = null;

      // Snap to nearest position
      if (offset < -threshold / 2 && rightAction) {
        setOffset(-threshold);
      } else if (offset > threshold / 2 && leftAction) {
        setOffset(threshold);
      } else {
        setOffset(0);
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [offset, threshold, leftAction, rightAction, elementRef]);

  return (
    <div className={clsx('relative overflow-hidden', className)}>
      {/* Actions */}
      <div className="absolute inset-y-0 left-0 right-0 flex">
        {leftAction && (
          <div
            className={clsx(
              'flex items-center justify-start pl-4',
              'bg-primary-500 text-white',
              'transition-opacity duration-200',
              offset > 0 ? 'opacity-100' : 'opacity-0'
            )}
            style={{ width: `${threshold}px` }}
          >
            {leftAction}
          </div>
        )}
        {rightAction && (
          <div
            className={clsx(
              'flex items-center justify-end pr-4 ml-auto',
              'bg-error-500 text-white',
              'transition-opacity duration-200',
              offset < 0 ? 'opacity-100' : 'opacity-0'
            )}
            style={{ width: `${threshold}px` }}
          >
            {rightAction}
          </div>
        )}
      </div>

      {/* Content */}
      <div
        ref={elementRef}
        className={clsx(
          'relative bg-white',
          'transition-transform duration-200 ease-out',
          isSwiping && 'transition-none'
        )}
        style={{
          transform: `translateX(${offset}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}


