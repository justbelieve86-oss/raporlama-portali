import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { toast } from '../hooks/useToast';
import { logger } from '../lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console and show toast notification
    logger.error('ErrorBoundary caught an error', { error, errorInfo });
    
    // Show user-friendly error toast
    const message = (error?.message && String(error.message).trim().length > 0)
      ? `Hata: ${error.message}`
      : 'Bir şeyler ters gitti. Sayfa yenilenerek sorunu çözmeyi deneyin.';

    toast.error({
      title: 'Beklenmeyen Hata',
      message,
      duration: 10000,
      action: {
        label: 'Detayı kopyala',
        onClick: () => {
          try {
            const details = [
              `Message: ${error?.message ?? ''}`,
              `Stack: ${error?.stack ?? ''}`,
              `ComponentStack: ${errorInfo?.componentStack ?? ''}`,
            ].join('\n');
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
              void navigator.clipboard.writeText(details);
            }
          } catch (e) {
            // Kopyalama hatası UI'yi bloklamasın
            logger.debug('ErrorBoundary: copy details failed', e);
          }
        }
      }
    });
  }

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI or default error message
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[200px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="mb-4">
              <svg 
                className="mx-auto h-12 w-12 text-red-500" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Bir şeyler ters gitti
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Bu bölümde beklenmeyen bir hata oluştu. Sayfa yenilenerek sorunu çözmeyi deneyin.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;