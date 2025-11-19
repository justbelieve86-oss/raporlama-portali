const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { supabase } = require('../supabase');
const { sendList, sendSuccess } = require('../utils/responseHelpers');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const router = express.Router();

// Get model-based sales data for a brand and date
router.get('/brands/:brandId/models/sales', requireAuth, catchAsync(async (req, res) => {
  const { brandId } = req.params;
  const { date } = req.query;

  if (!date) {
    throw new AppError('Tarih parametresi zorunludur', 400, 'MISSING_DATE');
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    throw new AppError('Geçersiz tarih formatı. YYYY-MM-DD formatında olmalıdır', 400, 'INVALID_DATE_FORMAT');
  }

  // Check user authorization for brand
  const { data: userBrand, error: userBrandError } = await supabase
    .from('user_brands')
    .select('brand_id')
    .eq('user_id', req.user.id)
    .eq('brand_id', brandId)
    .single();

  if (userBrandError || !userBrand) {
    throw new AppError('Bu marka için yetkiniz yok.', 403, 'FORBIDDEN');
  }

  // Get model-based sales data for the month (date is first day of month: YYYY-MM-01)
  // Extract year and month from date
  const dateParts = date.split('-');
  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10);
  
  // Get all records for this month (date starts with YYYY-MM)
  const { data, error } = await supabase
    .from('model_based_sales')
    .select(`
      id,
      model_id,
      date,
      stok,
      tahsis,
      baglanti,
      fatura,
      fatura_baglanti,
      hedef,
      brand_models!model_based_sales_model_id_fkey (
        id,
        name
      )
    `)
    .eq('brand_id', brandId)
    .gte('date', `${year}-${String(month).padStart(2, '0')}-01`)
    .lt('date', month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`);

  if (error) {
    logger.error('Model-based sales data fetch error:', error);
    throw new AppError(`Model bazlı satış verileri alınırken hata: ${error.message}`, 500, 'MODEL_SALES_FETCH_FAILED');
  }

  // Transform data to include model name
  const transformedData = (data || []).map(item => ({
    id: item.id,
    modelId: item.model_id,
    modelName: item.brand_models?.name || 'Bilinmeyen Model',
    date: item.date,
    stok: item.stok,
    tahsis: item.tahsis,
    baglanti: item.baglanti,
    fatura: item.fatura,
    faturaBaglanti: item.fatura_baglanti,
    hedef: item.hedef,
  }));

  return sendList(res, transformedData, 'Model bazlı satış verileri başarıyla alındı');
}));

// Save model-based sales data (upsert)
router.post('/brands/:brandId/models/sales', requireAuth, catchAsync(async (req, res) => {
  const { brandId } = req.params;
  const { date, modelId, stok, tahsis, baglanti, fatura, faturaBaglanti, hedef } = req.body || {};

  if (!date || !modelId) {
    throw new AppError('Tarih ve model ID zorunludur', 400, 'MISSING_REQUIRED_FIELDS');
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    throw new AppError('Geçersiz tarih formatı. YYYY-MM-DD formatında olmalıdır', 400, 'INVALID_DATE_FORMAT');
  }

  // Check user authorization for brand
  const { data: userBrand, error: userBrandError } = await supabase
    .from('user_brands')
    .select('brand_id')
    .eq('user_id', req.user.id)
    .eq('brand_id', brandId)
    .single();

  if (userBrandError || !userBrand) {
    throw new AppError('Bu marka için yetkiniz yok.', 403, 'FORBIDDEN');
  }

  // Verify model belongs to brand
  const { data: model, error: modelError } = await supabase
    .from('brand_models')
    .select('id, brand_id')
    .eq('id', modelId)
    .eq('brand_id', brandId)
    .single();

  if (modelError || !model) {
    throw new AppError('Model bulunamadı veya bu markaya ait değil', 404, 'MODEL_NOT_FOUND');
  }

  // Prepare data for upsert
  const salesData = {
    user_id: req.user.id,
    brand_id: brandId,
    model_id: modelId,
    date: date,
    stok: stok !== null && stok !== undefined ? Number(stok) : null,
    tahsis: tahsis !== null && tahsis !== undefined ? Number(tahsis) : null,
    baglanti: baglanti !== null && baglanti !== undefined ? Number(baglanti) : null,
    fatura: fatura !== null && fatura !== undefined ? Number(fatura) : null,
    fatura_baglanti: faturaBaglanti !== null && faturaBaglanti !== undefined ? Number(faturaBaglanti) : null,
    hedef: hedef !== null && hedef !== undefined ? Number(hedef) : null,
  };

  // Upsert (insert or update)
  const { data: result, error: upsertError } = await supabase
    .from('model_based_sales')
    .upsert(salesData, {
      onConflict: 'user_id,brand_id,model_id,date',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (upsertError) {
    logger.error('Model-based sales data upsert error:', upsertError);
    throw new AppError(`Model bazlı satış verisi kaydedilirken hata: ${upsertError.message}`, 500, 'MODEL_SALES_SAVE_FAILED');
  }

  return sendSuccess(res, result, 'Model bazlı satış verisi başarıyla kaydedildi');
}));

// Bulk save model-based sales data (multiple models at once)
router.post('/brands/:brandId/models/sales/bulk', requireAuth, catchAsync(async (req, res) => {
  const { brandId } = req.params;
  const { date, salesData } = req.body || {};

  if (!date || !Array.isArray(salesData) || salesData.length === 0) {
    throw new AppError('Tarih ve satış verileri zorunludur', 400, 'MISSING_REQUIRED_FIELDS');
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    throw new AppError('Geçersiz tarih formatı. YYYY-MM-DD formatında olmalıdır', 400, 'INVALID_DATE_FORMAT');
  }

  // Check user authorization for brand
  const { data: userBrand, error: userBrandError } = await supabase
    .from('user_brands')
    .select('brand_id')
    .eq('user_id', req.user.id)
    .eq('brand_id', brandId)
    .single();

  if (userBrandError || !userBrand) {
    throw new AppError('Bu marka için yetkiniz yok.', 403, 'FORBIDDEN');
  }

  // Prepare bulk data
  const bulkData = salesData.map(item => ({
    user_id: req.user.id,
    brand_id: brandId,
    model_id: item.modelId,
    date: date,
    stok: item.stok !== null && item.stok !== undefined ? Number(item.stok) : null,
    tahsis: item.tahsis !== null && item.tahsis !== undefined ? Number(item.tahsis) : null,
    baglanti: item.baglanti !== null && item.baglanti !== undefined ? Number(item.baglanti) : null,
    fatura: item.fatura !== null && item.fatura !== undefined ? Number(item.fatura) : null,
    fatura_baglanti: item.faturaBaglanti !== null && item.faturaBaglanti !== undefined ? Number(item.faturaBaglanti) : null,
    hedef: item.hedef !== null && item.hedef !== undefined ? Number(item.hedef) : null,
  }));

  // Upsert all records
  const { data: results, error: upsertError } = await supabase
    .from('model_based_sales')
    .upsert(bulkData, {
      onConflict: 'user_id,brand_id,model_id,date',
      ignoreDuplicates: false
    })
    .select();

  if (upsertError) {
    logger.error('Model-based sales bulk upsert error:', upsertError);
    throw new AppError(`Model bazlı satış verileri kaydedilirken hata: ${upsertError.message}`, 500, 'MODEL_SALES_BULK_SAVE_FAILED');
  }

  return sendSuccess(res, { count: results?.length || 0 }, `${results?.length || 0} model bazlı satış verisi başarıyla kaydedildi`);
}));

module.exports = router;

