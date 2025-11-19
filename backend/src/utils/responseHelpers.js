/**
 * Standardized API Response Helpers
 * Tüm API response'ları için tutarlı format sağlar
 */

/**
 * Başarılı response döndürür
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const sendSuccess = (res, data = null, message = 'İşlem başarılı', statusCode = 200) => {
  const response = {
    success: true,
    status: 'success',
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Oluşturma başarılı response döndürür
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} message - Success message
 */
const sendCreated = (res, data, message = 'Kayıt başarıyla oluşturuldu') => {
  return sendSuccess(res, data, message, 201);
};

/**
 * Hata response döndürür
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {string} code - Error code
 * @param {*} details - Additional error details
 */
const sendError = (res, message = 'Bir hata oluştu', statusCode = 400, code = null, details = null) => {
  const response = {
    success: false,
    status: statusCode >= 500 ? 'error' : 'fail',
    message,
    timestamp: new Date().toISOString()
  };

  if (code) {
    response.code = code;
  }

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};

/**
 * Validation error response döndürür
 * @param {Object} res - Express response object
 * @param {Array|string} errors - Validation errors
 * @param {string} message - Error message
 */
const sendValidationError = (res, errors, message = 'Doğrulama hatası') => {
  return sendError(res, message, 400, 'VALIDATION_ERROR', { errors });
};

/**
 * Not found error response döndürür
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const sendNotFound = (res, message = 'Kayıt bulunamadı') => {
  return sendError(res, message, 404, 'NOT_FOUND');
};

/**
 * Unauthorized error response döndürür
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const sendUnauthorized = (res, message = 'Yetkilendirme gerekli') => {
  return sendError(res, message, 401, 'UNAUTHORIZED');
};

/**
 * Forbidden error response döndürür
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const sendForbidden = (res, message = 'Bu işlem için yetkiniz bulunmuyor') => {
  return sendError(res, message, 403, 'FORBIDDEN');
};

/**
 * Conflict error response döndürür
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const sendConflict = (res, message = 'Kayıt zaten mevcut') => {
  return sendError(res, message, 409, 'CONFLICT');
};

/**
 * Internal server error response döndürür
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const sendInternalError = (res, message = 'Sunucu hatası') => {
  return sendError(res, message, 500, 'INTERNAL_SERVER_ERROR');
};

/**
 * Paginated response döndürür
 * @param {Object} res - Express response object
 * @param {Array} data - Response data
 * @param {Object} pagination - Pagination info
 * @param {string} message - Success message
 */
const sendPaginated = (res, data, pagination, message = 'Veriler başarıyla alındı') => {
  return sendSuccess(res, {
    items: data,
    pagination: {
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      total: pagination.total || 0,
      totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 10)),
      hasNext: pagination.hasNext || false,
      hasPrev: pagination.hasPrev || false
    }
  }, message);
};

/**
 * List response döndürür (pagination olmadan)
 * @param {Object} res - Express response object
 * @param {Array} data - Response data
 * @param {string} message - Success message
 */
const sendList = (res, data, message = 'Liste başarıyla alındı', total = null) => {
  return sendSuccess(res, {
    items: data,
    count: data.length,
    total: total !== null ? total : data.length
  }, message);
};

/**
 * Empty response döndürür (204 No Content)
 * @param {Object} res - Express response object
 */
const sendNoContent = (res) => {
  return res.status(204).send();
};

module.exports = {
  sendSuccess,
  sendCreated,
  sendError,
  sendValidationError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendConflict,
  sendInternalError,
  sendPaginated,
  sendList,
  sendNoContent
};