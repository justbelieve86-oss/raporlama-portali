import React from 'react';
import clsx from 'clsx';

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  period?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'indigo' | 'purple';
  trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
  loading?: boolean;
  gradient?: boolean;
  className?: string;
}

/**
 * Modern Stat Card Component
 * - Gradient backgrounds
 * - Trend indicators
 * - Interactive hover effects
 * - Loading shimmer effect
 */
export function StatCard({
  title,
  value,
  change,
  period,
  icon: Icon,
  color = 'blue',
  trend,
  onClick,
  loading = false,
  gradient = true,
  className,
}: StatCardProps) {
  // Color configurations
  const colorConfig = {
    blue: {
      gradient: 'from-blue-500 to-blue-600',
      light: 'from-blue-50 to-blue-100',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      textLight: 'text-blue-100',
      textDark: 'text-blue-900',
      border: 'border-blue-200',
    },
    green: {
      gradient: 'from-green-500 to-green-600',
      light: 'from-green-50 to-green-100',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      textLight: 'text-green-100',
      textDark: 'text-green-900',
      border: 'border-green-200',
    },
    amber: {
      gradient: 'from-amber-500 to-amber-600',
      light: 'from-amber-50 to-amber-100',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      textLight: 'text-amber-100',
      textDark: 'text-amber-900',
      border: 'border-amber-200',
    },
    red: {
      gradient: 'from-red-500 to-red-600',
      light: 'from-red-50 to-red-100',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      textLight: 'text-red-100',
      textDark: 'text-red-900',
      border: 'border-red-200',
    },
    violet: {
      gradient: 'from-violet-500 to-violet-600',
      light: 'from-violet-50 to-violet-100',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      textLight: 'text-violet-100',
      textDark: 'text-violet-900',
      border: 'border-violet-200',
    },
    indigo: {
      gradient: 'from-indigo-500 to-indigo-600',
      light: 'from-indigo-50 to-indigo-100',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      textLight: 'text-indigo-100',
      textDark: 'text-indigo-900',
      border: 'border-indigo-200',
    },
    purple: {
      gradient: 'from-purple-500 to-purple-600',
      light: 'from-purple-50 to-purple-100',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      textLight: 'text-purple-100',
      textDark: 'text-purple-900',
      border: 'border-purple-200',
    },
  };

  const config = colorConfig[color];

  // Pre-compute hover background class for non-gradient cards
  const hoverBgClass = gradient ? null : config.iconBg.replace(/100/g, '200');

  // Determine trend from change string if not provided
  const detectedTrend = trend || (change?.includes('+') ? 'up' : change?.includes('-') ? 'down' : 'neutral');

  // Trend indicator
  const TrendIcon = () => {
    if (detectedTrend === 'up') {
      return (
        <div className="flex items-center gap-1 text-success-500">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span className="text-xs font-semibold">{change}</span>
        </div>
      );
    }
    if (detectedTrend === 'down') {
      return (
        <div className="flex items-center gap-1 text-error-500">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
          <span className="text-xs font-semibold">{change}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      onClick={onClick}
      className={clsx(
        'relative overflow-hidden rounded-xl shadow-md',
        'transition-all duration-300',
        'hover:shadow-xl hover:-translate-y-1',
        onClick && 'cursor-pointer active:scale-[0.98]',
        gradient
          ? `bg-gradient-to-br ${config.gradient} text-white`
          : `bg-white border-2 ${config.border}`,
        className
      )}
    >
      {/* Loading Shimmer */}
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      )}

      <div className="p-card relative z-10">
        <div className="flex items-center justify-between">
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className={clsx('text-sm font-medium mb-1', gradient ? config.textLight : 'text-gray-600')}>
              {title}
            </p>
            <p className={clsx('text-3xl font-bold mb-2', gradient ? 'text-white' : config.textDark + '')}>
              {loading ? (
                <span className="inline-block w-16 h-8 bg-white/20 rounded animate-pulse" />
              ) : (
                value
              )}
            </p>
            {(change || period) && (
              <div className="flex items-center gap-2">
                {change && <TrendIcon />}
                {period && (
                  <span className={clsx('text-xs', gradient ? config.textLight : 'text-gray-500')}>
                    {period}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Icon */}
          <div
            className={clsx(
              'w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0',
              'transition-all duration-300',
              'group-hover:scale-110 group-hover:rotate-3',
              gradient
                ? 'bg-white/20 backdrop-blur-sm group-hover:bg-white/30'
                : clsx(
                    config.iconBg,
                    config.iconColor,
                    hoverBgClass && 'group-hover:' + hoverBgClass
                  )
            )}
          >
            <Icon
              className={clsx(
                'w-8 h-8',
                gradient ? 'text-white' : config.iconColor,
                'transition-all duration-300',
                'group-hover:scale-110',
                'animate-pulse-slow'
              )}
            />
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      {gradient && (
        <>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12 blur-xl" />
        </>
      )}
    </div>
  );
}

