/**
 * Production-safe logger utility for frontend
 * Development'ta tüm loglar gösterilir, production'da sadece error ve warn
 * Structured logging format kullanır
 */

// Astro'da import.meta.env kullanılır, fallback olarak process.env
const isDev = 
  (typeof import.meta !== 'undefined' && typeof (import.meta as any).env !== 'undefined' && !(import.meta as any).env?.PROD) ||
  (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost');

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: LogContext;
  timestamp: string;
}

function formatLogEntry(level: LogEntry['level'], message: string, context?: LogContext): LogEntry {
  return {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  };
}

function formatConsoleMessage(entry: LogEntry): string {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
  if (entry.context) {
    return `${prefix} ${entry.message} ${JSON.stringify(entry.context)}`;
  }
  return `${prefix} ${entry.message}`;
}

function normalizeContext(context?: LogContext | Error | unknown): LogContext | undefined {
  if (context instanceof Error) {
    return { error: context.message, stack: context.stack };
  } else if (context && typeof context === 'object') {
    return context as LogContext;
  } else if (context !== undefined) {
    return { value: context };
  }
  return undefined;
}

export const logger = {
  log: (message: string, context?: LogContext | Error | unknown) => {
    if (isDev) {
      const logContext = normalizeContext(context);
      const entry = formatLogEntry('log', message, logContext);
      console.log(formatConsoleMessage(entry));
    }
  },
  
  warn: (message: string, context?: LogContext | Error | unknown) => {
    const logContext = normalizeContext(context);
    const entry = formatLogEntry('warn', message, logContext);
    console.warn(formatConsoleMessage(entry));
  },
  
  error: (message: string, context?: LogContext | Error | unknown) => {
    const logContext = normalizeContext(context);
    const entry = formatLogEntry('error', message, logContext);
    console.error(formatConsoleMessage(entry));
    if (context instanceof Error) {
      console.error(context);
    }
  },
  
  debug: (message: string, context?: LogContext | Error | unknown) => {
    if (isDev) {
      const logContext = normalizeContext(context);
      const entry = formatLogEntry('debug', message, logContext);
      console.debug(formatConsoleMessage(entry));
    }
  },
  
  info: (message: string, context?: LogContext | Error | unknown) => {
    if (isDev) {
      const logContext = normalizeContext(context);
      const entry = formatLogEntry('info', message, logContext);
      console.info(formatConsoleMessage(entry));
    }
  }
};

