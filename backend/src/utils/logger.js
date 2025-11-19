/**
 * Production-safe logger utility with structured logging
 * Development'ta tüm loglar gösterilir, production'da sadece error ve warn
 * Structured logging format kullanır
 */

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Format log entry with structured data
 */
function formatLogEntry(level, message, context = {}) {
  return {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format console message from log entry
 */
function formatConsoleMessage(entry) {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
  if (entry.context && Object.keys(entry.context).length > 0) {
    return `${prefix} ${entry.message} ${JSON.stringify(entry.context)}`;
  }
  return `${prefix} ${entry.message}`;
}

const logger = {
  log: (message, context = {}) => {
    if (isDev) {
      const entry = formatLogEntry('log', message, context);
      console.log(formatConsoleMessage(entry));
    }
  },
  
  warn: (message, context = {}) => {
    const entry = formatLogEntry('warn', message, context);
    console.warn(formatConsoleMessage(entry));
  },
  
  error: (message, context = {}) => {
    // Production'da stack trace'i sadece context içinde göster (console'a direkt yazma)
    const safeContext = context instanceof Error 
      ? { 
          error: context.message, 
          // Stack trace sadece development'ta gösterilir
          ...(isDev ? { stack: context.stack } : {})
        } 
      : context;
    const entry = formatLogEntry('error', message, safeContext);
    console.error(formatConsoleMessage(entry));
    // Error objesini direkt console'a yazma (production'da stack trace sızıntısını önle)
    if (context instanceof Error && isDev) {
      console.error(context);
    }
  },
  
  debug: (message, context = {}) => {
    if (isDev) {
      const entry = formatLogEntry('debug', message, context);
      console.debug(formatConsoleMessage(entry));
    }
  },
  
  info: (message, context = {}) => {
    if (isDev) {
      const entry = formatLogEntry('info', message, context);
      console.info(formatConsoleMessage(entry));
    }
  }
};

module.exports = logger;

