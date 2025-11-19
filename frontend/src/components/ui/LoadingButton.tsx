import React from 'react';
import clsx from 'clsx';
import LoadingSpinner from './LoadingSpinner';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantClasses = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white border-transparent',
  secondary: 'bg-gray-600 hover:bg-gray-700 text-white border-transparent',
  danger: 'bg-red-600 hover:bg-red-700 text-white border-transparent',
  success: 'bg-green-600 hover:bg-green-700 text-white border-transparent',
  outline: 'bg-transparent hover:bg-gray-50 text-gray-700 border-gray-300'
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base'
};

const disabledClasses = {
  primary: 'bg-blue-400 cursor-not-allowed',
  secondary: 'bg-gray-400 cursor-not-allowed',
  danger: 'bg-red-400 cursor-not-allowed',
  success: 'bg-green-400 cursor-not-allowed',
  outline: 'bg-gray-100 text-gray-400 cursor-not-allowed'
};

export default function LoadingButton({
  loading = false,
  loadingText,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled,
  className,
  children,
  ...props
}: LoadingButtonProps) {
  const isDisabled = disabled || loading;
  
  return (
    <button
      {...props}
      disabled={isDisabled}
      className={clsx(
        'inline-flex items-center justify-center font-medium rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
        variantClasses[variant],
        sizeClasses[size],
        {
          [disabledClasses[variant]]: isDisabled,
          'w-full': fullWidth,
          'hover:bg-blue-700': variant === 'primary' && !isDisabled,
          'hover:bg-gray-700': variant === 'secondary' && !isDisabled,
          'hover:bg-red-700': variant === 'danger' && !isDisabled,
          'hover:bg-green-700': variant === 'success' && !isDisabled,
          'hover:bg-gray-50': variant === 'outline' && !isDisabled,
        },
        className
      )}
    >
      {loading && (
        <LoadingSpinner 
          size="sm" 
          color={variant === 'outline' ? 'gray' : 'white'} 
          className="mr-2" 
        />
      )}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}