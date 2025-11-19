import React from 'react';
import clsx from 'clsx';
import LoadingSpinner from './LoadingSpinner';

interface LoadingCardProps {
  loading?: boolean;
  title?: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
  overlay?: boolean;
}

export default function LoadingCard({
  loading = false,
  title,
  description,
  className,
  children,
  overlay = false
}: LoadingCardProps) {
  if (overlay && loading) {
    return (
      <div className={clsx('relative', className)}>
        {children}
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            {title && <p className="text-sm font-medium text-gray-900 mb-1">{title}</p>}
            {description && <p className="text-xs text-gray-600">{description}</p>}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={clsx(
        'bg-white rounded-lg border border-gray-200 shadow-sm p-6 transition-colors duration-300',
        className
      )}>
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            {title && <p className="text-sm font-medium text-gray-900 mb-1">{title}</p>}
            {description && <p className="text-xs text-gray-600">{description}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(
      'bg-white rounded-lg border border-gray-200 shadow-sm transition-colors duration-300',
      className
    )}>
      {children}
    </div>
  );
}