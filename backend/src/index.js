const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { validateWithSendError, schemas } = require('./middleware/validation');

// Ortam değişkenlerini middleware importlarından ÖNCE yükleyin
dotenv.config();

// Logger'ı erken import et (validateEnv'de kullanılacak)
const logger = require('./utils/logger');

// Environment variables validation
function validateEnv() {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY'
  ];
  
  // Check for missing or empty values
  const missing = required.filter(key => {
    const value = process.env[key];
    return !value || (typeof value === 'string' && value.trim() === '');
  });
  
  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}. Production ortamında zorunludur.`);
  }
  
  // FRONTEND_URL veya FRONTEND_URLS en az birisi olmalı (production'da)
  if (process.env.NODE_ENV === 'production') {
    const hasFrontendUrl = process.env.FRONTEND_URL && process.env.FRONTEND_URL.trim() !== '';
    const hasFrontendUrls = process.env.FRONTEND_URLS && process.env.FRONTEND_URLS.trim() !== '';
    
    if (!hasFrontendUrl && !hasFrontendUrls) {
      throw new Error('FRONTEND_URL veya FRONTEND_URLS environment variable\'ı zorunludur. Production ortamında CORS yapılandırması için gereklidir.');
    }
  }
  
  if (missing.length > 0) {
    logger.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
  }
}

// Validate environment variables before starting server
validateEnv();

const { requireAuth } = require('./middleware/auth');
const { supabase } = require('./supabase');
const { 
  globalErrorHandler, 
  notFoundHandler, 
  handleUnhandledRejection, 
  handleUncaughtException,
  handleGracefulShutdown,
  catchAsync,
  AppError
} = require('./middleware/errorHandler');
const { sendList, sendSuccess } = require('./utils/responseHelpers');

const app = express();
const PORT = process.env.PORT || 4000;

// Güvenlik başlıkları
app.use(helmet());

// Sıkı CORS whitelist (production) ve esnek localhost izinleri (development)
const allowedOrigins = [];
// Tek origin (eski): FRONTEND_URL
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
// Çoklu origin (yeni): FRONTEND_URLS (virgülle ayrılmış)
if (process.env.FRONTEND_URLS) {
  try {
    const list = process.env.FRONTEND_URLS.split(',').map((s) => s.trim()).filter(Boolean);
    allowedOrigins.push(...list);
  } catch {
    // FRONTEND_URLS parse hatası - sessizce yoksay
  }
}

// Development ortamında localhost/127.0.0.1 üzerindeki tüm portları kabul et
const isDev = process.env.NODE_ENV !== 'production';
const devOriginRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

// Netlify preview URL pattern: https://{hash}--{site-name}.netlify.app
// Netlify production URL pattern: https://{site-name}.netlify.app
const netlifyPattern = /^https:\/\/[\w-]+(?:--[\w-]+)?\.netlify\.app$/;

app.use(cors({
  origin: function (origin, callback) {
    // Same-origin veya non-browser istekler için origin yok olabilir
    if (!origin) return callback(null, true);

    const normalize = (u) => (u || '').replace(/\/$/, '');
    const normalizedOrigin = normalize(origin);
    const normalizedAllowed = allowedOrigins.map(normalize);

    // Production whitelist: tam eşleşme
    if (normalizedAllowed.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    // Netlify URL'leri (production ve preview) - FRONTEND_URLS'de netlify.app varsa izin ver
    const hasNetlifyInAllowed = allowedOrigins.some(url => url.includes('netlify.app'));
    if (hasNetlifyInAllowed && netlifyPattern.test(origin)) {
      return callback(null, true);
    }

    // Development: localhost ve 127.0.0.1 üzerindeki tüm portlara izin ver
    if (isDev && devOriginRegex.test(origin)) {
      return callback(null, true);
    }
    
    logger.warn(`CORS: Origin izinli değil: ${origin}`, { allowedOrigins, normalizedAllowed });
    return callback(new Error('CORS: Origin izinli değil'), false);
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Brute force/enum koruması için rate limitler
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 dakika
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
const adminLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/me', requireAuth, catchAsync(async (req, res) => {
  // Kullanıcının yetkili markalarını da ekle
  const { data: brandLinks } = await supabase
    .from('user_brands')
    .select('brand_id')
    .eq('user_id', req.user.id);
  
  const brandIds = (brandLinks || []).map((r) => r.brand_id);
  let brands = [];
  if (brandIds.length > 0) {
    const { data: brandRows } = await supabase
      .from('brands')
      .select('id, name')
      .in('id', brandIds);
    brands = (brandRows || []).map((b) => ({ id: b.id, name: b.name }));
  }

  return sendSuccess(res, {
    user: req.user,
    role: req.role,
    brands: brands
  }, 'Kullanıcı bilgileri başarıyla alındı');
}));

const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminLimiter, adminRoutes);

const authRoutes = require('./routes/auth');
// Rate limiter'ı /api/auth/login route'una uygula
app.use('/api/auth/login', loginLimiter);
// Auth routes'u ekle (loginLimiter'dan sonra, route handler'lar çalışacak)
app.use('/api/auth', authRoutes);

const kpiOrderingRoutes = require('./routes/kpi-ordering');
app.use('/api/kpi-ordering', kpiOrderingRoutes);

const kpiRoutes = require('./routes/kpi');
app.use('/api', kpiRoutes);

const modelBasedSalesRoutes = require('./routes/model-based-sales');
app.use('/api', modelBasedSalesRoutes);

// Read-only brands list for authenticated users (shared with admin panel)
app.get('/api/brands', requireAuth, catchAsync(async (req, res) => {
  const brandCategory = typeof req.query?.brandCategory === 'string' ? req.query.brandCategory : undefined;
  // Only return brands the current user is authorized for via user_brands
  const { data: links, error: linkErr } = await supabase
    .from('user_brands')
    .select('brand_id')
    .eq('user_id', req.user.id);

  if (linkErr) {
    // If user_brands table does not exist yet, return empty list for UI continuity
    if (linkErr.code === '42P01' || /relation .* does not exist/i.test(linkErr.message || '')) {
      return sendList(res, [], 'Markalar alındı');
    }
    throw new AppError(`Yetkili markalar alınırken hata: ${linkErr.message}`, 500, 'USER_BRANDS_FETCH_FAILED');
  }

  const brandIds = (links || []).map((r) => r.brand_id);
  if (!brandIds.length) {
    return sendList(res, [], 'Markalar alındı');
  }

  let query = supabase
    .from('brands')
    .select('*')
    .in('id', brandIds)
    .order('name', { ascending: true });
  if (brandCategory) {
    query = query.eq('category_key', brandCategory);
  }

  let { data, error } = await query;

  // Fallback: category_key kolonu yoksa filtreyi kaldırarak tekrar dene
  if (error && (error.code === '42703' || /column .* does not exist/i.test(error.message || ''))) {
    const resp = await supabase
      .from('brands')
      .select('*')
      .in('id', brandIds)
      .order('name', { ascending: true });
    data = resp.data || [];
    error = resp.error || null;
  }

  if (error) {
    if (error.code === '42P01' || /relation .* does not exist/i.test(error.message || '')) {
      return sendList(res, [], 'Markalar alındı');
    }
    throw new AppError(`Markalar alınırken hata: ${error.message}`, 500, 'BRANDS_FETCH_FAILED');
  }
  return sendList(res, data || [], 'Markalar başarıyla alındı');
}));

app.get('/api/brands/:brandId/kpi-mappings', requireAuth, validateWithSendError(schemas.brandIdParam), catchAsync(async (req, res) => {
  const { brandId } = req.params;
  // Kullanıcının bu marka için yetkisi var mı kontrol et
  const { data: userBrand, error: userBrandError } = await supabase
    .from('user_brands')
    .select('brand_id')
    .eq('user_id', req.user.id)
    .eq('brand_id', brandId)
    .single();

  if (userBrandError || !userBrand) {
    throw new AppError('Bu marka için yetkiniz yok.', 403, 'FORBIDDEN');
  }

  // Önce brand_kpi_mappings tablosundan tüm KPI'ları çek (ortak liste)
  const { data: brandMappings, error: brandMapErr } = await supabase
    .from('brand_kpi_mappings')
    .select('kpi_id')
    .eq('brand_id', brandId);

  if (brandMapErr) {
    // brand_kpi_mappings tablosu yoksa veya hata varsa, tüm kullanıcıların user_brand_kpis verilerini birleştir
    logger.warn(`brand_kpi_mappings query failed, falling back to aggregated user_brand_kpis:`, brandMapErr);
    const { data: allUserMappings, error: userMapErr } = await supabase
      .from('user_brand_kpis')
      .select('kpi_id')
      .eq('brand_id', brandId);

    if (userMapErr) {
      throw new AppError(`KPI eşleştirmeleri alınırken hata: ${userMapErr.message}`, 500, 'KPI_MAPPINGS_FETCH_FAILED');
    }

    // Unique KPI ID'lerini al (tüm kullanıcıların eklediği KPI'ları birleştir)
    const uniqueKpiIds = new Set((allUserMappings || []).map(m => m.kpi_id));
    const uniqueMappings = Array.from(uniqueKpiIds).map(kpi_id => ({ kpi_id }));
    
    logger.debug(`[GET /api/brands/:brandId/kpi-mappings] Returning ${uniqueMappings.length} unique KPIs from user_brand_kpis (fallback)`);
    return sendList(res, uniqueMappings, 'KPI eşleştirmeleri başarıyla alındı');
  }

  // brand_kpi_mappings boşsa, tüm kullanıcıların user_brand_kpis verilerini birleştir
  if (!brandMappings || brandMappings.length === 0) {
    logger.debug(`[GET /api/brands/:brandId/kpi-mappings] brand_kpi_mappings is empty, aggregating from user_brand_kpis`);
    const { data: allUserMappings, error: userMapErr } = await supabase
      .from('user_brand_kpis')
      .select('kpi_id')
      .eq('brand_id', brandId);

    if (userMapErr) {
      // user_brand_kpis de yoksa, boş liste döndür
      logger.warn(`user_brand_kpis query also failed:`, userMapErr);
      return sendList(res, [], 'KPI eşleştirmeleri başarıyla alındı');
    }

    // Unique KPI ID'lerini al (tüm kullanıcıların eklediği KPI'ları birleştir)
    const uniqueKpiIds = new Set((allUserMappings || []).map(m => m.kpi_id));
    const uniqueMappings = Array.from(uniqueKpiIds).map(kpi_id => ({ kpi_id }));
    
    logger.debug(`[GET /api/brands/:brandId/kpi-mappings] Returning ${uniqueMappings.length} unique KPIs from user_brand_kpis (aggregated)`);
    return sendList(res, uniqueMappings, 'KPI eşleştirmeleri başarıyla alındı');
  }

  // brand_kpi_mappings'ten gelen verileri kullan (ortak liste)
  logger.debug(`[GET /api/brands/:brandId/kpi-mappings] Returning ${brandMappings.length} KPIs from brand_kpi_mappings`);
  return sendList(res, brandMappings || [], 'KPI eşleştirmeleri başarıyla alındı');
}));

// KPI eşleştirmesi ekle (ortak liste - brand_kpi_mappings tablosuna)
// Bir kullanıcı KPI eklediğinde, tüm kullanıcılar görebilir
app.post('/api/brands/:brandId/kpi-mappings', requireAuth, validateWithSendError({ ...schemas.brandIdParam, ...schemas.createKpiMapping }), catchAsync(async (req, res) => {
  const { brandId } = req.params;
  const { kpi_id } = req.body || {};
  
  // Yetki kontrolü: kullanıcı bu markaya erişebiliyor mu?
  const { data: userBrand, error: userBrandError } = await supabase
    .from('user_brands')
    .select('brand_id')
    .eq('user_id', req.user.id)
    .eq('brand_id', brandId)
    .single();

  if (userBrandError || !userBrand) {
    throw new AppError('Bu marka için yetkiniz yok.', 403, 'FORBIDDEN');
  }

  // Önce brand_kpi_mappings tablosunda zaten var mı kontrol et (ortak liste)
  const { data: existingBrand, error: checkBrandErr } = await supabase
    .from('brand_kpi_mappings')
    .select('id')
    .eq('brand_id', brandId)
    .eq('kpi_id', kpi_id)
    .limit(1);
  
  if (checkBrandErr && checkBrandErr.code !== '42P01' && !/relation .* does not exist/i.test(checkBrandErr.message || '')) {
    throw new AppError(`Mevcut eşleştirme kontrolü başarısız: ${checkBrandErr.message}`, 500, 'KPI_MAPPING_CHECK_FAILED');
  }
  
  if (existingBrand && existingBrand.length > 0) {
    return sendSuccess(res, null, 'KPI zaten bu marka için atanmış');
  }

  // brand_kpi_mappings tablosuna ekle (ortak liste)
  const { error: insertBrandErr } = await supabase
    .from('brand_kpi_mappings')
    .insert({ brand_id: brandId, kpi_id });
  
  if (insertBrandErr) {
    // brand_kpi_mappings tablosu yoksa, user_brand_kpis'e fallback yap (geriye dönük uyumluluk)
    if (insertBrandErr.code === '42P01' || /relation .* does not exist/i.test(insertBrandErr.message || '')) {
      logger.warn('brand_kpi_mappings table does not exist, falling back to user_brand_kpis');
      
      // user_brand_kpis'te zaten var mı kontrol et
      const { data: existingUser, error: checkUserErr } = await supabase
        .from('user_brand_kpis')
        .select('id')
        .eq('user_id', req.user.id)
        .eq('brand_id', brandId)
        .eq('kpi_id', kpi_id)
        .limit(1);
      
      if (checkUserErr) {
        throw new AppError(`Mevcut eşleştirme kontrolü başarısız: ${checkUserErr.message}`, 500, 'KPI_MAPPING_CHECK_FAILED');
      }
      
      if (existingUser && existingUser.length > 0) {
        return sendSuccess(res, null, 'KPI zaten bu marka için atanmış');
      }

      // user_brand_kpis tablosuna ekle (fallback)
      const { error: insertUserErr } = await supabase
        .from('user_brand_kpis')
        .insert({ user_id: req.user.id, brand_id: brandId, kpi_id });
      
      if (insertUserErr) {
        throw new AppError(`KPI eşlemesi eklenemedi: ${insertUserErr.message}`, 500, 'KPI_MAPPING_INSERT_FAILED');
      }
      
      return sendSuccess(res, null, 'KPI bu marka için başarıyla eklendi');
    }
    
    // Diğer hatalar için
    throw new AppError(`KPI eşlemesi eklenemedi: ${insertBrandErr.message}`, 500, 'KPI_MAPPING_INSERT_FAILED');
  }

  return sendSuccess(res, null, 'KPI bu marka için başarıyla eklendi');
}));

// KPI eşleştirmesi sil (ortak liste - brand_kpi_mappings tablosundan)
// Bir kullanıcı KPI sildiğinde, tüm kullanıcılar için silinir
app.delete('/api/brands/:brandId/kpi-mappings/:kpiId', requireAuth, validateWithSendError({ ...schemas.brandIdParam, ...schemas.kpiIdParam }), catchAsync(async (req, res) => {
  const { brandId, kpiId } = req.params;
  
  // Yetki kontrolü
  const { data: userBrand, error: userBrandError } = await supabase
    .from('user_brands')
    .select('brand_id')
    .eq('user_id', req.user.id)
    .eq('brand_id', brandId)
    .single();

  if (userBrandError || !userBrand) {
    throw new AppError('Bu marka için yetkiniz yok.', 403, 'FORBIDDEN');
  }

  // Önce brand_kpi_mappings tablosundan sil (ortak liste)
  const { error: deleteBrandErr } = await supabase
    .from('brand_kpi_mappings')
    .delete()
    .match({ brand_id: brandId, kpi_id: kpiId });

  if (deleteBrandErr) {
    // brand_kpi_mappings tablosu yoksa, user_brand_kpis'ten sil (geriye dönük uyumluluk)
    if (deleteBrandErr.code === '42P01' || /relation .* does not exist/i.test(deleteBrandErr.message || '')) {
      logger.warn('brand_kpi_mappings table does not exist, falling back to user_brand_kpis');
      
      const { error: deleteUserErr } = await supabase
        .from('user_brand_kpis')
        .delete()
        .match({ user_id: req.user.id, brand_id: brandId, kpi_id: kpiId });

      if (deleteUserErr) {
        throw new AppError(`KPI eşlemesi silinemedi: ${deleteUserErr.message}`, 500, 'KPI_MAPPING_DELETE_FAILED');
      }
    } else {
      throw new AppError(`KPI eşlemesi silinemedi: ${deleteBrandErr.message}`, 500, 'KPI_MAPPING_DELETE_FAILED');
    }
  }

  // İsteğe bağlı: tüm kullanıcıların sıralamasından da kaldır (ortak liste olduğu için)
  try {
    await supabase
      .from('user_kpi_ordering')
      .delete()
      .match({ brand_id: brandId, kpi_id: kpiId });
  } catch (e) {
    // Ordering silinemezse kritik değil; logla
    logger.warn('KPI ordering temizlenemedi:', e?.message || e);
  }

  return sendSuccess(res, null, 'KPI bu marka için başarıyla silindi');
}));

app.get('/api/kpis/details', requireAuth, validateWithSendError(schemas.kpiIdsQuery), catchAsync(async (req, res) => {
  const { kpi_ids } = req.query;
  const kpiIds = String(kpi_ids).split(',').map(s => s.trim()).filter(Boolean);
  const { data, error } = await supabase
    .from('kpis')
    .select('*')
    .in('id', kpiIds);
  if (error) {
    throw new AppError(`KPI detayları alınırken hata: ${error.message}`, 500, 'KPI_DETAILS_FETCH_FAILED');
  }
  return sendList(res, data);
}));

// Kullanıcının yetkili olduğu markadaki KPI'ları getir


// Kümülatif kaynak ilişkileri
app.get('/api/kpis/cumulative_sources', requireAuth, validateWithSendError(schemas.kpiIdsQueryOptional), catchAsync(async (req, res) => {
  const { kpi_ids } = req.query;
  if (!kpi_ids) {
    return sendList(res, [], 'Kümülatif kaynaklar alındı');
  }
  const ids = String(kpi_ids).split(',').map(s => s.trim()).filter(Boolean);
  const { data, error } = await supabase
    .from('kpi_cumulative_sources')
    .select('kpi_id, source_kpi_id')
    .in('kpi_id', ids);
  if (error) {
    if (error.code === '42P01' || /relation .* does not exist/i.test(error.message || '')) {
      return sendList(res, [], 'Kümülatif kaynaklar alındı');
    }
    throw new AppError(`Kümülatif kaynaklar alınırken hata: ${error.message}`, 500, 'KPI_SOURCES_FETCH_FAILED');
  }
  return sendList(res, data || [], 'Kümülatif kaynaklar başarıyla alındı');
}));

// KPI formülleri
app.get('/api/kpis/formulas', requireAuth, validateWithSendError(schemas.kpiIdsQueryOptional), catchAsync(async (req, res) => {
  const { kpi_ids } = req.query;
  if (!kpi_ids) {
    return sendList(res, [], 'KPI formülleri alındı');
  }
  const ids = String(kpi_ids).split(',').map(s => s.trim()).filter(Boolean);
  const { data, error } = await supabase
    .from('kpi_formulas')
    .select('kpi_id, expression, display_expression')
    .in('kpi_id', ids);
  if (error) {
    if (error.code === '42P01' || /relation .* does not exist/i.test(error.message || '')) {
      return sendList(res, [], 'KPI formülleri alındı');
    }
    throw new AppError(`KPI formülleri alınırken hata: ${error.message}`, 500, 'KPI_FORMULAS_FETCH_FAILED');
  }
  return sendList(res, data || [], 'KPI formülleri başarıyla alındı');
}));

// Günlük raporlar (liste)
// Tüm kullanıcılar markaya yetkisi varsa tüm verileri görebilir (user_id filtresi yok)
app.get('/api/reports/daily', requireAuth, validateWithSendError(schemas.reportQuery), catchAsync(async (req, res) => {
  const { brand_id, year, month, day, kpi_ids } = req.query;
  
  logger.debug(`[GET /api/reports/daily] Request: brandId=${brand_id}, year=${year}, month=${month}, day=${day}, kpi_ids=${kpi_ids}, userId=${req.user.id}`);
  
  // Kullanıcının bu marka için yetkisi var mı kontrol et
  const { data: userBrand, error: userBrandError } = await supabase
    .from('user_brands')
    .select('brand_id')
    .eq('user_id', req.user.id)
    .eq('brand_id', brand_id)
    .single();

  if (userBrandError || !userBrand) {
    logger.debug(`[GET /api/reports/daily] Authorization failed for userId=${req.user.id}, brandId=${brand_id}`);
    throw new AppError('Bu marka için yetkiniz yok.', 403, 'FORBIDDEN');
  }
  
  logger.debug(`[GET /api/reports/daily] Authorization OK for userId=${req.user.id}, brandId=${brand_id}`);
  
  // user_id filtresi kaldırıldı - tüm kullanıcıların verilerini göster
  // Aynı (brand_id, kpi_id, year, month, day) için birden fazla kayıt olabilir (her kullanıcının ayrı kaydı)
  // En son güncellenen kaydı almak için DISTINCT ON kullanıyoruz
  let query = supabase
    .from('kpi_daily_reports')
    .select('kpi_id, year, month, day, value, updated_at, user_id')
    .eq('brand_id', brand_id)
    .eq('year', year)
    .eq('month', month)
    .order('updated_at', { ascending: false }); // En son güncellenen kayıtlar önce

  if (day) query = query.eq('day', day);
  if (kpi_ids) {
    const ids = String(kpi_ids).split(',').map(s => s.trim()).filter(Boolean);
    query = query.in('kpi_id', ids);
  }

  const { data, error } = await query;
  if (error) {
    logger.error(`[GET /api/reports/daily] Database error:`, error);
    throw new AppError(`Günlük raporlar alınırken hata: ${error.message}`, 500, 'DAILY_REPORTS_FETCH_FAILED');
  }

  logger.debug(`[GET /api/reports/daily] Raw data from DB: ${(data || []).length} records`);
  if (data && data.length > 0) {
    logger.debug(`[GET /api/reports/daily] Sample records (first 3):`, data.slice(0, 3).map(r => `kpi=${r.kpi_id}, day=${r.day}, value=${r.value}, user=${r.user_id}`));
  }

  // Aynı (kpi_id, year, month, day) için en son güncellenen kaydı al (ortak veri)
  const latestMap = new Map();
  (data || []).forEach((r) => {
    const key = `${r.kpi_id}-${r.year}-${r.month}-${r.day}`;
    const existing = latestMap.get(key);
    if (!existing || new Date(r.updated_at) > new Date(existing.updated_at)) {
      latestMap.set(key, r);
    }
  });

  logger.debug(`[GET /api/reports/daily] After deduplication: ${latestMap.size} unique records`);

  // frontend gün hesaplaması için report_date alanını üretelim
  const rows = Array.from(latestMap.values()).map((r) => ({
    kpi_id: r.kpi_id,
    value: r.value,
    report_date: `${r.year}-${String(r.month).padStart(2, '0')}-${String(r.day).padStart(2, '0')}`,
  }));
  
  logger.debug(`[GET /api/reports/daily] Returning ${rows.length} daily reports`);
  return sendList(res, rows, 'Günlük raporlar başarıyla alındı');
}));

// Günlük rapor kaydet (upsert)
app.post('/api/reports/daily', requireAuth, validateWithSendError(schemas.createDailyReport), catchAsync(async (req, res) => {
  const { brand_id, year, month, day, kpi_id, value } = req.body || {};
  const row = { user_id: req.user.id, brand_id, kpi_id, year, month, day, value: value == null ? 0 : Number(value) };
  const { error } = await supabase
    .from('kpi_daily_reports')
    .upsert(row);
  if (error) {
    throw new AppError(`Günlük rapor kaydedilirken hata: ${error.message}`, 500, 'DAILY_REPORT_SAVE_FAILED');
  }
  return sendSuccess(res, null, 'Günlük rapor başarıyla kaydedildi');
}));

// Aylık raporlar (liste - only_cumulative override için)
// Tüm kullanıcılar markaya yetkisi varsa tüm verileri görebilir (user_id filtresi yok)
app.get('/api/reports/monthly', requireAuth, validateWithSendError(schemas.reportQuery), catchAsync(async (req, res) => {
  const { brand_id, year, month, kpi_ids } = req.query;
  
  // Kullanıcının bu marka için yetkisi var mı kontrol et
  const { data: userBrand, error: userBrandError } = await supabase
    .from('user_brands')
    .select('brand_id')
    .eq('user_id', req.user.id)
    .eq('brand_id', brand_id)
    .single();

  if (userBrandError || !userBrand) {
    throw new AppError('Bu marka için yetkiniz yok.', 403, 'FORBIDDEN');
  }
  
  // user_id filtresi kaldırıldı - tüm kullanıcıların verilerini göster
  // Aynı (brand_id, kpi_id, year, month) için birden fazla kayıt olabilir (her kullanıcının ayrı kaydı)
  // En son güncellenen kaydı almak için updated_at ile sıralıyoruz
  let query = supabase
    .from('kpi_reports')
    .select('kpi_id, value, updated_at')
    .eq('brand_id', brand_id)
    .eq('year', year)
    .eq('month', month)
    .order('updated_at', { ascending: false }); // En son güncellenen kayıtlar önce
  if (kpi_ids) {
    const ids = String(kpi_ids).split(',').map(s => s.trim()).filter(Boolean);
    query = query.in('kpi_id', ids);
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError(`Aylık raporlar alınırken hata: ${error.message}`, 500, 'MONTHLY_REPORTS_FETCH_FAILED');
  }

  // Aynı (kpi_id, year, month) için en son güncellenen kaydı al (ortak veri)
  const latestMap = new Map();
  (data || []).forEach((r) => {
    const key = `${r.kpi_id}-${year}-${month}`;
    const existing = latestMap.get(key);
    if (!existing || new Date(r.updated_at) > new Date(existing.updated_at)) {
      latestMap.set(key, r);
    }
  });

  // updated_at alanını kaldır, sadece kpi_id, value döndür
  const rows = Array.from(latestMap.values()).map((r) => ({
    kpi_id: r.kpi_id,
    value: r.value,
  }));

  return sendList(res, rows, 'Aylık raporlar başarıyla alındı');
}));

// Aylık rapor kaydet (upsert)
app.post('/api/reports/monthly', requireAuth, validateWithSendError(schemas.createMonthlyReport), catchAsync(async (req, res) => {
  const { brand_id, year, month, kpi_id, value } = req.body || {};
  const row = { user_id: req.user.id, brand_id, kpi_id, year, month, value: value == null ? 0 : Number(value) };
  const { error } = await supabase
    .from('kpi_reports')
    .upsert(row);
  if (error) {
    throw new AppError(`Aylık rapor kaydedilirken hata: ${error.message}`, 500, 'MONTHLY_REPORT_SAVE_FAILED');
  }
  return sendSuccess(res, null, 'Aylık rapor başarıyla kaydedildi');
}));

// Aylık rapor sil (delete)
app.delete('/api/reports/monthly', requireAuth, validateWithSendError(schemas.deleteMonthlyReport), catchAsync(async (req, res) => {
  const { brand_id, year, month, kpi_id } = req.query || {};
  const { error } = await supabase
    .from('kpi_reports')
    .delete()
    .match({ user_id: req.user.id, brand_id, year, month, kpi_id });
  if (error) {
    throw new AppError(`Aylık rapor silinirken hata: ${error.message}`, 500, 'MONTHLY_REPORT_DELETE_FAILED');
  }
  return sendSuccess(res, null, 'Aylık rapor başarıyla silindi');
}));

// Marka/Yıl hedefleri
app.get('/api/targets', requireAuth, validateWithSendError(schemas.targetsListQuery), catchAsync(async (req, res) => {
  const { brand_id, year, kpi_ids } = req.query;
  // Kullanıcı yetkisi kontrolü
  const { data: userBrand, error: userBrandError } = await supabase
    .from('user_brands')
    .select('brand_id')
    .eq('user_id', req.user.id)
    .eq('brand_id', brand_id)
    .single();
  if (userBrandError || !userBrand) {
    throw new AppError('Bu marka için yetkiniz yok.', 403, 'FORBIDDEN');
  }

  let query = supabase
    .from('brand_kpi_targets')
    .select('kpi_id, target')
    .eq('brand_id', brand_id)
    .eq('year', year);
  if (kpi_ids) {
    const cleanedIds = String(kpi_ids)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    query = query.in('kpi_id', cleanedIds);
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError(`Hedefler alınırken hata: ${error.message}`, 500, 'TARGETS_FETCH_FAILED');
  }
  return sendList(res, data || [], 'Hedefler başarıyla alındı');
}));

// Marka hedef kaydet (upsert) — yıllık hedef, opsiyonel aylık desteği
app.post('/api/targets', requireAuth, validateWithSendError(schemas.createTarget), catchAsync(async (req, res) => {
  const { brand_id, year, month: _month, kpi_id, value } = req.body || {};
  // Kullanıcı yetkisi kontrolü
  const { data: userBrand, error: userBrandError } = await supabase
    .from('user_brands')
    .select('brand_id')
    .eq('user_id', req.user.id)
    .eq('brand_id', brand_id)
    .single();
  if (userBrandError || !userBrand) {
    throw new AppError('Bu marka için yetkiniz yok.', 403, 'FORBIDDEN');
  }

  // Not: Şu an hedefler yıllık bazda tutuluyor; month sağlansa da ignore edilir.
  const row = { brand_id, year, kpi_id, target: value == null ? 0 : Number(value) };
  const { error } = await supabase
    .from('brand_kpi_targets')
    .upsert(row);
  if (error) {
    throw new AppError(`Hedef kaydedilirken hata: ${error.message}`, 500, 'TARGET_SAVE_FAILED');
  }
  return sendSuccess(res, null, 'Hedef başarıyla kaydedildi');
}));

// Marka/Yıl hedef sil (delete)
app.delete('/api/targets', requireAuth, validateWithSendError(schemas.targetsDeleteQuery), catchAsync(async (req, res) => {
  const { brand_id, year, kpi_id } = req.query || {};
  // Kullanıcı yetkisi kontrolü
  const { data: userBrand, error: userBrandError } = await supabase
    .from('user_brands')
    .select('brand_id')
    .eq('user_id', req.user.id)
    .eq('brand_id', brand_id)
    .single();
  if (userBrandError || !userBrand) {
    throw new AppError('Bu marka için yetkiniz yok.', 403, 'FORBIDDEN');
  }

  const { error } = await supabase
    .from('brand_kpi_targets')
    .delete()
    .match({ brand_id, year, kpi_id });
  if (error) {
    throw new AppError(`Hedef silinirken hata: ${error.message}`, 500, 'TARGET_DELETE_FAILED');
  }

  return sendSuccess(res, null, 'Hedef başarıyla silindi');
}));

app.get('/api/targets/yearly', requireAuth, validateWithSendError(schemas.targetsYearlyQuery), catchAsync(async (req, res) => {
  const { brand_id, year, kpi_ids } = req.query;
  const kpiIds = String(kpi_ids).split(',').map(s => s.trim()).filter(Boolean);
  const { data, error } = await supabase
    .from('brand_kpi_targets')
    .select('kpi_id, target')
    .eq('brand_id', brand_id)
    .eq('year', year)
    .in('kpi_id', kpiIds);
  if (error) {
    throw new AppError(`Yıllık hedefler alınırken hata: ${error.message}`, 500, 'YEARLY_TARGETS_FETCH_FAILED');
  }
  return sendList(res, data);
}));

// Aylık raporlar (kullanıcı bazlı - tüm aylar için)
// Tüm kullanıcılar markaya yetkisi varsa tüm verileri görebilir (user_id filtresi yok)
app.get('/api/reports/monthly/user', requireAuth, validateWithSendError(schemas.monthlyUserQuery), catchAsync(async (req, res) => {
  const { brand_id, year, kpi_ids } = req.query;
  
  // Kullanıcının bu marka için yetkisi var mı kontrol et
  const { data: userBrand, error: userBrandError } = await supabase
    .from('user_brands')
    .select('brand_id')
    .eq('user_id', req.user.id)
    .eq('brand_id', brand_id)
    .single();

  if (userBrandError || !userBrand) {
    throw new AppError('Bu marka için yetkiniz yok.', 403, 'FORBIDDEN');
  }
  
  const kpiIds = String(kpi_ids).split(',').map(s => s.trim()).filter(Boolean);
  // user_id filtresi kaldırıldı - tüm kullanıcıların verilerini göster
  // Aynı (brand_id, kpi_id, year, month) için birden fazla kayıt olabilir (her kullanıcının ayrı kaydı)
  // En son güncellenen kaydı almak için updated_at ile sıralıyoruz
  const { data, error } = await supabase
    .from('kpi_reports')
    .select('kpi_id, month, value, updated_at')
    .eq('brand_id', brand_id)
    .eq('year', year)
    .in('kpi_id', kpiIds)
    .order('updated_at', { ascending: false }); // En son güncellenen kayıtlar önce
  if (error) {
    throw new AppError(`Aylık raporlar alınırken hata: ${error.message}`, 500, 'MONTHLY_USER_REPORTS_FETCH_FAILED');
  }

  // Aynı (kpi_id, year, month) için en son güncellenen kaydı al (ortak veri)
  const latestMap = new Map();
  (data || []).forEach((r) => {
    const key = `${r.kpi_id}-${r.year || year}-${r.month}`;
    const existing = latestMap.get(key);
    if (!existing || new Date(r.updated_at) > new Date(existing.updated_at)) {
      latestMap.set(key, r);
    }
  });

  // updated_at alanını kaldır, sadece kpi_id, month, value döndür
  const rows = Array.from(latestMap.values()).map((r) => ({
    kpi_id: r.kpi_id,
    month: r.month,
    value: r.value,
  }));

  return sendList(res, rows);
}));

// Kullanıcı özet istatistikleri
app.get('/api/user/summary', requireAuth, catchAsync(async (req, res) => {
  const userId = req.user.id;
  logger.debug(`[GET /api/user/summary] Request from userId=${userId}`);

  // 1. Kullanıcının markalarını getir
  const { data: userBrands, error: brandsError } = await supabase
    .from('user_brands')
    .select('brand_id')
    .eq('user_id', userId);

  if (brandsError) {
    throw new AppError(`Kullanıcı markaları alınırken hata: ${brandsError.message}`, 500, 'USER_BRANDS_FETCH_FAILED');
  }

  const brandIds = (userBrands || []).map(ub => ub.brand_id);
  const totalBrands = brandIds.length;

  if (totalBrands === 0) {
    return sendSuccess(res, {
      totalBrands: 0,
      activeKpis: 0,
      monthlyDataCount: 0,
      avgProgress: null
    }, 'Kullanıcı özeti başarıyla alındı');
  }

  // 2. KPI sayısını hesapla (brand_kpi_mappings veya user_brand_kpis)
  // Optimize: Batch query kullanarak tüm brand'ler için tek seferde sorgu yap
  let activeKpis = 0;
  
  // Önce brand_kpi_mappings'ten batch query ile tüm brand'ler için KPI'ları al
  const { data: brandMappings, error: brandMapErr } = await supabase
    .from('brand_kpi_mappings')
    .select('brand_id, kpi_id')
    .in('brand_id', brandIds);

  if (!brandMapErr && brandMappings && brandMappings.length > 0) {
    // Her brand için unique KPI sayısını hesapla
    const kpiCountByBrand = new Map();
    brandMappings.forEach((mapping) => {
      const brandId = mapping.brand_id;
      if (!kpiCountByBrand.has(brandId)) {
        kpiCountByBrand.set(brandId, new Set());
      }
      kpiCountByBrand.get(brandId).add(mapping.kpi_id);
    });
    
    // Toplam unique KPI sayısını hesapla (tüm brand'ler için)
    const allKpiIds = new Set();
    kpiCountByBrand.forEach((kpiSet) => {
      kpiSet.forEach((kpiId) => allKpiIds.add(kpiId));
    });
    activeKpis = allKpiIds.size;
  } else {
    // Fallback: user_brand_kpis'ten batch query ile unique KPI'ları say
    const { data: userMappings, error: userMapErr } = await supabase
      .from('user_brand_kpis')
      .select('brand_id, kpi_id')
      .in('brand_id', brandIds);

    if (!userMapErr && userMappings && userMappings.length > 0) {
      const uniqueKpiIds = new Set(userMappings.map(m => m.kpi_id));
      activeKpis = uniqueKpiIds.size;
    }
  }

  // 3. Bu ay kullanıcının girdiği veri sayısı
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const { data: monthlyData, error: _monthlyError } = await supabase
    .from('kpi_daily_reports')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('year', currentYear)
    .eq('month', currentMonth);

  const monthlyDataCount = monthlyData?.length || 0;

  // 4. Ortalama ilerleme hesapla (basit: tüm hedeflerin ortalaması)
  // Bu karmaşık bir hesaplama, şimdilik null döndürelim
  const avgProgress = null;

  logger.debug(`[GET /api/user/summary] Summary: totalBrands=${totalBrands}, activeKpis=${activeKpis}, monthlyDataCount=${monthlyDataCount}`);

  return sendSuccess(res, {
    totalBrands,
    activeKpis,
    monthlyDataCount,
    avgProgress
  }, 'Kullanıcı özeti başarıyla alındı');
}));

// Kullanıcı son aktiviteleri
app.get('/api/user/activities', requireAuth, catchAsync(async (req, res) => {
  const userId = req.user.id;
  const limit = parseInt(req.query.limit) || 10;
  
  logger.debug(`[GET /api/user/activities] Request from userId=${userId}, limit=${limit}`);

  // Kullanıcının son veri girişlerini getir (günlük ve aylık)
  const [dailyActivities, monthlyActivities] = await Promise.all([
    supabase
      .from('kpi_daily_reports')
      .select(`
        id,
        brand_id,
        kpi_id,
        value,
        created_at,
        brands (name),
        kpis (name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit),
    
    supabase
      .from('kpi_reports')
      .select(`
        id,
        brand_id,
        kpi_id,
        value,
        created_at,
        brands (name),
        kpis (name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
  ]);

  if (dailyActivities.error && monthlyActivities.error) {
    throw new AppError('Aktiviteler alınırken hata oluştu', 500, 'ACTIVITIES_FETCH_FAILED');
  }

  // İki listeyi birleştir ve tarihine göre sırala
  const allActivities = [
    ...(dailyActivities.data || []).map(a => ({
      id: a.id,
      brand_id: a.brand_id,
      brand_name: a.brands?.name || 'Bilinmeyen',
      kpi_id: a.kpi_id,
      kpi_name: a.kpis?.name || 'Bilinmeyen',
      value: a.value,
      created_at: a.created_at,
      type: 'daily'
    })),
    ...(monthlyActivities.data || []).map(a => ({
      id: a.id,
      brand_id: a.brand_id,
      brand_name: a.brands?.name || 'Bilinmeyen',
      kpi_id: a.kpi_id,
      kpi_name: a.kpis?.name || 'Bilinmeyen',
      value: a.value,
      created_at: a.created_at,
      type: 'monthly'
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
   .slice(0, limit);

  logger.debug(`[GET /api/user/activities] Returning ${allActivities.length} activities`);
  
  return sendList(res, allActivities, 'Aktiviteler başarıyla alındı');
}));

// 404 handler - tüm route'lardan sonra
app.use(notFoundHandler);

// Global error handler - en son middleware
app.use(globalErrorHandler);

// Process error handlers
handleUnhandledRejection();
handleUncaughtException();

// Test ortamında sunucuyu başlatmayalım; app'i export edelim
let server = null;
if (process.env.NODE_ENV !== 'test') {
  // Production'da 0.0.0.0, development'ta 127.0.0.1 kullan
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
  server = app.listen(PORT, host, () => {
    logger.info(`API server listening on http://${host}:${PORT}`);
  });
  // Graceful shutdown
  handleGracefulShutdown(server);
}

module.exports = app;