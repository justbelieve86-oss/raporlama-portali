import React from 'react';
import clsx from 'clsx';

export interface AutoSaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  message?: string;
  className?: string;
}

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

function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

export function AutoSaveIndicator({ status, message, className }: AutoSaveIndicatorProps) {
  if (status === 'idle') return null;

  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          icon: <LoaderIcon className="w-4 h-4 animate-spin" />,
          text: message || 'Kaydediliyor...',
          color: 'text-info-600',
          bgColor: 'bg-info-50',
          borderColor: 'border-info-200',
        };
      case 'saved':
        return {
          icon: <CheckCircleIcon className="w-4 h-4" />,
          text: message || 'Kaydedildi',
          color: 'text-success-600',
          bgColor: 'bg-success-50',
          borderColor: 'border-success-200',
        };
      case 'error':
        return {
          icon: <XCircleIcon className="w-4 h-4" />,
          text: message || 'Kaydetme hatası',
          color: 'text-error-600',
          bgColor: 'bg-error-50',
          borderColor: 'border-error-200',
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-normal',
        config.bgColor,
        config.borderColor,
        config.color,
        className
      )}
    >
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
}

