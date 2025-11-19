const validator = require('validator');
const { sendError } = require('../utils/responseHelpers');

/**
 * Generic validation middleware factory
 * @param {Object} schema - Validation schema
 * @returns {Function} Express middleware
 */
function validateInput(schema) {
  return (req, res, next) => {
    const errors = [];
    const data = { ...req.body, ...req.params, ...req.query };

    // Validate each field according to schema
    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      // Check required fields
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} alanı zorunludur`);
        continue;
      }

      // Skip validation if field is not required and empty
      if (!rules.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Type validation
      if (rules.type) {
        if (!validateType(value, rules.type)) {
          errors.push(`${field} alanı ${rules.type} tipinde olmalıdır`);
          continue;
        }
      }

      // Length validation
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} en az ${rules.minLength} karakter olmalıdır`);
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} en fazla ${rules.maxLength} karakter olmalıdır`);
      }

      // Email validation
      if (rules.email && !validator.isEmail(value)) {
        errors.push(`${field} geçerli bir email adresi olmalıdır`);
      }

      // URL validation
      if (rules.url && !validator.isURL(value)) {
        errors.push(`${field} geçerli bir URL olmalıdır`);
      }

      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} şu değerlerden biri olmalıdır: ${rules.enum.join(', ')}`);
      }

      // Numeric validations
      if (rules.min !== undefined && parseFloat(value) < rules.min) {
        errors.push(`${field} en az ${rules.min} olmalıdır`);
      }
      if (rules.max !== undefined && parseFloat(value) > rules.max) {
        errors.push(`${field} en fazla ${rules.max} olmalıdır`);
      }

      // Custom validation function
      if (rules.custom && typeof rules.custom === 'function') {
        const customError = rules.custom(value);
        if (customError) {
          errors.push(customError);
        }
      }

      // Sanitize input
      if (rules.sanitize) {
        if (typeof value === 'string') {
          // Basic XSS protection
          req.body[field] = validator.escape(value.trim());
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Validation hatası',
        errors: errors
      });
    }

    next();
  };
}

/**
 * Validation middleware adapter that returns errors in standardized API format
 * Uses the same validation rules as validateInput but responds via sendError.
 * @param {Object} schema - Validation schema
 * @returns {Function} Express middleware
 */
function validateWithSendError(schema) {
  return (req, res, next) => {
    const errors = [];
    const data = { ...req.body, ...req.params, ...req.query };

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} alanı zorunludur`);
        continue;
      }

      if (!rules.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      if (rules.type) {
        if (!validateType(value, rules.type)) {
          errors.push(`${field} alanı ${rules.type} tipinde olmalıdır`);
          continue;
        }
      }

      if (rules.minLength && String(value).length < rules.minLength) {
        errors.push(`${field} en az ${rules.minLength} karakter olmalıdır`);
      }
      if (rules.maxLength && String(value).length > rules.maxLength) {
        errors.push(`${field} en fazla ${rules.maxLength} karakter olmalıdır`);
      }

      if (rules.email && !validator.isEmail(String(value))) {
        errors.push(`${field} geçerli bir email adresi olmalıdır`);
      }

      if (rules.url && !validator.isURL(String(value))) {
        errors.push(`${field} geçerli bir URL olmalıdır`);
      }

      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} şu değerlerden biri olmalıdır: ${rules.enum.join(', ')}`);
      }

      if (rules.min !== undefined && parseFloat(value) < rules.min) {
        errors.push(`${field} en az ${rules.min} olmalıdır`);
      }
      if (rules.max !== undefined && parseFloat(value) > rules.max) {
        errors.push(`${field} en fazla ${rules.max} olmalıdır`);
      }

      if (rules.custom && typeof rules.custom === 'function') {
        const customError = rules.custom(value);
        if (customError) {
          errors.push(customError);
        }
      }

      if (rules.sanitize) {
        if (typeof value === 'string') {
          req.body[field] = validator.escape(value.trim());
        }
      }
    }

    if (errors.length > 0) {
      // BAD_REQUEST formatında standart hata döndür
      return sendError(res, 'Geçersiz istek', 400, 'BAD_REQUEST', { errors });
    }

    next();
  };
}

/**
 * Type validation helper
 * @param {*} value - Value to validate
 * @param {string} type - Expected type
 * @returns {boolean}
 */
function validateType(value, type) {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return !isNaN(parseFloat(value)) && isFinite(value);
    case 'integer':
      return Number.isInteger(parseFloat(value));
    case 'boolean':
      return typeof value === 'boolean' || value === 'true' || value === 'false';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'date':
      return validator.isISO8601(value) || !isNaN(Date.parse(value));
    case 'uuid':
      return validator.isUUID(value);
    default:
      return true;
  }
}

