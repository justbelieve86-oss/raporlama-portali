import React, { useState } from 'react';
import clsx from 'clsx';

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  showValidationIcon?: boolean;
  required?: boolean;
}

export const FloatingLabelInput = React.forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  ({ label, error, helperText, showValidationIcon = false, required = false, className, id, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const inputId = id || `floating-label-input-${Math.random().toString(36).substr(2, 9)}`;
    const hasValue = Boolean(props.value || ('defaultValue' in props ? props.defaultValue : undefined));
    const isFloating = focused || hasValue;
    const isValid = showValidationIcon && hasValue && !error;
    const isInvalid = showValidationIcon && error;

    return (
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          placeholder=" "
          className={clsx(
            'peer w-full px-4 pt-6 pb-2 border-2 rounded-xl',
            'bg-gray-50 focus:bg-white',
            'transition-all duration-normal',
            'focus:outline-none',
            isFloating ? 'border-primary-500' : 'border-gray-300',
            error && 'border-error-500 focus:border-error-500',
            isValid && !error && 'border-success-500 focus:border-success-500',
            className
          )}
        />
        <label
          htmlFor={inputId}
          className={clsx(
            'absolute left-4 transition-all duration-normal pointer-events-none',
            isFloating
              ? 'top-2 text-xs font-medium text-primary-600'
              : 'top-4 text-gray-500',
            error && isFloating && 'text-error-600',
            isValid && !error && isFloating && 'text-success-600'
          )}
        >
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
        
        {/* Validation Icon */}
        {showValidationIcon && isFloating && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {isValid && (
              <CheckCircleIcon className="w-5 h-5 text-success-500" />
            )}
            {isInvalid && (
              <XCircleIcon className="w-5 h-5 text-error-500" />
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <p className="mt-1 text-sm text-error-600 flex items-center gap-1">
            <XCircleIcon className="w-4 h-4" />
            {error}
          </p>
        )}

        {/* Helper Text */}
        {helperText && !error && (
          <p className="mt-1 text-xs text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

FloatingLabelInput.displayName = 'FloatingLabelInput';

