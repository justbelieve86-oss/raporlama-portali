import React from 'react';
import clsx from 'clsx';

interface SkeletonLoaderProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular' | 'card';
  width?: string | number;
  height?: string | number;
  lines?: number; // For text variant
  animate?: boolean;
}

export default function SkeletonLoader({
  className,
  variant = 'rectangular',
  width,
  height,
  lines = 1,
  animate = true
}: SkeletonLoaderProps) {
  const baseClasses = clsx(
    'bg-gray-200',
    animate && 'animate-pulse',
    className
  );

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  if (variant === 'text') {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={clsx(
              baseClasses,
              'h-4 rounded',
              index === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
            )}
            style={style}
          />
        ))}
      </div>
    );
  }

  if (variant === 'circular') {
    const circularStyle = {
      width: width || height || '40px',
      height: height || width || '40px',
    };
    
    return (
      <div
        className={clsx(baseClasses, 'rounded-full')}
        style={circularStyle}
      />
    );
  }

  if (variant === 'card') {
    return (
      <div className={clsx('bg-white rounded-lg border border-gray-200 p-4 space-y-4', className)}>
        <div className="flex items-center space-x-3">
          <SkeletonLoader variant="circular" width={40} height={40} animate={animate} />
          <div className="flex-1 space-y-2">
            <SkeletonLoader variant="text" lines={1} animate={animate} />
            <SkeletonLoader variant="text" lines={1} width="60%" animate={animate} />
          </div>
        </div>
        <SkeletonLoader variant="text" lines={3} animate={animate} />
        <div className="flex space-x-2">
          <SkeletonLoader width="80px" height="32px" className="rounded" animate={animate} />
          <SkeletonLoader width="80px" height="32px" className="rounded" animate={animate} />
        </div>
      </div>
    );
  }

  // Default rectangular
  return (
    <div
      className={clsx(baseClasses, 'rounded')}
      style={style}
    />
  );
}

// Özel skeleton bileşenleri
export function TableRowSkeleton({ columns = 4, animate = true }: { columns?: number; animate?: boolean }) {
  return (
    <tr className="border-b border-gray-200">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="px-6 py-4">
          <SkeletonLoader variant="text" lines={1} animate={animate} />
        </td>
      ))}
    </tr>
  );
}

export function KpiCardSkeleton({ animate = true }: { animate?: boolean }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <SkeletonLoader variant="circular" width={48} height={48} animate={animate} />
        <SkeletonLoader width="60px" height="24px" className="rounded-full" animate={animate} />
      </div>
      <div className="space-y-2">
        <SkeletonLoader width="120px" height="32px" animate={animate} />
        <SkeletonLoader variant="text" lines={1} width="80%" animate={animate} />
        <SkeletonLoader variant="text" lines={1} width="60%" animate={animate} />
      </div>
    </div>
  );
}

export function FormSkeleton({ fields = 3, animate = true }: { fields?: number; animate?: boolean }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <SkeletonLoader width="120px" height="16px" animate={animate} />
          <SkeletonLoader width="100%" height="40px" className="rounded-md" animate={animate} />
        </div>
      ))}
      <div className="flex space-x-3 pt-4">
        <SkeletonLoader width="100px" height="40px" className="rounded-md" animate={animate} />
        <SkeletonLoader width="80px" height="40px" className="rounded-md" animate={animate} />
      </div>
    </div>
  );
}