const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { supabase } = require('../supabase');
const { sendList } = require('../utils/responseHelpers');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const router = express.Router();

// Kullanıcının yetkili olduğu markadaki KPI'ları getir
router.get('/brands/:brandId/kpis', requireAuth, catchAsync(async (req, res) => {
  const { brandId } = req.params;
  logger.debug(`Getting KPIs for brandId: ${brandId} and userId: ${req.user.id}`);
  
  // Kullanıcının bu marka için yetkisi var mı kontrol et
  const { data: userBrand, error: userBrandError } = await supabase
    .from('user_brands')
    .select('brand_id')
    .eq('user_id', req.user.id)
    .eq('brand_id', brandId)
    .single();

  if (userBrandError || !userBrand) {
    logger.error(`Authorization failed for brandId: ${brandId}, userId: ${req.user.id}`, {
      userBrandError,
      userBrand,
      errorCode: userBrandError?.code,
      errorMessage: userBrandError?.message
    });
    throw new AppError('Bu marka için yetkiniz yok.', 403, 'FORBIDDEN');
  }

  // Önce brand_kpi_mappings'ten ortak KPI listesini çek (tüm kullanıcılar için aynı)
  let kpiIds = [];
  const { data: brandMappings, error: brandMapErr } = await supabase
    .from('brand_kpi_mappings')
    .select('kpi_id')
    .eq('brand_id', brandId);
  
  if (brandMapErr) {
    logger.warn(`brand_kpi_mappings query failed:`, brandMapErr);
    // brand_kpi_mappings tablosu yoksa veya hata varsa, user_brand_kpis'e fallback yap
  } else if (brandMappings && brandMappings.length > 0) {
    kpiIds = (brandMappings || []).map((r) => r.kpi_id);
    logger.debug(`kpiIds from brand_kpi_mappings (primary):`, kpiIds);
  }
  
  // Fallback: Eğer brand_kpi_mappings'te kayıt yoksa, tüm kullanıcıların user_brand_kpis kayıtlarını birleştir
  // Bu, eski sistemle uyumluluk için ama ortak KPI listesini korur
  if (!kpiIds.length) {
    logger.debug(`No brand_kpi_mappings found, falling back to aggregated user_brand_kpis for brandId: ${brandId}`);
    const { data: mappings, error: mapErr } = await supabase
      .from('user_brand_kpis')
      .select('kpi_id')
      .eq('brand_id', brandId);
    
    if (mapErr) {
      logger.warn(`user_brand_kpis query failed:`, mapErr);
      // Her iki tablo da boşsa, boş liste döndür
      return sendList(res, [], 'KPI listesi boş');
    }
    
    const uniqueKpiIds = Array.from(new Set((mappings || []).map((r) => r.kpi_id)));
    kpiIds = uniqueKpiIds;
    logger.debug(`kpiIds from user_brand_kpis (aggregated fallback):`, kpiIds);
  }
  
  if (!kpiIds.length) {
    return sendList(res, [], 'KPI listesi boş');
  }

  // KPI satırlarını getir
  const { data: kpis, error: kpiErr } = await supabase
    .from('kpis')
    .select('id, name, category, unit, calculation_type, target, only_cumulative, numerator_kpi_id, denominator_kpi_id, has_target_data, monthly_average')
    .in('id', kpiIds);
  
  if (kpiErr) {
    // Tablo yoksa boş dizi döndürerek UI'nin çalışmasını sağlayalım
    if (kpiErr.code === '42P01' || /relation .* does not exist/i.test(kpiErr.message || '')) {
      return sendList(res, [], 'KPI tablosu bulunamadı');
    }
    throw new AppError(`KPI'lar alınırken hata: ${kpiErr.message}`, 500, 'KPIS_FETCH_FAILED');
  }

  return sendList(res, kpis || [], 'KPI\'lar başarıyla alındı');
}));

module.exports = router;