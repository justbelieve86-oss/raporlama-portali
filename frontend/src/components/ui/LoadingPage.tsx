import React from 'react';
import clsx from 'clsx';
import LoadingSpinner from './LoadingSpinner';

interface LoadingPageProps {
  title?: string;
  description?: string;
  className?: string;
  fullScreen?: boolean;
}

export default function LoadingPage({
  title = 'Yükleniyor...',
  description,
  className,
  fullScreen = false
}: LoadingPageProps) {
  return (
    <div className={clsx(
      'flex items-center justify-center bg-gray-50',
      fullScreen ? 'min-h-screen' : 'min-h-[400px]',
      className
    )}>
      <div className="text-center">
        <LoadingSpinner size="xl" className="mx-auto mb-6" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
        {description && (
          <p className="text-sm text-gray-600 max-w-sm mx-auto">{description}</p>
        )}
      </div>
    </div>
  );
}