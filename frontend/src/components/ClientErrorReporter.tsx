import React from 'react';
import { logger } from '../lib/logger';

type CapturedError = { message: string; stack?: string; url?: string; time: string };

export default function ClientErrorReporter() {
  const [lastError, setLastError] = React.useState<CapturedError | null>(null);

  React.useEffect(() => {
    function handleError(event: ErrorEvent) {
      const err: CapturedError = {
        message: event.message ?? 'Bilinmeyen hata',
        stack: event.error?.stack,
        url: window.location.href,
        time: new Date().toISOString(),
      };
      logger.error('[ClientErrorReporter]', err);
      setLastError(err);
      // Optional: send to backend if available (non-blocking failure)
      // void fetch('/api/logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ level: 'error', ...err }) }).catch(() => {});
    }

    function handleRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const err: CapturedError = {
        message: (reason?.message ?? String(reason)) || 'Promise reddedildi',
        stack: reason?.stack,
        url: window.location.href,
        time: new Date().toISOString(),
      };
      logger.error('[ClientErrorReporter:unhandledrejection]', err);
      setLastError(err);
      // Optional: send to backend as above
    }

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (!lastError) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md" suppressHydrationWarning>
      <div className="rounded-md border border-red-200 bg-red-50 text-red-800 shadow-md">
        <div className="p-3">
          <p className="text-sm font-semibold">Sayfada bir hata oluştu</p>
          <p className="text-xs mt-1" suppressHydrationWarning>{lastError.message}</p>
          <p className="text-[11px] mt-2 text-red-700">Ayrıntılar geliştirici konsolunda (F12) görülebilir.</p>
        </div>
      </div>
    </div>
  );
}