const express = require('express');
const { supabase } = require('../supabase');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { 
  sendSuccess, 
  sendList
} = require('../utils/responseHelpers');
const logger = require('../utils/logger');
const router = express.Router();

// Get user's KPI ordering for a specific brand
router.get('/:brandId', requireAuth, catchAsync(async (req, res) => {
  const { brandId } = req.params;
  // Context parametresi: 'sales-dashboard' (default) veya 'monthly-overview'
  const context = req.query.context || 'sales-dashboard';
  const userId = req.user?.id;
  
  logger.debug('KPI sıralaması isteniyor', { brandId, context, userId });
  
  if (!userId) {
    throw new AppError('Kullanıcı kimliği bulunamadı', 401, 'USER_NOT_FOUND');
  }

  // Kullanıcının kendi sıralamasını döndür
  const { data, error } = await supabase
    .from('user_kpi_ordering')
    .select(`
      kpi_id,
      order_index,
      kpis (
        id,
        name,
        category,
        unit
      )
    `)
    .eq('user_id', userId)
    .eq('brand_id', brandId)
    .eq('context', context)
    .order('order_index', { ascending: true });

  if (error) {
    logger.error('KPI ordering getirilemedi', { brandId, context, userId, error: error.message });
    throw new AppError(`KPI ordering getirilemedi: ${error.message}`, 500, 'KPI_ORDERING_FETCH_FAILED');
  }

  logger.debug('KPI sıralama kaydı bulundu', { brandId, context, userId, count: data?.length || 0 });
  return sendList(res, data || [], 'KPI ordering başarıyla getirildi');
}));

// Update user's KPI ordering for a specific brand
router.put('/:brandId', requireAuth, catchAsync(async (req, res) => {
  const { brandId } = req.params;
  const { kpiOrdering, context: contextParam } = req.body; // Array of { kpi_id, order_index }, context optional
  // Context parametresi: 'sales-dashboard' (default) veya 'monthly-overview'
  const context = contextParam || 'sales-dashboard';
  const userId = req.user?.id;

  logger.debug('KPI sıralaması güncelleniyor', { brandId, context, userId });

  if (!userId) {
    throw new AppError('Kullanıcı kimliği bulunamadı', 401, 'USER_NOT_FOUND');
  }

  if (!Array.isArray(kpiOrdering)) {
    throw new AppError('kpiOrdering must be an array', 400, 'INVALID_KPI_ORDERING');
  }

  // Kullanıcının kendi sıralamasını sil ve ekle (context'e göre)
  const { error: deleteError } = await supabase
    .from('user_kpi_ordering')
    .delete()
    .eq('user_id', userId)
    .eq('brand_id', brandId)
    .eq('context', context);

  if (deleteError) {
    throw new AppError(`Mevcut KPI ordering silinemedi: ${deleteError.message}`, 500, 'KPI_ORDERING_DELETE_FAILED');
  }

  if (kpiOrdering.length > 0) {
    const orderingData = kpiOrdering.map((item, index) => ({
      user_id: userId,
      brand_id: brandId,
      kpi_id: item.kpi_id,
      order_index: index,
      context: context
    }));

    logger.debug('KPI sıralama kaydı ekleniyor', { brandId, context, userId, count: orderingData.length });

    const { error: insertError } = await supabase
      .from('user_kpi_ordering')
      .insert(orderingData);

    if (insertError) {
      logger.error('KPI ordering kaydedilemedi', { brandId, context, userId, error: insertError.message });
      throw new AppError(`KPI ordering kaydedilemedi: ${insertError.message}`, 500, 'KPI_ORDERING_SAVE_FAILED');
    }

    logger.debug('KPI sıralaması başarıyla kaydedildi', { brandId, context, userId });
  } else {
    logger.debug('KPI sıralaması boş, kayıt yapılmıyor', { brandId, context, userId });
  }

  return sendSuccess(res, null, 'KPI ordering başarıyla güncellendi');
}));

// Initialize default KPI ordering for a user and brand
router.post('/:brandId/initialize', requireAuth, catchAsync(async (req, res) => {
  const { brandId } = req.params;
  const userId = req.user?.id;

  logger.debug('KPI sıralaması başlatılıyor', { brandId, userId });

  if (!userId) {
    throw new AppError('Kullanıcı kimliği bulunamadı', 401, 'USER_NOT_FOUND');
  }

  // Context parametresi: 'sales-dashboard' (default) veya 'monthly-overview'
  const context = req.body.context || 'sales-dashboard';

  // Kullanıcı için bu marka ve context sıralaması var mı?
  const { data: existing } = await supabase
    .from('user_kpi_ordering')
    .select('id')
    .eq('user_id', userId)
    .eq('brand_id', brandId)
    .eq('context', context)
    .limit(1);

  if (existing && existing.length > 0) {
    return sendSuccess(res, null, 'KPI ordering zaten mevcut');
  }

  // Kullanıcının brand KPI setine göre default ordering
  const { data: userKpis, error: kpisError } = await supabase
    .from('user_brand_kpis')
    .select(`
      kpi_id,
      kpis (
        id,
        name
      )
    `)
    .eq('user_id', userId)
    .eq('brand_id', brandId);

  if (kpisError) {
    throw new AppError(`KPI'lar getirilemedi: ${kpisError.message}`, 500, 'KPIS_FETCH_FAILED');
  }

  if (!userKpis || userKpis.length === 0) {
    return sendSuccess(res, null, 'Bu kullanıcı ve marka için KPI bulunamadı');
  }

  const orderingData = userKpis.map((item, index) => ({
    user_id: userId,
    brand_id: brandId,
    kpi_id: item.kpi_id,
    order_index: index,
    context: context
  }));

  const { error: insertError } = await supabase
    .from('user_kpi_ordering')
    .insert(orderingData);

  if (insertError) {
    throw new AppError(`Varsayılan KPI ordering oluşturulamadı: ${insertError.message}`, 500, 'DEFAULT_ORDERING_CREATE_FAILED');
  }

  logger.debug('Varsayılan KPI ordering başarıyla oluşturuldu', { brandId, userId, context });
  return sendSuccess(res, null, 'Varsayılan KPI ordering başarıyla oluşturuldu');
}));

module.exports = router;