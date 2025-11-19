import React from 'react';
import clsx from 'clsx';

export interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

/**
 * Mobile-optimized Input Component
 * - Larger touch targets (min 44px)
 * - Better keyboard handling
 * - Optimized input types for mobile
 */
export const MobileInput = React.forwardRef<HTMLInputElement, MobileInputProps>(
  ({ label, error, helperText, fullWidth = true, className, type, ...props }, ref) => {
    // Optimize input type for mobile
    const optimizedType = React.useMemo(() => {
      if (type === 'number') return 'tel'; // Better mobile keyboard
      if (type === 'email') return 'email';
      if (type === 'tel') return 'tel';
      if (type === 'url') return 'url';
      return type || 'text';
    }, [type]);

    return (
      <div className={clsx('space-y-1', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={props.id}
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            {label}
            {props.required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          type={optimizedType}
          {...props}
          className={clsx(
            'w-full',
            'min-h-[44px]', // iOS touch target
            'px-4 py-3', // Larger padding for mobile
            'text-base', // Prevent iOS zoom (16px minimum)
            'border-2 rounded-xl',
            'bg-white',
            'transition-all duration-normal',
            'focus:outline-none focus:ring-2',
            error
              ? 'border-error-500 focus:border-error-500 focus:ring-error-200'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200',
            'touch-manipulation', // Better touch handling
            className
          )}
        />
        {error && (
          <p className="text-sm text-error-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-xs text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

MobileInput.displayName = 'MobileInput';


