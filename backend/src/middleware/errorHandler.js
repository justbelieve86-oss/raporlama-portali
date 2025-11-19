/**
 * Centralized Error Handling Middleware
 * Tüm hataları yakalar ve standart format ile döndürür
 */

class AppError extends Error {
  constructor(message, statusCode, code = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async error wrapper - async fonksiyonlardaki hataları yakalar
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Supabase hatalarını parse eder
 */
const handleSupabaseError = (error) => {
  let message = 'Veritabanı hatası oluştu';
  let statusCode = 500;
  let code = 'DATABASE_ERROR';

  // Supabase error codes
  switch (error.code) {
    case '23505': // Unique violation
      message = 'Bu kayıt zaten mevcut';
      statusCode = 409;
      code = 'DUPLICATE_ENTRY';
      break;
    case '23503': // Foreign key violation
      message = 'İlişkili kayıt bulunamadı';
      statusCode = 400;
      code = 'FOREIGN_KEY_VIOLATION';
      break;
    case '23502': // Not null violation
      message = 'Zorunlu alan eksik';
      statusCode = 400;
      code = 'MISSING_REQUIRED_FIELD';
      break;
    case '42P01': // Undefined table
      message = 'Tablo bulunamadı';
      statusCode = 500;
      code = 'TABLE_NOT_FOUND';
      break;
    case 'PGRST116': // No rows found
      message = 'Kayıt bulunamadı';
      statusCode = 404;
      code = 'NOT_FOUND';
      break;
    default:
      if (error.message) {
        message = error.message;
      }
  }

  return new AppError(message, statusCode, code, {
    originalError: error.code,
    hint: error.hint
  });
};

/**
 * JWT hatalarını parse eder
 */
const handleJWTError = () => {
  return new AppError('Geçersiz token. Lütfen tekrar giriş yapın.', 401, 'INVALID_TOKEN');
};

const handleJWTExpiredError = () => {
  return new AppError('Token süresi dolmuş. Lütfen tekrar giriş yapın.', 401, 'TOKEN_EXPIRED');
};

/**
 * Validation hatalarını parse eder
 */
const handleValidationError = (error) => {
  const errors = Object.values(error.errors).map(val => val.message);
  const message = `Geçersiz veri: ${errors.join('. ')}`;
  return new AppError(message, 400, 'VALIDATION_ERROR', { errors });
};

const logger = require('../utils/logger');

/**
 * Development ortamında detaylı hata bilgisi döndürür
 */
const sendErrorDev = (err, req, res) => {
  // API hatası
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      code: err.code,
      details: err.details,
      stack: err.stack,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method
    });
  }

  // Rendered website hatası
  logger.error('ERROR 💥', err);
  return res.status(err.statusCode).json({
    status: err.status,
    message: err.message
  });
};

/**
 * Production ortamında güvenli hata bilgisi döndürür
 */
const sendErrorProd = (err, req, res) => {
  // API hatası
  if (req.originalUrl.startsWith('/api')) {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        code: err.code,
        timestamp: new Date().toISOString()
      });
    }

    // Programming or other unknown error: don't leak error details
    // Production'da stack trace'i sadece logger'a yaz (console'a değil)
    logger.error('Internal server error (non-operational)', {
      message: err.message,
      code: err.code,
      path: req.originalUrl,
      method: req.method
      // Stack trace sadece development'ta logger tarafından gösterilir
    });
    return res.status(500).json({
      status: 'error',
      message: 'Bir şeyler ters gitti!',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  // Rendered website hatası
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }

  // Production'da stack trace'i sadece logger'a yaz (console'a değil)
  logger.error('Internal server error (non-operational)', {
    message: err.message,
    code: err.code,
    path: req.originalUrl,
    method: req.method
    // Stack trace sadece development'ta logger tarafından gösterilir
  });
  return res.status(500).json({
    status: 'error',
    message: 'Bir şeyler ters gitti!'
  });
};

/**
 * Global error handling middleware
 */
const globalErrorHandler = (err, req, res, _next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Supabase/PostgreSQL errors: yalnızca bilinen kodları parse et
    const knownPgCodes = ['23505', '23503', '23502', '42P01', 'PGRST116'];
    if (err.code && knownPgCodes.includes(String(err.code))) {
      error = handleSupabaseError(error);
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    // Validation errors
    if (err.name === 'ValidationError') error = handleValidationError(error);

    sendErrorProd(error, req, res);
  }
};

/**
 * 404 handler - Route bulunamadığında
 */
const notFoundHandler = (req, res, next) => {
  const err = new AppError(`Route bulunamadı: ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND');
  next(err);
};

/**
 * Unhandled promise rejection handler
 */
const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (err, _promise) => {
    logger.error('UNHANDLED PROMISE REJECTION! 💥 Shutting down...', {
      name: err?.name,
      message: err?.message,
      // Stack trace sadece development'ta gösterilir
      ...(process.env.NODE_ENV === 'development' && err?.stack ? { stack: err.stack } : {})
    });
    process.exit(1);
  });
};

/**
 * Uncaught exception handler
 */
const handleUncaughtException = () => {
  process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', {
      name: err?.name,
      message: err?.message,
      // Stack trace sadece development'ta gösterilir
      ...(process.env.NODE_ENV === 'development' && err?.stack ? { stack: err.stack } : {})
    });
    process.exit(1);
  });
};

/**
 * Graceful shutdown handler
 */
const handleGracefulShutdown = (server) => {
  const shutdown = (signal) => {
    console.log(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

module.exports = {
  AppError,
  catchAsync,
  globalErrorHandler,
  notFoundHandler,
  handleUnhandledRejection,
  handleUncaughtException,
  handleGracefulShutdown
};