/**
 * Status Icon Component
 * Shows status based on progress percentage
 */

import React from 'react';

interface StatusIconProps {
  progress: number | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusIcon({
  progress,
  className = '',
  size = 'sm',
}: StatusIconProps) {
  if (progress == null) {
    return (
      <span className={`inline-flex items-center text-gray-400 ${className}`} title="Hedef belirlenmemiş">
        <span className="text-xs">—</span>
      </span>
    );
  }

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  if (progress >= 100) {
    return (
      <span className={`inline-flex items-center text-green-600 ${sizeClasses[size]} ${className}`} title="Hedef tamamlandı">
        <span>✅</span>
      </span>
    );
  }

  if (progress >= 80) {
    return (
      <span className={`inline-flex items-center text-amber-600 ${sizeClasses[size]} ${className}`} title="Hedefe yakın">
        <span>⚠️</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center text-red-600 ${sizeClasses[size]} ${className}`} title="Hedefin altında">
      <span>❌</span>
    </span>
  );
}

