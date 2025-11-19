const express = require('express');
const router = express.Router();
const { createAuthClient } = require('../supabaseAuth');
const { supabase } = require('../supabase');
const { validateInput, schemas } = require('../middleware/validation');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { 
  sendSuccess, 
  sendUnauthorized
} = require('../utils/responseHelpers');
const logger = require('../utils/logger');

// Kullanıcı adı veya e-posta ile giriş endpoint'i
// Not: loginLimiter middleware'i index.js'de /api/auth/login route'una uygulanıyor
router.post('/login', validateInput(schemas.login), catchAsync(async (req, res) => {
  const { username, password } = req.body;
  logger.debug('Login attempt for username/email:', username);

  if (!username) {
    logger.error('Username/email is required');
    throw new AppError('Kullanıcı adı veya e-posta gerekli', 400, 'USERNAME_REQUIRED');
  }

  // Kullanıcı adı mı yoksa e-posta mı olduğunu kontrol et
  let email = username;
  
  if (!username.includes('@')) {
    // Kullanıcı adı formatındaysa, Supabase RPC ile email çözümlemesini dene
    const normalized = String(username).trim();
    logger.debug('Resolving username via RPC:', normalized);
    let resolvedEmail = null;

    try {
      if (supabase && typeof supabase.rpc === 'function') {
        // Önce doğrudan eşleşme
        const { data: rpcEmail1, error: rpcErr1 } = await supabase.rpc('get_email_by_username', { p_username: normalized });
        if (rpcErr1) {
          logger.warn('RPC get_email_by_username error:', rpcErr1.message || rpcErr1);
        }
        resolvedEmail = rpcEmail1 || null;

        // Eşleşme yoksa küçük harfle tekrar dene (metadata lower-case ise)
        if (!resolvedEmail) {
          const { data: rpcEmail2, error: rpcErr2 } = await supabase.rpc('get_email_by_username', { p_username: normalized.toLowerCase() });
          if (rpcErr2) {
            logger.warn('RPC get_email_by_username (lower) error:', rpcErr2.message || rpcErr2);
          }
          resolvedEmail = rpcEmail2 || null;
        }
      }
    } catch (e) {
      logger.error('Username->email RPC resolution failed:', e?.message || e);
    }

    // Son çare olarak development ortamında statik eşleştirmeye geri dön
    // Production'da bu fallback kullanılmaz (güvenlik nedeniyle)
    if (!resolvedEmail) {
      const isProduction = process.env.NODE_ENV === 'production';
      
      if (!isProduction) {
        // Development/fallback mapping (sadece development ortamında)
        logger.debug('RPC did not resolve email, falling back to static map (development only)');
        const usernameToEmail = {
          'owner': 'owner@test.com',
          'admin': 'admin@example.com',
          'testuser': 'test@example.com',
          'hayri.kayar': 'hayrikaya1r@windowslive.com'
        };
        resolvedEmail = usernameToEmail[normalized] || null;
        
        if (resolvedEmail) {
          logger.warn(`Using development fallback mapping for username: ${normalized} -> ${resolvedEmail}`);
        }
      } else {
        // Production'da RPC başarısız olursa, fallback kullanma
        logger.error('RPC failed to resolve email in production, no fallback allowed');
      }
    }

    if (!resolvedEmail) {
      logger.error('Unknown username:', normalized);
      throw new AppError('Bilinmeyen kullanıcı adı', 401, 'INVALID_CREDENTIALS');
    }

    email = resolvedEmail;
    logger.debug('Mapped username to email:', email);
  }

  // Supabase ile doğrudan giriş yapmayı dene (anon/service auth client kullanarak)
  logger.debug('Attempting to sign in with Supabase using email:', email);
  const authClient = createAuthClient();
  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (authError) {
    logger.error('Supabase auth error:', authError.message);
    throw new AppError('Giriş bilgileri geçersiz', 401, 'INVALID_CREDENTIALS');
  }

  logger.debug('Supabase sign-in successful.');

  // Kullanıcının rolünü al
  const role = authData.user?.user_metadata?.role || 'user';
  logger.debug('User role:', role);

  // JWT token ve kullanıcı bilgilerini döndür
  logger.debug('Sending success response.');
  return sendSuccess(res, { 
    email: email,
    token: authData.session.access_token,
    refresh_token: authData.session.refresh_token,
    user: authData.user,
    role: role
  }, 'Giriş başarılı');
}));

// Şifre doğrulama endpoint'i
router.post('/verify-password', validateInput(schemas.verifyPassword), catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('E-posta ve şifre gerekli', 400, 'EMAIL_PASSWORD_REQUIRED');
  }

  const authClient = createAuthClient();
  const { data: _data, error } = await authClient.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    logger.error('Şifre doğrulama hatası:', error.message);
    return sendUnauthorized(res, 'Geçersiz şifre');
  }

  return sendSuccess(res, { verified: true }, 'Şifre doğrulandı');
}));

// Şifre sıfırlama e-postası gönderme endpoint'i
router.post('/reset-password', validateInput(schemas.resetPassword), catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('E-posta adresi gerekli', 400, 'EMAIL_REQUIRED');
  }

  logger.debug('Password reset request for email:', email);

  // Supabase auth client ile şifre sıfırlama e-postası gönder
  const authClient = createAuthClient();
  
  // Frontend URL'ini environment variable'dan al (redirect URL için)
  const frontendUrl = process.env.FRONTEND_URL || process.env.FRONTEND_URLS?.split(',')[0] || 'http://localhost:4321';
  const redirectUrl = `${frontendUrl}/reset-password?token=`;
  
  const { error } = await authClient.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });

  if (error) {
    logger.error('Şifre sıfırlama e-postası gönderme hatası:', error.message);
    // Güvenlik nedeniyle, e-posta mevcut olmasa bile başarılı mesajı döndür
    // (kullanıcı enumeration saldırılarını önlemek için)
    return sendSuccess(res, { sent: true }, 'Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama bağlantısı gönderildi');
  }

  logger.debug('Password reset email sent successfully');
  return sendSuccess(res, { sent: true }, 'Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama bağlantısı gönderildi');
}));

module.exports = router;