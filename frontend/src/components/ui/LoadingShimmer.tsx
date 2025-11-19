import React from 'react';
import clsx from 'clsx';

export interface LoadingShimmerProps {
  className?: string;
  width?: string;
  height?: string;
}

/**
 * Loading Shimmer Component
 * Skeleton loading effect for cards and content
 */
export function LoadingShimmer({ className, width = '100%', height = '100%' }: LoadingShimmerProps) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded',
        'bg-gray-200',
        className
      )}
      style={{ width, height }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer" />
    </div>
  );
}

/**
 * Card Shimmer - Pre-configured shimmer for cards
 */
export function CardShimmer({ className }: { className?: string }) {
  return (
    <div className={clsx('bg-white rounded-xl shadow-md p-card', className)}>
      <div className="space-y-3">
        <LoadingShimmer height="16px" width="60%" />
        <LoadingShimmer height="32px" width="40%" />
        <LoadingShimmer height="12px" width="80%" />
      </div>
    </div>
  );
}


