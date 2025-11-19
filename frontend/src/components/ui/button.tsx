import * as React from 'react';
import clsx from 'clsx';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'default' | 'outline';
  size?: 'sm' | 'md' | 'lg';
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center rounded-md text-sm font-medium',
          'transition-all duration-200 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none',
          'transform hover:scale-105 active:scale-95',
          size === 'sm' && 'h-8 px-3 text-xs',
          size === 'md' && 'h-9 px-4',
          size === 'lg' && 'h-11 px-6 text-base',
          variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg',
          variant === 'default' && 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg',
          variant === 'secondary' && 'bg-gray-200 text-gray-900 hover:bg-gray-300 shadow-sm',
          variant === 'outline' && 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm',
          variant === 'ghost' && 'hover:bg-gray-100 text-gray-700 hover:text-gray-900',
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';