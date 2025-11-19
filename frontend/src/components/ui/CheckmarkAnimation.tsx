import React, { useEffect, useState } from 'react';
import clsx from 'clsx';

export interface CheckmarkAnimationProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'success' | 'primary';
  className?: string;
}

/**
 * Checkmark Animation Component
 * Animated checkmark for success states
 */
export function CheckmarkAnimation({
  size = 'md',
  color = 'success',
  className,
}: CheckmarkAnimationProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
  }, []);

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const colorClasses = {
    success: 'text-success-500',
    primary: 'text-primary-500',
  };

  return (
    <div className={clsx('flex items-center justify-center', className)}>
      <svg
        className={clsx(sizeClasses[size], colorClasses[color])}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          className={clsx('transition-all duration-300', isAnimating && 'animate-pulse-slow')}
        />
        <path
          d="M8 12l2 2 4-4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={20}
          strokeDashoffset={isAnimating ? 0 : 20}
          className="transition-all duration-600 ease-out"
        />
      </svg>
    </div>
  );
}


