import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import type { ToastProps, ToastType } from './toast.types.js';

// Re-export types for backward compatibility
export type { ToastProps, ToastType };

const typeStyles = {
  success: {
    container: 'bg-white border-l-4 border-emerald-500 shadow-md',
    icon: 'text-emerald-500',
    title: 'text-gray-900',
    message: 'text-gray-600',
    closeButton: 'text-gray-400 hover:text-gray-600'
  },
  error: {
    container: 'bg-white border-l-4 border-red-500 shadow-md',
    icon: 'text-red-500',
    title: 'text-gray-900',
    message: 'text-gray-600',
    closeButton: 'text-gray-400 hover:text-gray-600'
  },
  warning: {
    container: 'bg-white border-l-4 border-amber-500 shadow-md',
    icon: 'text-amber-500',
    title: 'text-gray-900',
    message: 'text-gray-600',
    closeButton: 'text-gray-400 hover:text-gray-600'
  },
  info: {
    container: 'bg-white border-l-4 border-blue-500 shadow-md',
    icon: 'text-blue-500',
    title: 'text-gray-900',
    message: 'text-gray-600',
    closeButton: 'text-gray-400 hover:text-gray-600'
  }
};

const icons = {
  success: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  )
};

export default function Toast({ 
  id, 
  type, 
  title, 
  message, 
  duration = 3000, 
  onClose, 
  action 
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  const styles = typeStyles[type];

  return (
    <div
      className={clsx(
        'w-[calc(100vw-1.5rem)] sm:min-w-[320px] sm:max-w-sm rounded-lg pointer-events-auto overflow-hidden',
        'transition-all duration-300 ease-out',
        styles.container,
        {
          'translate-x-0 opacity-100 scale-100': isVisible && !isLeaving,
          'translate-x-full opacity-0 scale-95': !isVisible || isLeaving,
        }
      )}
    >
      <div className="p-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className={clsx('flex items-center justify-center w-8 h-8 rounded-full bg-opacity-10', 
              type === 'success' && 'bg-emerald-100',
              type === 'error' && 'bg-red-100',
              type === 'warning' && 'bg-amber-100',
              type === 'info' && 'bg-blue-100'
            )}>
              <div className={clsx('w-5 h-5', styles.icon)}>
                {icons[type]}
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className={clsx('text-sm font-semibold leading-tight', styles.title)}>
              {title}
            </p>
            {message && (
              <p className={clsx('mt-0.5 text-xs leading-tight', styles.message)}>
                {message}
              </p>
            )}
          </div>
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className={clsx(
                'inline-flex rounded-md p-1 transition-colors duration-200 hover:bg-gray-100',
                styles.closeButton
              )}
            >
              <span className="sr-only">Kapat</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        {action && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={action.onClick}
              className={clsx(
                'text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors',
                styles.title
              )}
            >
              {action.label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}