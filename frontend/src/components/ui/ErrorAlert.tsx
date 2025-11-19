import React from 'react';

type ErrorAlertProps = {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

export default function ErrorAlert({
  title = 'Bir hata oluştu',
  message,
  details,
  onRetry,
  retryLabel = 'Tekrar Dene',
  className = '',
}: ErrorAlertProps) {
  return (
    <div className={`rounded-lg border border-red-200 bg-red-50 p-4 ${className}`} role="alert">
      <div className="flex items-start gap-3">
        <div className="text-red-500 mt-0.5" aria-hidden>
          {/* Alert Icon */}
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12" y2="16" />
          </svg>
        </div>
        <div className="flex-1">
          {title && <h3 className="text-sm font-semibold text-red-700">{title}</h3>}
          <p className="text-sm text-red-700 mt-1">{message}</p>
          {details && <p className="text-xs text-red-600 mt-2">{details}</p>}
          {onRetry && (
            <div className="mt-3">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              >
                {retryLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}