/**
 * Common validation schemas
 */
const schemas = {
  // User validation
  createUser: {
    email: { required: true, email: true, sanitize: true },
    password: { required: true, minLength: 6, maxLength: 100 },
    role: { enum: ['admin', 'user'] },
    username: { type: 'string', maxLength: 100, sanitize: true },
    full_name: { type: 'string', maxLength: 200, sanitize: true },
    brandIds: { type: 'array' } // Optional array of brand IDs
  },

  updateUser: {
    email: { email: true, sanitize: true },
    role: { type: 'string', minLength: 1, sanitize: true }
  },

  // Brand validation
  createBrand: {
    name: { required: true, type: 'string', minLength: 2, maxLength: 100, sanitize: true },
    description: { type: 'string', maxLength: 500, sanitize: true },
    status: { enum: ['aktif', 'pasif', 'kayitli'] },
    category_key: { type: 'string', minLength: 1, maxLength: 50, sanitize: true }
  },

  updateBrand: {
    name: { type: 'string', minLength: 2, maxLength: 100, sanitize: true },
    description: { type: 'string', maxLength: 500, sanitize: true },
    status: { enum: ['aktif', 'pasif', 'kayitli'] },
    category_key: { type: 'string', minLength: 1, maxLength: 50, sanitize: true }
  },

  // KPI validation
  createKpi: {
    name: { required: true, type: 'string', minLength: 2, maxLength: 100, sanitize: true },
    category: { required: true, type: 'string', minLength: 2, maxLength: 50, sanitize: true },
    unit: { required: true, type: 'string', minLength: 1, maxLength: 20, sanitize: true },
    status: { enum: ['aktif', 'pasif'] },
    ytd_calc: { enum: ['sum', 'avg', 'last'] }
  },

  updateKpi: {
    name: { type: 'string', minLength: 2, maxLength: 100, sanitize: true },
    category: { type: 'string', minLength: 2, maxLength: 50, sanitize: true },
    unit: { type: 'string', minLength: 1, maxLength: 20, sanitize: true },
    status: { enum: ['aktif', 'pasif'] },
    ytd_calc: { enum: ['sum', 'avg', 'last'] }
  },

  // KPI Report validation
  createKpiReport: {
    brand_id: { required: true, type: 'uuid' },
    kpi_id: { required: true, type: 'uuid' },
    month: { required: true, type: 'integer', min: 1, max: 12 },
    year: { required: true, type: 'integer', min: 2020, max: 2030 },
    value: { required: true, type: 'number', min: 0 }
  },

  updateKpiReport: {
    value: { type: 'number', min: 0 }
  },

  // Login validation
  login: {
    username: { required: true, type: 'string', minLength: 1, sanitize: true },
    password: { required: true, minLength: 1 }
  },

  verifyPassword: {
    email: { required: true, email: true, sanitize: true },
    password: { required: true, minLength: 1 }
  },

  resetPassword: {
    email: { required: true, email: true, sanitize: true }
  },

  // ID parameter validation
  idParam: {
    id: { required: true, type: 'uuid' }
  }
  ,
  // userId parameter validation (users rotaları için)
  userIdParam: {
    userId: { required: true, type: 'uuid' }
  }
  ,
  // Reports query validation (brand_id uuid, month/year range, optional day range)
  reportQuery: {
    brand_id: { required: true, type: 'uuid' },
    year: { required: true, type: 'integer', min: 1900, max: 2100 },
    month: { required: true, type: 'integer', min: 1, max: 12 },
    day: { type: 'integer', min: 1, max: 31 }
  }
  ,
  // Daily report create body (brand_id uuid, year/month/day range, kpi_id string, optional value)
  createDailyReport: {
    brand_id: { required: true, type: 'uuid' },
    year: { required: true, type: 'integer', min: 1900, max: 2100 },
    month: { required: true, type: 'integer', min: 1, max: 12 },
    day: { required: true, type: 'integer', min: 1, max: 31 },
    kpi_id: { required: true, type: 'string', minLength: 1 },
    value: { type: 'number', min: 0 }
  }
  ,
  // Monthly report create body (brand_id uuid, year/month range, kpi_id string, optional value)
  createMonthlyReport: {
    brand_id: { required: true, type: 'uuid' },
    year: { required: true, type: 'integer', min: 1900, max: 2100 },
    month: { required: true, type: 'integer', min: 1, max: 12 },
    kpi_id: { required: true, type: 'string', minLength: 1 },
    value: { type: 'number', min: 0 }
  }
  ,
  // Monthly report delete query (brand_id uuid, year/month range, kpi_id string)
  deleteMonthlyReport: {
    brand_id: { required: true, type: 'uuid' },
    year: { required: true, type: 'integer', min: 1900, max: 2100 },
    month: { required: true, type: 'integer', min: 1, max: 12 },
    kpi_id: { required: true, type: 'string', minLength: 1 }
  }
  ,
  // Monthly user reports query (brand_id, year, kpi_ids)
  monthlyUserQuery: {
    brand_id: { required: true, type: 'uuid' },
    year: { required: true, type: 'integer', min: 1900, max: 2100 },
    kpi_ids: { required: true, type: 'string', minLength: 1 }
  }
  ,
  // Create/Upsert brand KPI target (supports yearly and optional monthly)
  createTarget: {
    brand_id: { required: true, type: 'uuid' },
    year: { required: true, type: 'integer', min: 1900, max: 2100 },
    month: { type: 'integer', min: 1, max: 12 },
    kpi_id: { required: true, type: 'string', minLength: 1 },
    value: { type: 'number', min: 0 }
  }
  ,
  // Targets list query (brand_id, year, optional kpi_ids)
  targetsListQuery: {
    brand_id: { required: true, type: 'uuid' },
    year: { required: true, type: 'integer', min: 1900, max: 2100 },
    kpi_ids: { type: 'string', minLength: 1 }
  }
  ,
  // Targets delete query (brand_id, year, kpi_id as string)
  targetsDeleteQuery: {
    brand_id: { required: true, type: 'uuid' },
    year: { required: true, type: 'integer', min: 1900, max: 2100 },
    kpi_id: { required: true, type: 'string', minLength: 1 }
  }
  ,
  // Yearly targets query (brand_id, year, kpi_ids)
  targetsYearlyQuery: {
    brand_id: { required: true, type: 'uuid' },
    year: { required: true, type: 'integer', min: 1900, max: 2100 },
    kpi_ids: { required: true, type: 'string', minLength: 1 }
  },
  // Brand ID parameter validation
  brandIdParam: {
    brandId: { required: true, type: 'uuid' }
  },
  // KPI ID parameter validation
  kpiIdParam: {
    kpiId: { required: true, type: 'uuid' }
  },
  // KPI IDs query parameter (comma-separated UUIDs)
  kpiIdsQuery: {
    kpi_ids: { required: true, type: 'string', minLength: 1, custom: (value) => {
      // Validate that kpi_ids contains valid UUIDs (comma-separated)
      if (typeof value !== 'string') return 'kpi_ids string olmalıdır';
      const ids = value.split(',').map(s => s.trim()).filter(Boolean);
      if (ids.length === 0) return 'kpi_ids en az bir KPI ID içermelidir';
      for (const id of ids) {
        if (!validator.isUUID(id)) {
          return `Geçersiz KPI ID formatı: ${id}`;
        }
      }
      return null;
    }}
  },
  // Optional KPI IDs query parameter
  kpiIdsQueryOptional: {
    kpi_ids: { type: 'string', minLength: 1, custom: (value) => {
      if (!value) return null; // Optional, skip if empty
      const ids = String(value).split(',').map(s => s.trim()).filter(Boolean);
      for (const id of ids) {
        if (!validator.isUUID(id)) {
          return `Geçersiz KPI ID formatı: ${id}`;
        }
      }
      return null;
    }}
  },
  // KPI mapping create body
  createKpiMapping: {
    kpi_id: { required: true, type: 'uuid' }
  }
};

