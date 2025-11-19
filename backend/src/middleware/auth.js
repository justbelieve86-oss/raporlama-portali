const { supabase } = require('../supabase');
const { createAuthClient } = require('../supabaseAuth');
const logger = require('../utils/logger');

// Normalize role strings to compare reliably across accents/casing/spacing
function normalizeRole(role) {
  if (typeof role !== 'string') return '';
  try {
    // Remove diacritics (e.g., ö → o), lowercase, collapse spaces and replace separators
    return role
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch (_) {
    return String(role).toLowerCase().trim();
  }
}

// Roles treated as having admin privileges
const ADMIN_EQUIVALENT = new Set([
  'admin',
  'genel koordinator', // "Genel Koordinatör"
]);

async function requireAuth(req, res, next) {
  logger.debug('requireAuth middleware triggered for URL:', req.originalUrl);
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    
    if (!token) return res.status(401).json({ message: 'Eksik yetki: token yok' });

    // Token doğrulamasını ayrı bir auth client ile yapalım ki
    // global service client üzerinde Authorization header kalıcı olmasın
    const authClient = createAuthClient();
    const { data, error } = await authClient.auth.getUser(token);
    
    if (error || !data?.user) return res.status(401).json({ message: 'Geçersiz token' });

    req.user = data.user;
    // Rol bilgisini service role ile çalışan global client üzerinden okuyalım
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    req.role = profileData?.role || 'user';
    
    logger.debug('[requireAuth] User role loaded:', {
      userId: req.user.id,
      userEmail: req.user.email,
      role: req.role,
      profileData,
      profileError: profileError ? { message: profileError.message, code: profileError.code } : null
    });
    
    next();
  } catch (e) {
    logger.error('Auth middleware error:', e);
    res.status(500).json({ message: 'Kimlik doğrulama hatası' });
  }
}

async function requireAdmin(req, res, next) {
  const normalized = normalizeRole(req.role);
  
  // Admin equivalent roles have access to all admin routes
  if (ADMIN_EQUIVALENT.has(normalized)) {
    return next();
  }
  
  // For non-admin roles, check if they have access to this specific route via role_routes
  try {
    const requestedPath = req.path;
    // Convert API path to frontend route path (e.g., /api/admin/brands -> /admin/brands)
    const frontendPath = requestedPath.replace(/^\/api/, '');
    
    logger.debug('[requireAdmin] Checking access:', {
      userRole: req.role,
      requestedPath,
      frontendPath
    });
    
    // Check if this role has access to the frontend route
    const { data, error } = await supabase
      .from('role_routes')
      .select('route_path')
      .eq('role_name', req.role)
      .eq('route_path', frontendPath)
      .maybeSingle();
    
    logger.debug('[requireAdmin] Database query result:', {
      data,
      error: error ? { message: error.message, code: error.code } : null
    });
    
    if (error) {
      logger.error('Role route access check error in requireAdmin:', error);
      // On error, deny access (fail closed for admin routes)
      return res.status(403).json({ 
        success: false,
        status: 'fail',
        message: 'Admin yetkisi gerekli',
        code: 'FORBIDDEN'
      });
    }
    
    if (data) {
      // Route found in role_routes, allow access
      logger.debug('[requireAdmin] Access granted via role_routes');
      return next();
    }
    
    // No route found, deny access
    logger.debug('[requireAdmin] Access denied - route not found in role_routes');
    return res.status(403).json({ 
      success: false,
      status: 'fail',
      message: 'Admin yetkisi gerekli',
      code: 'FORBIDDEN'
    });
  } catch (e) {
    logger.error('requireAdmin exception:', e);
    // On exception, deny access (fail closed)
    return res.status(403).json({ 
      success: false,
      status: 'fail',
      message: 'Admin yetkisi gerekli',
      code: 'FORBIDDEN'
    });
  }
}

// Check if user's role has access to the requested route
async function checkRoleRouteAccess(req, res, next) {
  try {
    const userRole = req.role; // From requireAuth middleware
    const requestedPath = req.path;
    
    // Admin equivalent roles have access to all routes
    const normalized = normalizeRole(userRole);
    if (ADMIN_EQUIVALENT.has(normalized)) {
      return next();
    }
    
    // Check if this role has access to the requested route
    const { data, error } = await supabase
      .from('role_routes')
      .select('route_path')
      .eq('role_name', userRole)
      .eq('route_path', requestedPath)
      .maybeSingle();
    
    if (error) {
      logger.error('Role route access check error:', error);
      // On error, allow access (fail open for now, can be changed to fail closed)
      return next();
    }
    
    if (!data) {
      // No route found for this role - check if it's a user route (starts with /user)
      // For now, we'll allow access to /user routes if no explicit restriction exists
      // This maintains backward compatibility
      if (requestedPath.startsWith('/user')) {
        return next();
      }
      return res.status(403).json({ 
        success: false,
        status: 'fail',
        message: 'Bu sayfaya erişim yetkiniz yok',
        code: 'FORBIDDEN'
      });
    }
    
    // Route found, allow access
    next();
  } catch (e) {
    logger.error('Role route access check exception:', e);
    // On exception, allow access (fail open)
    next();
  }
}

module.exports = { requireAuth, requireAdmin, checkRoleRouteAccess };