/**
 * Rate limiting validation
 */
function validateRateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) {
  const requests = new Map();

  return (req, res, next) => {
    const clientId = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old requests
    if (requests.has(clientId)) {
      const clientRequests = requests.get(clientId).filter(time => time > windowStart);
      requests.set(clientId, clientRequests);
    }

    const clientRequests = requests.get(clientId) || [];

    if (clientRequests.length >= maxRequests) {
      return res.status(429).json({
        message: 'Çok fazla istek. Lütfen daha sonra tekrar deneyin.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    clientRequests.push(now);
    requests.set(clientId, clientRequests);

    next();
  };
}

/**
 * File upload validation
 */
function validateFileUpload(options = {}) {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
    required = false
  } = options;

  return (req, res, next) => {
    if (!req.file && required) {
      return res.status(400).json({ message: 'Dosya yükleme zorunludur' });
    }

    if (req.file) {
      if (req.file.size > maxSize) {
        return res.status(400).json({
          message: `Dosya boyutu ${Math.round(maxSize / 1024 / 1024)}MB'dan küçük olmalıdır`
        });
      }

      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          message: `Desteklenen dosya türleri: ${allowedTypes.join(', ')}`
        });
      }
    }

    next();
  };
}

module.exports = {
  validateInput,
  validateWithSendError,
  schemas,
  validateRateLimit,
  validateFileUpload
};