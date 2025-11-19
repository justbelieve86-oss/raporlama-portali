const express = require('express');
const router = express.Router();
const { supabase } = require('../supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Import role normalization utilities from auth middleware
function normalizeRole(role) {
  if (typeof role !== 'string') return '';
  try {
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

const ADMIN_EQUIVALENT = new Set([
  'admin',
  'genel koordinator', // "Genel Koordinatör"
]);
const { validateInput, schemas } = require('../middleware/validation');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { 
  sendSuccess, 
  sendCreated, 
  sendNotFound, 
  sendConflict, 
  sendList 
} = require('../utils/responseHelpers');

// KPI formülü güncelle/sil (service role ile RLS sorunlarını aşar)
router.put('/kpis/:id/formula', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const { id } = req.params;
  const { expression, display_expression } = req.body || {};

  const trimmed = typeof expression === 'string' ? expression.trim() : '';

  if (trimmed) {
    const row = {
      kpi_id: id,
      expression: trimmed,
      display_expression: display_expression ?? null,
    };
    const { data: formulaData, error } = await supabase
      .from('kpi_formulas')
      .upsert(row)
      .select()
      .single();
    if (error) {
      throw new AppError(`KPI formülü güncellenemedi: ${error.message}`, 500, 'KPI_FORMULA_UPDATE_FAILED');
    }
    return sendSuccess(res, { formula: formulaData }, 'KPI formülü başarıyla güncellendi');
  }

  // expression yok/boş ise formülü sil
  const { error } = await supabase
    .from('kpi_formulas')
    .delete()
    .eq('kpi_id', id);
  if (error) {
    throw new AppError(`KPI formülü silinemedi: ${error.message}`, 500, 'KPI_FORMULA_DELETE_FAILED');
  }
  return sendSuccess(res, null, 'KPI formülü başarıyla silindi');
}));

// KPI'ları listele (formül ve kümülatif kaynaklarla zenginleştirilmiş)
router.get('/kpis', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  // Ana KPI alanlarını al (hedef alanları varsa dahil et; yoksa geriye dönük uyumlu seçim)
  let kpiRows = [];
  let kpisErr = null;
  // Önce hedef alanlarını da içeren seçimle dene
  let resp = await supabase
    .from('kpis')
    .select('id,name,category,unit,status,report_count,ytd_calc,created_at,updated_at,calculation_type,numerator_kpi_id,denominator_kpi_id,target,only_cumulative,projection,has_target_data,monthly_average,target_formula_text')
    .order('created_at', { ascending: false });
  if (resp?.error && (resp.error.code === '42703' || /column .* does not exist/i.test(resp.error.message || ''))) {
    // Kolon yoksa, hedef alanları olmadan tekrar dene
    const fallback = await supabase
      .from('kpis')
      .select('id,name,category,unit,status,report_count,ytd_calc,created_at,updated_at,calculation_type,numerator_kpi_id,denominator_kpi_id,target,only_cumulative,projection,monthly_average')
      .order('created_at', { ascending: false });
    kpiRows = fallback.data || [];
    kpisErr = fallback.error || null;
  } else {
    kpiRows = resp.data || [];
    kpisErr = resp.error || null;
  }

  if (kpisErr) {
    // Tablo yoksa boş liste döndürerek UI'nin çalışmasını sağlayalım
    if (kpisErr.code === '42P01' || /relation .* does not exist/i.test(kpisErr.message || '')) {
      return sendList(res, [], 'KPI listesi alındı');
    }
    throw new AppError(`KPI'lar alınırken hata: ${kpisErr.message}`, 500, 'KPIS_FETCH_FAILED');
  }

  const kpiIds = (kpiRows || []).map(r => r.id);

  // Formülleri al (display_expression -> formula_text)
  let formulaMap = new Map();
  if (kpiIds.length > 0) {
    const { data: formulaRows } = await supabase
      .from('kpi_formulas')
      .select('kpi_id, display_expression');
    formulaMap = new Map((formulaRows || []).map(f => [f.kpi_id, f.display_expression || '']));
  }

  // Kümülatif kaynakları al
  let sourceMap = new Map();
  if (kpiIds.length > 0) {
    const { data: srcRows } = await supabase
      .from('kpi_cumulative_sources')
      .select('kpi_id, source_kpi_id');
    sourceMap = new Map();
    (srcRows || []).forEach(r => {
      const arr = sourceMap.get(r.kpi_id) || [];
      arr.push(r.source_kpi_id);
      sourceMap.set(r.kpi_id, arr);
    });
  }

  const items = (kpiRows || []).map(r => ({
    id: r.id,
    name: r.name,
    category: r.category,
    unit: r.unit,
    status: r.status,
    report_count: r.report_count,
    ytd_calc: r.ytd_calc,
    created_at: r.created_at,
    updated_at: r.updated_at,
    calculation_type: r.calculation_type,
    numerator_kpi_id: r.numerator_kpi_id,
    denominator_kpi_id: r.denominator_kpi_id,
    target: r.target,
    only_cumulative: r.only_cumulative,
    projection: r.projection,
    has_target_data: r.has_target_data ?? false,
    monthly_average: r.monthly_average ?? false,
    target_formula_text: r.target_formula_text ?? null,
    formula_text: formulaMap.get(r.id) || '',
    cumulative_source_ids: sourceMap.get(r.id) || []
  }));

  return sendList(res, items, 'KPI listesi başarıyla alındı', items.length);
}));

// KPI oluştur (temel alanlar + opsiyonel formül ve kümülatif kaynaklar)
router.post('/kpis', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const body = req.body || {};

  // İzin verilen alanlar için map (frontend -> tablo kolonları)
  const insertFields = {};
  if (typeof body.name === 'string') insertFields.name = body.name.trim();
  if (typeof body.category === 'string') insertFields.category = body.category.trim();
  if (typeof body.unit === 'string') insertFields.unit = body.unit.trim();
  if (typeof body.status === 'string') insertFields.status = body.status;
  if (typeof body.ytdCalc === 'string') insertFields.ytd_calc = body.ytdCalc;
  if (typeof body.calculationType === 'string') insertFields.calculation_type = body.calculationType; // opsiyonel
  if (body.numeratorKpiId !== undefined) insertFields.numerator_kpi_id = body.numeratorKpiId || null;
  if (body.denominatorKpiId !== undefined) insertFields.denominator_kpi_id = body.denominatorKpiId || null;
  if (body.target !== undefined) {
    const t = typeof body.target === 'string' ? body.target.trim() : body.target;
    const num = typeof t === 'number' ? t : (t === '' ? null : Number(t));
    insertFields.target = (num === null || Number.isNaN(num)) ? null : num;
  }
  if (body.onlyCumulative !== undefined) insertFields.only_cumulative = !!body.onlyCumulative;
  if (body.monthlyAverage !== undefined) insertFields.monthly_average = !!body.monthlyAverage;
  if (body.projection !== undefined) {
    const p = typeof body.projection === 'string' ? body.projection.trim() : body.projection;
    const numP = typeof p === 'number' ? p : (p === '' ? null : Number(p));
    insertFields.projection = (numP === null || Number.isNaN(numP)) ? null : numP;
  }
  // Hedef veri ve hedef formülü (opsiyonel - kolonsuz ortamlarda sessizce yok say)
  const targetOptionalFields = {};
  if (Object.prototype.hasOwnProperty.call(body, 'hasTargetData')) {
    targetOptionalFields.has_target_data = !!body.hasTargetData;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'targetFormulaText')) {
    const tf = typeof body.targetFormulaText === 'string' ? body.targetFormulaText.trim() : '';
    targetOptionalFields.target_formula_text = tf ? tf : null;
  }

  // Zorunlu alan kontrolü
  if (!insertFields.name || !insertFields.category || !insertFields.unit || !insertFields.status || !insertFields.ytd_calc) {
    throw new AppError('Zorunlu alanlar eksik (name, category, unit, status, ytdCalc)', 400, 'BAD_REQUEST');
  }

  // İlk ekleme denemesi: tüm alanlarla
  let created = null;
  let createErr = null;
  {
    const payload = { ...insertFields, ...targetOptionalFields };
    const resp = await supabase
      .from('kpis')
      .insert(payload)
      .select('id,name,category,unit,status,report_count,ytd_calc,created_at,updated_at,calculation_type,numerator_kpi_id,denominator_kpi_id,target,only_cumulative,projection,has_target_data,monthly_average,target_formula_text')
      .single();
    created = resp.data || null;
    createErr = resp.error || null;
  }

  // Hedef alanları kolon yoksa: bu alanlar olmadan yeniden dene
  if (createErr && (createErr.code === '42703' || /column .* does not exist/i.test(createErr.message || ''))) {
    const resp = await supabase
      .from('kpis')
      .insert(insertFields)
      .select('id,name,category,unit,status,report_count,ytd_calc,created_at,updated_at,calculation_type,numerator_kpi_id,denominator_kpi_id,target,only_cumulative,projection,monthly_average')
      .single();
    created = resp.data || null;
    createErr = resp.error || null;
  }

  if (createErr) {
    throw new AppError(`KPI oluşturulamadı: ${createErr.message}`, 500, 'KPI_CREATE_FAILED');
  }

  const newId = created?.id;

  // Formül display_expression ekle (opsiyonel)
  if (Object.prototype.hasOwnProperty.call(body, 'formulaText')) {
    const formulaText = typeof body.formulaText === 'string' ? body.formulaText.trim() : '';
    if (formulaText && newId) {
      const { error: fErr } = await supabase
        .from('kpi_formulas')
        .upsert({ kpi_id: newId, display_expression: formulaText });
      if (fErr) {
        // Formül eklenemezse hata ver fakat KPI oluşturma başarısız sayma yerine bilgi mesajı sağla
        logger.warn('KPI formülü eklenemedi:', fErr);
      }
    }
  }

  // Kümülatif kaynakları ekle (opsiyonel)
  if (Array.isArray(body.cumulativeSourceIds) && body.cumulativeSourceIds.length > 0 && newId) {
    const ids = body.cumulativeSourceIds.filter(Boolean);
    if (ids.length > 0) {
      const rows = ids.map((srcId) => ({ kpi_id: newId, source_kpi_id: srcId }));
      const { error: insErr } = await supabase
        .from('kpi_cumulative_sources')
        .insert(rows);
      if (insErr) {
        logger.warn('Kümülatif kaynaklar eklenemedi:', insErr);
      }
    }
  }

  return sendCreated(res, created || { id: newId }, 'KPI başarıyla oluşturuldu');
}));

// KPI güncelle (temel alanlar + formül + kümülatif kaynaklar)
router.put('/kpis/:id', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};

  // İzin verilen alanlar için map (frontend -> tablo kolonları)
  const updateFields = {};
  if (typeof body.name === 'string') updateFields.name = body.name;
  if (typeof body.category === 'string') updateFields.category = body.category.trim();
  if (typeof body.unit === 'string') updateFields.unit = body.unit.trim();
  if (typeof body.status === 'string') updateFields.status = body.status;
  if (typeof body.ytdCalc === 'string') updateFields.ytd_calc = body.ytdCalc;
  if (typeof body.calculationType === 'string') updateFields.calculation_type = body.calculationType;
  if (body.numeratorKpiId !== undefined) updateFields.numerator_kpi_id = body.numeratorKpiId || null;
  if (body.denominatorKpiId !== undefined) updateFields.denominator_kpi_id = body.denominatorKpiId || null;
  if (body.target !== undefined) {
    const t = typeof body.target === 'string' ? body.target.trim() : body.target;
    const num = typeof t === 'number' ? t : (t === '' ? null : Number(t));
    updateFields.target = (num === null || Number.isNaN(num)) ? null : num;
  }
  if (body.onlyCumulative !== undefined) updateFields.only_cumulative = body.onlyCumulative;
  if (body.monthlyAverage !== undefined) updateFields.monthly_average = !!body.monthlyAverage;
  if (body.projection !== undefined) {
    const p = typeof body.projection === 'string' ? body.projection.trim() : body.projection;
    const numP = typeof p === 'number' ? p : (p === '' ? null : Number(p));
    updateFields.projection = (numP === null || Number.isNaN(numP)) ? null : numP;
  }
  // Hedef veri ve hedef formülü (opsiyonel)
  const targetUpdateFields = {};
  if (Object.prototype.hasOwnProperty.call(body, 'hasTargetData')) {
    targetUpdateFields.has_target_data = !!body.hasTargetData;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'targetFormulaText')) {
    const tf = typeof body.targetFormulaText === 'string' ? body.targetFormulaText.trim() : '';
    targetUpdateFields.target_formula_text = tf ? tf : null;
  }

  // Eğer güncellenecek alan yoksa bad request
  if (Object.keys(updateFields).length === 0 && !('formulaText' in body) && !('cumulativeSourceIds' in body) && Object.keys(targetUpdateFields).length === 0) {
    throw new AppError('Güncellenecek alan bulunamadı', 400, 'BAD_REQUEST');
  }

  // KPI ana kayıt güncelle
  if (Object.keys(updateFields).length > 0) {
    const { error } = await supabase
      .from('kpis')
      .update(updateFields)
      .eq('id', id)
      .select('id,name,category,unit,status,report_count,ytd_calc,created_at,updated_at,calculation_type,numerator_kpi_id,denominator_kpi_id,target,only_cumulative,projection,monthly_average')
      .single();
    if (error) {
      if (error.code === 'PGRST116' || /No rows found/i.test(error.message || '')) {
        return sendNotFound(res, 'KPI bulunamadı');
      }
      throw new AppError(`KPI güncellenemedi: ${error.message}`, 500, 'KPI_UPDATE_FAILED');
    }
  }

  // Hedef alanlarını ayrı bir güncelle çağrısıyla dene; kolon yoksa sessizce yoksay
  if (Object.keys(targetUpdateFields).length > 0) {
    const { error: targetErr } = await supabase
      .from('kpis')
      .update(targetUpdateFields)
      .eq('id', id);
    if (targetErr && !(targetErr.code === '42703' || /column .* does not exist/i.test(targetErr.message || ''))) {
      throw new AppError(`Hedef alanları güncellenemedi: ${targetErr.message}`, 500, 'KPI_TARGET_FIELDS_UPDATE_FAILED');
    }
  }

  // Formül display_expression güncelle (opsiyonel)
  if (Object.prototype.hasOwnProperty.call(body, 'formulaText')) {
    const formulaText = typeof body.formulaText === 'string' ? body.formulaText.trim() : '';
    if (formulaText) {
      const { error } = await supabase
        .from('kpi_formulas')
        .upsert({ kpi_id: id, display_expression: formulaText })
        .select();
      if (error) {
        throw new AppError(`KPI formülü güncellenemedi: ${error.message}`, 500, 'KPI_FORMULA_UPDATE_FAILED');
      }
    } else {
      // boşsa formülü sil
      const { error } = await supabase
        .from('kpi_formulas')
        .delete()
        .eq('kpi_id', id);
      if (error) {
        throw new AppError(`KPI formülü silinemedi: ${error.message}`, 500, 'KPI_FORMULA_DELETE_FAILED');
      }
    }
  }

  // Kümülatif kaynakları güncelle (opsiyonel)
  if (Array.isArray(body.cumulativeSourceIds)) {
    const ids = body.cumulativeSourceIds.filter(Boolean);
    // Mevcut kayıtları sil
    const { error: delErr } = await supabase
      .from('kpi_cumulative_sources')
      .delete()
      .eq('kpi_id', id);
    if (delErr) {
      throw new AppError(`Kümülatif kaynaklar temizlenemedi: ${delErr.message}`, 500, 'KPI_SOURCES_DELETE_FAILED');
    }
    // Yeni kayıtları ekle
    if (ids.length > 0) {
      const rows = ids.map((srcId) => ({ kpi_id: id, source_kpi_id: srcId }));
      const { error: insErr } = await supabase
        .from('kpi_cumulative_sources')
        .insert(rows);
      if (insErr) {
        throw new AppError(`Kümülatif kaynaklar güncellenemedi: ${insErr.message}`, 500, 'KPI_SOURCES_UPDATE_FAILED');
      }
    }
  }

  return sendSuccess(res, { success: true }, 'KPI başarıyla güncellendi');
}));

// KPI sil (ilişkili tablolar ON DELETE CASCADE ile temizlenir)
router.delete('/kpis/:id', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const { id } = req.params;

  // Kayıt var mı kontrol et
  const { data: _existing, error: findErr } = await supabase
    .from('kpis')
    .select('id')
    .eq('id', id)
    .single();

  if (findErr) {
    if (findErr.code === 'PGRST116' || /No rows found/i.test(findErr.message || '')) {
      return sendNotFound(res, 'KPI bulunamadı');
    }
    throw new AppError(`KPI kontrol edilirken hata: ${findErr.message}`, 500, 'KPI_LOOKUP_FAILED');
  }

  // Silme işlemi (cascading ile bağlı kayıtlar otomatik temizlenir)
  const { error: delErr } = await supabase
    .from('kpis')
    .delete()
    .eq('id', id);

  if (delErr) {
    throw new AppError(`KPI silinemedi: ${delErr.message}`, 500, 'KPI_DELETE_FAILED');
  }

  return sendSuccess(res, { success: true }, 'KPI başarıyla silindi');
}));

// KPI kategorilerini listele
router.get('/kpi-categories', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const { data, error } = await supabase
    .from('kpi_categories')
    .select('name')
    .order('name', { ascending: true });

  if (error) {
    if (error.code === '42P01' || /relation .* does not exist/i.test(error.message || '')) {
      return sendList(res, [], 'KPI kategorileri alındı', 0);
    }
    throw new AppError(`KPI kategorileri alınırken hata: ${error.message}`, 500, 'KPI_CATEGORIES_FETCH_FAILED');
  }

  return sendList(res, data || [], 'KPI kategorileri başarıyla alındı', (data || []).length);
}));

// KPI kategorisi oluştur
router.post('/kpi-categories', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const { name } = req.body || {};
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) {
    throw new AppError('Kategori adı zorunlu', 400, 'BAD_REQUEST');
  }

  const { data, error } = await supabase
    .from('kpi_categories')
    .insert({ name: trimmed })
    .select()
    .single();

  if (error) {
    if (error.code === '23505' || /duplicate key/i.test(error.message || '')) {
      return sendConflict(res, 'Kategori zaten mevcut', 'CATEGORY_EXISTS');
    }
    throw new AppError(`Kategori eklenemedi: ${error.message}`, 500, 'CATEGORY_CREATE_FAILED');
  }

  return sendCreated(res, { name: data?.name ?? trimmed }, 'Kategori başarıyla eklendi');
}));

// KPI kategorisi güncelle (yeniden adlandır)
router.put('/kpi-categories/:oldName', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  // URL decode yap (örn: "Sat%C4%B1%C5%9F" → "Satış")
  const oldNameRaw = decodeURIComponent(req.params.oldName);
  const oldName = typeof oldNameRaw === 'string' ? oldNameRaw.trim() : '';
  const { name } = req.body || {};
  const next = typeof name === 'string' ? name.trim() : '';
  if (!next) {
    throw new AppError('Yeni kategori adı zorunlu', 400, 'BAD_REQUEST');
  }
  if (!oldName) {
    throw new AppError('Eski kategori adı zorunlu', 400, 'BAD_REQUEST');
  }
  
  console.log(`🔄 Kategori güncelleme: "${oldName}" → "${next}"`);

  // Önce eski kategoriyi kontrol et (var mı?)
  const { data: existingCategories, error: checkError } = await supabase
    .from('kpi_categories')
    .select('name')
    .eq('name', oldName);

  if (checkError) {
    throw new AppError(`Kategori kontrol edilemedi: ${checkError.message}`, 500, 'CATEGORY_CHECK_FAILED');
  }

  if (!existingCategories || existingCategories.length === 0) {
    return sendNotFound(res, 'Kategori bulunamadı', 'CATEGORY_NOT_FOUND');
  }

  // Yeni kategori adı zaten mevcut mu kontrol et (eski ad hariç)
  if (next !== oldName) {
    const { data: duplicateCategories, error: duplicateCheckError } = await supabase
      .from('kpi_categories')
      .select('name')
      .eq('name', next);

    if (duplicateCheckError) {
      throw new AppError(`Kategori kontrol edilemedi: ${duplicateCheckError.message}`, 500, 'CATEGORY_CHECK_FAILED');
    }

    if (duplicateCategories && duplicateCategories.length > 0) {
      return sendConflict(res, 'Kategori zaten mevcut', 'CATEGORY_EXISTS');
    }
  }

  // Önce eski kategori adına sahip KPI'ları kontrol et
  // Not: Supabase'de case-sensitive eşleşme yapıyoruz, ancak trim edilmiş değerlerle çalışıyoruz
  const { data: existingKpis, error: checkKpisError } = await supabase
    .from('kpis')
    .select('id, category')
    .eq('category', oldName);

  if (checkKpisError) {
    throw new AppError(`KPI kontrolü yapılamadı: ${checkKpisError.message}`, 500, 'KPI_CHECK_FAILED');
  }

  const existingKpiCount = existingKpis ? existingKpis.length : 0;
  console.log(`🔍 "${oldName}" kategorisinde ${existingKpiCount} KPI bulundu`);
  
  // Eğer exact match ile KPI bulunamadıysa, trim-aware arama yap
  let kpisToUpdate = existingKpis || [];
  if (existingKpiCount === 0) {
    // Tüm KPI'ları çek ve JavaScript tarafında filtrele (trim-aware)
    const { data: allKpis, error: allKpisError } = await supabase
      .from('kpis')
      .select('id, category');
    
    if (!allKpisError && allKpis) {
      kpisToUpdate = allKpis.filter(kpi => {
        const kpiCategory = typeof kpi.category === 'string' ? kpi.category.trim() : '';
        return kpiCategory === oldName;
      });
      console.log(`🔍 Trim-aware arama sonucu: ${kpisToUpdate.length} KPI bulundu`);
    }
  }

  // KPI'ların category alanlarını önce güncelle (cascade update)
  if (kpisToUpdate.length > 0) {
    // KPI ID'lerini topla
    const kpiIds = kpisToUpdate.map(k => k.id);
    
    // Her KPI'yı ayrı ayrı güncelle (daha güvenli)
    let successCount = 0;
    let failCount = 0;
    
    for (const kpiId of kpiIds) {
      const { error: kpiUpdateError } = await supabase
        .from('kpis')
        .update({ category: next })
        .eq('id', kpiId);
      
      if (kpiUpdateError) {
        console.error(`❌ KPI ${kpiId} güncellenemedi: ${kpiUpdateError.message}`);
        failCount++;
      } else {
        successCount++;
      }
    }
    
    if (successCount > 0) {
      console.log(`✅ ${successCount} KPI'nın kategori alanı "${oldName}" → "${next}" olarak güncellendi`);
    }
    if (failCount > 0) {
      console.warn(`⚠️ ${failCount} KPI güncellenemedi`);
      // Eğer tüm KPI'lar başarısız olduysa hata fırlat
      if (failCount === kpisToUpdate.length) {
        throw new AppError(`Tüm KPI'lar güncellenemedi`, 500, 'KPI_CATEGORY_UPDATE_FAILED');
      }
    }
  } else {
    console.log(`ℹ️ "${oldName}" kategorisinde KPI bulunamadı, kategori güncelleme devam ediyor`);
  }

  // Sonra kpi_categories tablosunu güncelle (select olmadan)
  const { error: updateError } = await supabase
    .from('kpi_categories')
    .update({ name: next })
    .eq('name', oldName);

  if (updateError) {
    if (updateError.code === '23505' || /duplicate key/i.test(updateError.message || '')) {
      return sendConflict(res, 'Kategori zaten mevcut', 'CATEGORY_EXISTS');
    }
    throw new AppError(`Kategori güncellenemedi: ${updateError.message}`, 500, 'CATEGORY_UPDATE_FAILED');
  }

  // Güncelleme başarılı, yeni kategori adını döndür
  return sendSuccess(res, { name: next }, 'Kategori güncellendi');
}));

// KPI kategorisi sil
router.delete('/kpi-categories/:name', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const { name } = req.params;
  const { error } = await supabase
    .from('kpi_categories')
    .delete()
    .eq('name', name);

  if (error) {
    throw new AppError(`Kategori silinemedi: ${error.message}`, 500, 'CATEGORY_DELETE_FAILED');
  }
  return sendSuccess(res, { success: true }, 'Kategori silindi');
}));

// KPI birimlerini listele
router.get('/kpi-units', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const { data, error } = await supabase
    .from('kpi_units')
    .select('name')
    .order('name', { ascending: true });

  if (error) {
    if (error.code === '42P01' || /relation .* does not exist/i.test(error.message || '')) {
      return sendSuccess(res, [], 'KPI birimleri alındı');
    }
    throw new AppError(`KPI birimleri alınırken hata: ${error.message}`, 500, 'KPI_UNITS_FETCH_FAILED');
  }

  return sendSuccess(res, data || [], 'KPI birimleri başarıyla alındı');
}));

// KPI birimi oluştur
router.post('/kpi-units', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const { name } = req.body || {};
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) {
    throw new AppError('Birim adı zorunlu', 400, 'BAD_REQUEST');
  }

  const { data, error } = await supabase
    .from('kpi_units')
    .insert({ name: trimmed })
    .select()
    .single();

  if (error) {
    if (error.code === '23505' || /duplicate key/i.test(error.message || '')) {
      return sendConflict(res, 'Birim zaten mevcut', 'UNIT_EXISTS');
    }
    throw new AppError(`Birim eklenemedi: ${error.message}`, 500, 'UNIT_CREATE_FAILED');
  }

  return sendCreated(res, { name: data?.name ?? trimmed }, 'Birim başarıyla eklendi');
}));

// KPI birimi sil
router.delete('/kpi-units/:name', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const { name } = req.params;
  const { error } = await supabase
    .from('kpi_units')
    .delete()
    .eq('name', name);

  if (error) {
    throw new AppError(`Birim silinemedi: ${error.message}`, 500, 'UNIT_DELETE_FAILED');
  }
  return sendSuccess(res, { success: true }, 'Birim silindi');
}));

// Belirli KPI için kümülatif kaynakları getir (düz array döner)
router.get('/kpis/:id/sources', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('kpi_cumulative_sources')
    .select('source_kpi_id')
    .eq('kpi_id', id);

  if (error) {
    if (error.code === '42P01' || /relation .* does not exist/i.test(error.message || '')) {
      return sendList(res, [], 'Kümülatif kaynaklar alındı', 0);
    }
    throw new AppError(`Kümülatif kaynaklar alınırken hata: ${error.message}`, 500, 'KPI_SOURCES_FETCH_FAILED');
  }

  const ids = (data || []).map(r => r.source_kpi_id);
  return sendList(res, ids, 'Kümülatif kaynaklar alındı', ids.length);
}));

// Belirli KPI için formülü getir (display_expression dahil)
router.get('/kpis/:id/formula', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('kpi_formulas')
    .select('kpi_id, expression, display_expression')
    .eq('kpi_id', id)
    .single();

  if (error && !(error.code === 'PGRST116' || /No rows found/i.test(error.message || ''))) {
    throw new AppError(`KPI formülü alınırken hata: ${error.message}`, 500, 'KPI_FORMULA_FETCH_FAILED');
  }

  if (!data) {
    return sendSuccess(res, { kpi_id: id, expression: '', display_expression: '' }, 'KPI formülü alındı');
  }
  return sendSuccess(res, data, 'KPI formülü alındı');
}));

// Kullanıcı oluştur
router.post('/users', requireAuth, requireAdmin, validateInput(schemas.createUser), catchAsync(async (req, res) => {
  const { email, password, role = 'user', username, full_name, brandIds = [] } = req.body;

  // Kullanıcıyı oluştur
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { role, username, full_name },
    email_confirm: true
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      throw new AppError('Bu email adresi zaten kayıtlı', 409, 'EMAIL_EXISTS');
    }
    throw new AppError(`Kullanıcı oluşturulamadı: ${authError.message}`, 400, 'USER_CREATION_FAILED');
  }

  const userId = authData.user.id;

  // Profil tablosuna ekle
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ id: userId, role });

  if (profileError) {
    // Kullanıcı oluşturuldu ama profil eklenemedi, kullanıcıyı sil
    await supabase.auth.admin.deleteUser(userId);
    throw new AppError(`Profil oluşturulamadı: ${profileError.message}`, 500, 'PROFILE_CREATION_FAILED');
  }

  // Kullanıcı-marka ilişkilerini ekle
  if (Array.isArray(brandIds) && brandIds.length > 0) {
    const userBrandData = brandIds.map(brandId => ({
      user_id: userId,
      brand_id: brandId
    }));

    const { error: brandError } = await supabase
      .from('user_brands')
      .insert(userBrandData);

    if (brandError) {
      logger.error('User-brand relation error:', brandError);
      // Bu hata kritik değil, kullanıcı oluşturuldu
    }
  }

  // Oluşturulan kullanıcı için yetkili marka adlarını getir
  let brands = [];
  if (Array.isArray(brandIds) && brandIds.length > 0) {
    const { data: brandRows } = await supabase
      .from('brands')
      .select('id, name')
      .in('id', brandIds);
    brands = (brandRows || []).map((b) => ({ id: b.id, name: b.name }));
  }

  return sendCreated(res, {
    user: {
      id: userId,
      email: authData.user.email,
      role,
      created_at: authData.user.created_at,
      last_sign_in_at: authData.user.last_sign_in_at,
      user_metadata: { username, full_name, role },
      brands
    }
  }, 'Kullanıcı başarıyla oluşturuldu');
}));

// Kullanıcıları listele (sayfalama, arama, filtreleme ile)
router.get('/users', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    role = '',
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = req.query;

  const offset = (page - 1) * limit;

  // Guard: Authorization header yanlışlıkla kullanıcı token'ına set edildiyse service key'e resetle
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabase?.auth?.headers) {
      const currentAuth = supabase.auth.headers.Authorization;
      const expectedAuth = serviceKey ? `Bearer ${serviceKey}` : undefined;
      if (currentAuth && expectedAuth && currentAuth !== expectedAuth) {
        supabase.auth.headers.Authorization = expectedAuth;
        logger.debug('Reset Authorization header to service key before listing users');
      }
    }
  } catch (e) {
    logger.warn('Failed to reset Authorization header guard (list users):', e?.message || e);
  }

  // RPC cache problemi nedeniyle doğrudan auth.users ve profiles üzerinden listeleme yapalım
  // Not: Backend service role anahtarı ile çalıştığı için RLS/polikalar atlanır.
  // Admin API'den kullanıcıları çek
  // Arama/rol filtresi yoksa gerçek sayfalama ile sadece istenen sayfayı al; varsa geniş listeyi alıp JS tarafında filtreleme/sıralama uygula
  const useServerPaging = !search && !role;
  const listParams = useServerPaging
    ? { page: Number(page) || 1, perPage: Number(limit) || 10 }
    : { page: 1, perPage: 1000 };

  const { data: adminList, error: usersErr } = await supabase.auth.admin.listUsers(listParams);
  if (usersErr) {
    logger.error('Supabase admin.listUsers error:', usersErr);
    // Ek bilgi: Authorization header var mıydı?
    logger.error('Service client Authorization header state:', supabase?.auth?.headers?.Authorization ? 'present' : 'absent');
    throw new AppError(`Kullanıcılar alınamadı: ${usersErr.message}`, 500, 'USERS_FETCH_FAILED');
  }
  const userRows = (adminList?.users || []).map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    raw_user_meta_data: u.user_metadata || {}
  }));

  // Profil rollerini çek
  const userIds = (userRows || []).map(u => u.id);
  let profilesMap = new Map();
  if (userIds.length > 0) {
    const { data: profileRows, error: profileErr } = await supabase
      .from('profiles')
      .select('id, role')
      .in('id', userIds);
    if (profileErr) {
      logger.error('Supabase profiles query error:', profileErr);
      throw new AppError(`Kullanıcı profilleri alınamadı: ${profileErr.message}`, 500, 'USERS_FETCH_FAILED');
    }
    profilesMap = new Map((profileRows || []).map(p => [p.id, p.role]));
  }

  // JS tarafında arama (username/full_name) ve rol filtrelemesi
  let combined = (userRows || []).map(u => {
    const meta = u.raw_user_meta_data || {};
    const roleVal = profilesMap.get(u.id) || 'user';
    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      user_metadata: meta,
      role: roleVal
    };
  });

  if (search) {
    const s = (search || '').toLowerCase();
    combined = combined.filter(u => {
      const username = (u.user_metadata?.username || '').toLowerCase();
      const fullName = (u.user_metadata?.full_name || '').toLowerCase();
      return (
        (u.email || '').toLowerCase().includes(s) ||
        username.includes(s) ||
        fullName.includes(s)
      );
    });
  }

  if (role && role !== '') {
    combined = combined.filter(u => (u.role || 'user') === role);
  }

  // Sıralama
  combined.sort((a, b) => {
    const dir = sortOrder === 'asc' ? 1 : -1;
    const getVal = (obj) => {
      switch (sortBy) {
        case 'email': return (obj.email || '').toLowerCase();
        case 'role': return (obj.role || '').toLowerCase();
        case 'created_at': return obj.created_at || '';
        default: return obj.created_at || '';
      }
    };
    const va = getVal(a);
    const vb = getVal(b);
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });

  const totalCount = combined.length;
  // Sunucu tarafı sayfalama kullanıldıysa, dönen veri zaten istenen sayfadır; aksi halde slice uygula
  const paged = useServerPaging ? combined : combined.slice(offset, offset + Number(limit));

  return sendList(res, paged, 'Kullanıcılar başarıyla alındı', totalCount);

}));

// Kullanıcı güncelle
router.put('/users/:userId', requireAuth, requireAdmin, validateInput(schemas.userIdParam), validateInput(schemas.updateUser), catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { email, role, username, full_name, password, brandIds } = req.body || {};

  // Mevcut kullanıcıyı al (metadata merge için)
  const { data: existingUser, error: existingErr } = await supabase.auth.admin.getUserById(userId);
  if (existingErr) {
    throw new AppError(`Kullanıcı bilgisi alınamadı: ${existingErr.message}`, 400, 'USER_FETCH_FAILED');
  }

  const existingMeta = existingUser?.user?.user_metadata || {};
  const nextMeta = {
    ...existingMeta,
    ...(role !== undefined ? { role } : {}),
    ...(username !== undefined ? { username } : {}),
    ...(full_name !== undefined ? { full_name } : {})
  };

  // Email / Şifre / Metadata güncellemelerini tek çağrıda deneyelim
  const updatePayload = {};
  if (email !== undefined) updatePayload.email = email;
  if (password) updatePayload.password = password;
  if (Object.keys(nextMeta).length > 0) updatePayload.user_metadata = nextMeta;

  if (Object.keys(updatePayload).length > 0) {
    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, updatePayload);
    if (updateErr) {
      throw new AppError(`Kullanıcı güncellenirken hata oluştu: ${updateErr.message}`, 400, 'USER_UPDATE_FAILED');
    }
  }

  // Rol bilgisi profiles tablosunda tutuluyor, onu da güncelle
  if (role !== undefined) {
    // DEBUG: Authorization başlığını kontrol et
    logger.debug('Authorization header before profiles upsert:', supabase.auth.headers?.Authorization);

    // Guard: Authorization başlığı kullanıcı token'ına set edildiyse service key'e resetle
    try {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabase?.auth?.headers) {
        const currentAuth = supabase.auth.headers.Authorization;
        const expectedAuth = serviceKey ? `Bearer ${serviceKey}` : undefined;
        if (currentAuth && expectedAuth && currentAuth !== expectedAuth) {
          supabase.auth.headers.Authorization = expectedAuth;
          logger.debug('Reset Authorization header to service key before profiles upsert');
        }
      }
    } catch (e) {
      logger.warn('Failed to reset Authorization header guard:', e?.message || e);
    }

    const { error: roleError } = await supabase
      .from('profiles')
      .upsert({ id: userId, role }, { onConflict: 'id' });
    if (roleError) {
      // RLS hatası durumunda daha açıklayıcı bir mesaj verelim
      if (roleError.message.includes('violates row-level security policy')) {
          throw new AppError(`Rol güncellenirken RLS hatası oluştu. Bu genellikle yetkilendirme başlığının yanlışlıkla ayarlanmasından kaynaklanır.`, 500, 'RLS_ROLE_UPDATE_FAILED');
      }
      throw new AppError(`Rol güncellenirken hata oluştu: ${roleError.message}`, 400, 'ROLE_UPDATE_FAILED');
    }
  }

  // Kullanıcı-markalar ilişkisini güncelle
  if (Array.isArray(brandIds)) {
    // Önce mevcut linkleri sil
    const { error: delErr } = await supabase
      .from('user_brands')
      .delete()
      .eq('user_id', userId);
    if (delErr) {
      throw new AppError(`Mevcut marka ilişkileri silinemedi: ${delErr.message}`, 400, 'BRAND_RELATIONS_DELETE_FAILED');
    }

    if (brandIds.length > 0) {
      const rows = brandIds.map((brand_id) => ({ user_id: userId, brand_id }));
      const { error: insErr } = await supabase
        .from('user_brands')
        .insert(rows);
      if (insErr) {
        throw new AppError(`Marka ilişkileri güncellenemedi: ${insErr.message}`, 400, 'BRAND_RELATIONS_UPDATE_FAILED');
      }
    }
  }

  // Güncellenmiş kullanıcıyı al
  // Guard: Authorization başlığı kullanıcı token'ına set edildiyse service key'e resetle
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabase?.auth?.headers) {
      const currentAuth = supabase.auth.headers.Authorization;
      const expectedAuth = serviceKey ? `Bearer ${serviceKey}` : undefined;
      if (currentAuth && expectedAuth && currentAuth !== expectedAuth) {
        supabase.auth.headers.Authorization = expectedAuth;
        logger.debug('Reset Authorization header to service key before fetching updated user');
      }
    }
  } catch (e) {
    logger.warn('Failed to reset Authorization header guard (updated user fetch):', e?.message || e);
  }

  const { data: updatedUser, error: getUserError } = await supabase.auth.admin.getUserById(userId);
  if (getUserError) {
    logger.warn('Updated user fetch failed, using fallback from existing user and request payload:', getUserError.message || getUserError);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  const baseUser = updatedUser?.user || existingUser?.user || {};
  const user = {
    id: baseUser.id || userId,
    email: (email !== undefined ? email : baseUser.email) || baseUser.email,
    role: profile?.role || 'user',
    created_at: baseUser.created_at,
    last_sign_in_at: baseUser.last_sign_in_at,
    user_metadata: baseUser.user_metadata || nextMeta
  };

  // Güncellenen kullanıcının yetkili markalarını ekleyelim
  const { data: brandLinks } = await supabase
    .from('user_brands')
    .select('brand_id')
    .eq('user_id', userId);
  const linkedBrandIds = (brandLinks || []).map((r) => r.brand_id);
  let brands = [];
  if (linkedBrandIds.length > 0) {
    const { data: brandRows } = await supabase
      .from('brands')
      .select('id, name')
      .in('id', linkedBrandIds);
    brands = (brandRows || []).map((b) => ({ id: b.id, name: b.name }));
  }

  return sendSuccess(res, { user: { ...user, brands } }, 'Kullanıcı başarıyla güncellendi');
}));

// Belirli kullanıcının marka ID'lerini getir
router.get('/users/:userId/brands', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const { userId } = req.params;
  
  const { data, error } = await supabase
    .from('user_brands')
    .select('brand_id')
    .eq('user_id', userId);
    
  if (error) {
    throw new AppError(`Kullanıcının markaları alınamadı: ${error.message}`, 500, 'USER_BRANDS_FETCH_FAILED');
  }
  
  const brandIds = (data || []).map((r) => r.brand_id);
  return sendSuccess(res, { brandIds }, 'Kullanıcı markaları başarıyla alındı');
}));

// Kullanıcı sil
router.delete('/users/:userId', requireAuth, requireAdmin, validateInput(schemas.userIdParam), catchAsync(async (req, res) => {
  const { userId } = req.params;

  // Kendi hesabını silmeye çalışıyor mu kontrol et
  if (userId === req.user.id) {
    throw new AppError('Kendi hesabınızı silemezsiniz', 400, 'CANNOT_DELETE_SELF');
  }

  // Kullanıcıyı sil (profiles tablosundaki kayıt da otomatik silinir - cascade)
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    throw new AppError(`Kullanıcı silinirken hata oluştu: ${error.message}`, 400, 'USER_DELETE_FAILED');
  }

  return sendSuccess(res, null, 'Kullanıcı başarıyla silindi');
}));

router.get('/brands/:brandId/kpi-mappings', requireAdmin, catchAsync(async (req, res) => {
  const { brandId } = req.params;
  const { data, error } = await supabase
    .from('brand_kpi_targets')
    .select('kpi_id, target_value, target_type')
    .eq('brand_id', brandId);

  if (error) {
    throw new AppError(`KPI eşleştirmeleri alınırken hata: ${error.message}`, 500, 'KPI_MAPPINGS_FETCH_FAILED');
  }

  return sendList(res, data, 'KPI eşleştirmeleri başarıyla alındı');
}));

module.exports = router;

// --- Brands CRUD ---
// Listele
router.get('/brands', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const { search = '', status, brandCategory } = req.query;

  let baseQuery = supabase.from('brands').select('*').order('created_at', { ascending: false });
  let query = baseQuery;

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (search) {
    const like = `%${search}%`;
    query = query.or(`name.ilike.${like},description.ilike.${like}`);
  }

  if (typeof brandCategory === 'string' && brandCategory) {
    query = query.eq('category_key', brandCategory);
  }
  let { data, error } = await query;

  // Fallback: category_key kolonu yoksa filtreyi kaldırarak tekrar dene
  if (error && (error.code === '42703' || /column .* does not exist/i.test(error.message || ''))) {
    const resp = await baseQuery;
    data = resp.data || [];
    error = resp.error || null;
  }

  if (error) {
    logger.error('Supabase brands query error:', error);
    // Tablo yoksa boş liste döndürerek UI'nin çalışmasını sağlayalım
    if (error.code === '42P01' || /relation .* does not exist/i.test(error.message || '')) {
      return sendList(res, [], 'Markalar alındı');
    }
    throw new AppError(`Markalar alınırken hata: ${error.message}`, 500, 'BRANDS_FETCH_FAILED');
  }

  return sendList(res, data || [], 'Markalar başarıyla alındı');
}));

// --- Roles CRUD ---
// Listele
router.get('/roles', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const { search = '', status } = req.query;

  let query = supabase.from('roles').select('*').order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (search) {
    const like = `%${search}%`;
    query = query.or(`name.ilike.${like},description.ilike.${like}`);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Supabase roles query error:', error);
    // Tablo yoksa boş liste döndürerek UI'nin çalışmasını sağlayalım
    if (error.code === '42P01' || /relation .* does not exist/i.test(error.message || '')) {
      return sendList(res, [], 'Roller alındı');
    }
    throw new AppError(`Roller alınırken hata: ${error.message}`, 500, 'ROLES_FETCH_FAILED');
  }

  return sendList(res, data || [], 'Roller başarıyla alındı');
}));

// Oluştur
router.post('/roles', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const { name, description = '', status = 'aktif' } = req.body || {};
  
  if (!name) {
    throw new AppError('name gerekli', 400, 'NAME_REQUIRED');
  }
  
  if (!['aktif', 'pasif'].includes(status)) {
    throw new AppError('Geçersiz status', 400, 'INVALID_STATUS');
  }

  const { data, error } = await supabase
    .from('roles')
    .insert({ name, description, status })
    .select()
    .single();

  if (error) {
    throw new AppError(`Rol oluşturulamadı: ${error.message}`, 500, 'ROLE_CREATE_FAILED');
  }

  return sendCreated(res, { role: data }, 'Rol başarıyla oluşturuldu');
}));

// Güncelle
router.put('/roles/:id', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, description, status } = req.body || {};
  const payload = {};
  
  if (name !== undefined) payload.name = name;
  if (description !== undefined) payload.description = description;
  if (status !== undefined) {
    if (!['aktif', 'pasif'].includes(status)) {
      throw new AppError('Geçersiz status', 400, 'INVALID_STATUS');
    }
    payload.status = status;
  }

  const { data, error } = await supabase
    .from('roles')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new AppError(`Rol güncellenemedi: ${error.message}`, 500, 'ROLE_UPDATE_FAILED');
  }

  return sendSuccess(res, { role: data }, 'Rol başarıyla güncellendi');
}));

// Sil
router.delete('/roles/:id', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const { error } = await supabase
    .from('roles')
    .delete()
    .eq('id', id);

  if (error) {
    throw new AppError(`Rol silinemedi: ${error.message}`, 500, 'ROLE_DELETE_FAILED');
  }

  return sendSuccess(res, null, 'Rol başarıyla silindi');
}));

// Oluştur
router.post('/brands', requireAuth, requireAdmin, validateInput(schemas.createBrand), catchAsync(async (req, res) => {
  const { name, description = '', status = 'aktif', category_key } = req.body || {};
  
  if (!name) {
    throw new AppError('name gerekli', 400, 'NAME_REQUIRED');
  }
  
  if (!['aktif', 'pasif', 'kayitli'].includes(status)) {
    throw new AppError('Geçersiz status', 400, 'INVALID_STATUS');
  }

  // İlk deneme: category_key varsa ekleyerek
  let payload = { name, description, status };
  if (typeof category_key === 'string' && category_key) {
    payload.category_key = category_key;
  }

  let { data, error } = await supabase
    .from('brands')
    .insert(payload)
    .select()
    .single();

  // Fallback: category_key kolonu yoksa category_key olmadan tekrar dene
  if (error && (error.code === '42703' || /column .* does not exist/i.test(error.message || ''))) {
    const resp = await supabase
      .from('brands')
      .insert({ name, description, status })
      .select()
      .single();
    data = resp.data || null;
    error = resp.error || null;
  }

  if (error) {
    throw new AppError(`Marka oluşturulamadı: ${error.message}`, 500, 'BRAND_CREATE_FAILED');
  }

  return sendCreated(res, { brand: data }, 'Marka başarıyla oluşturuldu');
}));

// Güncelle
router.put('/brands/:id', requireAuth, requireAdmin, validateInput(schemas.idParam), validateInput(schemas.updateBrand), catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, description, status, category_key } = req.body || {};
  const payload = {};
  
  if (name !== undefined) payload.name = name;
  if (description !== undefined) payload.description = description;
  if (status !== undefined) {
    if (!['aktif', 'pasif', 'kayitli'].includes(status)) {
      throw new AppError('Geçersiz status', 400, 'INVALID_STATUS');
    }
    payload.status = status;
  }
  if (category_key !== undefined) {
    payload.category_key = category_key || null;
  }

  let { data, error } = await supabase
    .from('brands')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  // Fallback: category_key kolonu yoksa bu alanı kaldırarak yeniden dene
  if (error && (error.code === '42703' || /column .* does not exist/i.test(error.message || ''))) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.category_key;
    const resp = await supabase
      .from('brands')
      .update(fallbackPayload)
      .eq('id', id)
      .select()
      .single();
    data = resp.data || null;
    error = resp.error || null;
  }

  if (error) {
    throw new AppError(`Marka güncellenemedi: ${error.message}`, 500, 'BRAND_UPDATE_FAILED');
  }

  return sendSuccess(res, { brand: data }, 'Marka başarıyla güncellendi');
}));

// Sil
router.delete('/brands/:id', requireAuth, requireAdmin, validateInput(schemas.idParam), catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const { error } = await supabase
    .from('brands')
    .delete()
    .eq('id', id);

  if (error) {
    throw new AppError(`Marka silinemedi: ${error.message}`, 500, 'BRAND_DELETE_FAILED');
  }

  return sendSuccess(res, null, 'Marka başarıyla silindi');
}));

// --- Brand Models CRUD ---
// Listele (markaya göre)
router.get('/brands/:brandId/models', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const { brandId } = req.params;
  const { search = '', status } = req.query;

  let query = supabase
    .from('brand_models')
    .select('*')
    .eq('brand_id', brandId)
    .order('name', { ascending: true });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (search) {
    const like = `%${search}%`;
    query = query.or(`name.ilike.${like},description.ilike.${like}`);
  }

  const { data, error } = await query;

  if (error) {
    // Tablo yoksa boş liste döndürerek UI'nin çalışmasını sağlayalım
    if (error.code === '42P01' || /relation .* does not exist/i.test(error.message || '')) {
      return sendList(res, [], 'Modeller alındı');
    }
    throw new AppError(`Modeller alınırken hata: ${error.message}`, 500, 'MODELS_FETCH_FAILED');
  }

  return sendList(res, data || [], 'Modeller başarıyla alındı');
}));

// Oluştur
router.post('/brands/:brandId/models', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const { brandId } = req.params;
  const { name, description = '', status = 'aktif' } = req.body || {};
  
  if (!name) {
    throw new AppError('name gerekli', 400, 'NAME_REQUIRED');
  }
  
  if (!['aktif', 'pasif', 'kayitli'].includes(status)) {
    throw new AppError('Geçersiz status', 400, 'INVALID_STATUS');
  }

  // Marka var mı kontrol et
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('id')
    .eq('id', brandId)
    .single();

  if (brandError || !brand) {
    throw new AppError('Marka bulunamadı', 404, 'BRAND_NOT_FOUND');
  }

  const { data, error } = await supabase
    .from('brand_models')
    .insert({ brand_id: brandId, name, description, status })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      throw new AppError('Bu marka için aynı isimde model zaten mevcut', 409, 'MODEL_ALREADY_EXISTS');
    }
    throw new AppError(`Model oluşturulamadı: ${error.message}`, 500, 'MODEL_CREATE_FAILED');
  }

  return sendCreated(res, { model: data }, 'Model başarıyla oluşturuldu');
}));

// Güncelle
router.put('/brands/:brandId/models/:id', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const { brandId, id } = req.params;
  const { name, description, status } = req.body || {};
  const payload = {};
  
  if (name !== undefined) payload.name = name;
  if (description !== undefined) payload.description = description;
  if (status !== undefined) {
    if (!['aktif', 'pasif', 'kayitli'].includes(status)) {
      throw new AppError('Geçersiz status', 400, 'INVALID_STATUS');
    }
    payload.status = status;
  }

  const { data, error } = await supabase
    .from('brand_models')
    .update(payload)
    .eq('id', id)
    .eq('brand_id', brandId)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      throw new AppError('Bu marka için aynı isimde model zaten mevcut', 409, 'MODEL_ALREADY_EXISTS');
    }
    throw new AppError(`Model güncellenemedi: ${error.message}`, 500, 'MODEL_UPDATE_FAILED');
  }

  if (!data) {
    throw new AppError('Model bulunamadı', 404, 'MODEL_NOT_FOUND');
  }

  return sendSuccess(res, { model: data }, 'Model başarıyla güncellendi');
}));

// Sil
router.delete('/brands/:brandId/models/:id', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const { brandId, id } = req.params;
  
  const { error } = await supabase
    .from('brand_models')
    .delete()
    .eq('id', id)
    .eq('brand_id', brandId);

  if (error) {
    throw new AppError(`Model silinemedi: ${error.message}`, 500, 'MODEL_DELETE_FAILED');
  }

  return sendSuccess(res, null, 'Model başarıyla silindi');
}));

// Access Matrix persistence
// GET /admin/access-matrix?category=<admin|manager|user>
router.get('/access-matrix', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const category = (req.query.category || '').trim();
  if (category) {
    const { data, error } = await supabase
      .from('access_matrix')
      .select('route_path')
      .eq('category', category);
    if (error) {
      throw new AppError(`Erişim matrisi alınamadı: ${error.message}`, 500, 'ACCESS_MATRIX_FETCH_FAILED');
    }
    const routes = (data || []).map((r) => r.route_path);
    return sendSuccess(res, { category, routes }, 'Kategori için erişim matrisi alındı');
  }
  const { data, error } = await supabase
    .from('access_matrix')
    .select('route_path,category');
  if (error) {
    throw new AppError(`Erişim matrisi alınamadı: ${error.message}`, 500, 'ACCESS_MATRIX_FETCH_FAILED');
  }
  const byCat = new Map();
  (data || []).forEach((r) => {
    const arr = byCat.get(r.category) || [];
    arr.push(r.route_path);
    byCat.set(r.category, arr);
  });
  const items = ['admin','manager','user'].map((c) => ({ category: c, routes: byCat.get(c) || [] }));
  return sendList(res, items, 'Erişim matrisi alındı', items.length);
}));

// PUT /admin/access-matrix
// Body: { category: 'admin'|'manager'|'user', routes: string[] }
router.put('/access-matrix', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const body = req.body || {};
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const routes = Array.isArray(body.routes) ? body.routes.filter((p) => typeof p === 'string' && p.trim()) : [];
  if (!['admin','manager','user'].includes(category)) {
    throw new AppError('Geçersiz kategori', 400, 'BAD_REQUEST');
  }
  // Sil → Ekle (basit eşitleme)
  const { error: delErr } = await supabase
    .from('access_matrix')
    .delete()
    .eq('category', category);
  if (delErr) {
    throw new AppError(`Erişim matrisi temizlenemedi: ${delErr.message}`, 500, 'ACCESS_MATRIX_DELETE_FAILED');
  }
  if (routes.length > 0) {
    const rows = routes.map((path) => ({ route_path: path.trim(), category }));
    const { error: insErr } = await supabase
      .from('access_matrix')
      .insert(rows);
    if (insErr) {
      throw new AppError(`Erişim matrisi güncellenemedi: ${insErr.message}`, 500, 'ACCESS_MATRIX_UPDATE_FAILED');
    }
  }
  return sendSuccess(res, { category, routes }, 'Erişim matrisi başarıyla güncellendi');
}));

// Role → Category persistence
// GET /admin/role-categories[?roleName=<name>]
router.get('/role-categories', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const roleName = (req.query.roleName || '').trim();
  if (roleName) {
    const { data, error } = await supabase
      .from('role_categories')
      .select('role_name,category')
      .eq('role_name', roleName)
      .maybeSingle();
    if (error) {
      throw new AppError(`Rol kategorisi alınamadı: ${error.message}`, 500, 'ROLE_CATEGORY_FETCH_FAILED');
    }
    return sendSuccess(res, data || null, 'Rol kategorisi alındı');
  }
  const { data, error } = await supabase
    .from('role_categories')
    .select('role_name,category');
  if (error) {
    throw new AppError(`Rol kategorileri alınamadı: ${error.message}`, 500, 'ROLE_CATEGORY_FETCH_FAILED');
  }
  const items = (data || []).map((r) => ({ roleName: r.role_name, category: r.category }));
  return sendList(res, items, 'Rol kategorileri alındı', items.length);
}));

// PUT /admin/role-categories
// Body: { roleName: string, category: 'admin'|'manager'|'user' }
router.put('/role-categories', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const body = req.body || {};
  const roleName = typeof body.roleName === 'string' ? body.roleName.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  if (!roleName) {
    throw new AppError('roleName zorunlu', 400, 'BAD_REQUEST');
  }
  if (!['admin','manager','user'].includes(category)) {
    throw new AppError('Geçersiz kategori', 400, 'BAD_REQUEST');
  }
  const { data, error } = await supabase
    .from('role_categories')
    .upsert({ role_name: roleName, category })
    .select('role_name,category')
    .single();
  if (error) {
    throw new AppError(`Rol kategorisi güncellenemedi: ${error.message}`, 500, 'ROLE_CATEGORY_UPDATE_FAILED');
  }
  return sendSuccess(res, { roleName: data.role_name, category: data.category }, 'Rol kategorisi başarıyla güncellendi');
}));

// Role-based Route Access Control
// GET /admin/role-routes[?roleName=<name>]
// Note: requireAuth only - users can fetch their own role's routes, admins can fetch any role's routes
router.get('/role-routes', requireAuth, catchAsync(async (req, res) => {
  const roleName = (req.query.roleName || '').trim();
  const userRole = req.role; // From requireAuth middleware
  const normalizedUserRole = normalizeRole(userRole);
  const isAdmin = ADMIN_EQUIVALENT.has(normalizedUserRole);
  
  logger.debug('[GET /admin/role-routes] Request:', { roleName, userRole, normalizedUserRole, isAdmin });
  
  // If roleName is specified
  if (roleName) {
    // Normalize roleName for comparison (case-insensitive, accent-insensitive)
    const normalizedRoleName = normalizeRole(roleName);
    const normalizedUserRoleForComparison = normalizeRole(userRole);
    
    // Non-admin users can only fetch their own role's routes (normalized comparison)
    if (!isAdmin && normalizedRoleName !== normalizedUserRoleForComparison) {
      logger.debug('[GET /admin/role-routes] Access denied: user tried to fetch different role', {
        roleName,
        normalizedRoleName,
        userRole,
        normalizedUserRoleForComparison
      });
      throw new AppError('Sadece kendi rolünüzün route\'larını görüntüleyebilirsiniz', 403, 'FORBIDDEN');
    }
    
    // Try exact match first
    let { data, error } = await supabase
      .from('role_routes')
      .select('route_path')
      .eq('role_name', roleName);
    
    // If no results, try case-insensitive search (PostgreSQL ilike)
    if (!error && (!data || data.length === 0)) {
      logger.debug('[GET /admin/role-routes] No exact match, trying case-insensitive search');
      const { data: dataIlike, error: errorIlike } = await supabase
        .from('role_routes')
        .select('route_path')
        .ilike('role_name', roleName);
      
      if (!errorIlike && dataIlike && dataIlike.length > 0) {
        data = dataIlike;
        error = null;
        logger.debug('[GET /admin/role-routes] Found routes with case-insensitive search');
      }
    }
    
    // If still no results, try normalized comparison (fetch all and filter)
    if (!error && (!data || data.length === 0)) {
      logger.debug('[GET /admin/role-routes] No case-insensitive match, trying normalized comparison');
      const { data: allRoleRoutes, error: allError } = await supabase
        .from('role_routes')
        .select('role_name, route_path');
      
      if (!allError && allRoleRoutes) {
        // Filter by normalized role name
        const filtered = allRoleRoutes
          .filter(rr => normalizeRole(rr.role_name) === normalizedRoleName)
          .map(rr => ({ route_path: rr.route_path }));
        
        if (filtered.length > 0) {
          data = filtered;
          logger.debug('[GET /admin/role-routes] Found routes with normalized comparison', {
            normalizedRoleName,
            foundCount: filtered.length
          });
        }
      }
    }
    
    if (error) {
      throw new AppError(`Rol route'ları alınamadı: ${error.message}`, 500, 'ROLE_ROUTES_FETCH_FAILED');
    }
    
    const routes = (data || []).map((r) => r.route_path);
    logger.debug('[GET /admin/role-routes] Returning routes:', { 
      roleName, 
      normalizedRoleName,
      routes, 
      routesCount: routes.length,
      sampleRoutes: routes.slice(0, 5) // İlk 5 route'u göster
    });
    
    // Eğer route bulunamadıysa, uyarı log'u ekle
    if (routes.length === 0) {
      logger.warn('[GET /admin/role-routes] No routes found for role:', {
        roleName,
        normalizedRoleName,
        userRole,
        suggestion: 'Rol Yönetimi sayfasından bu rol için route\'lar tanımlanmış mı kontrol edin'
      });
    }
    
    return sendSuccess(res, { roleName, routes }, 'Rol route\'ları alındı');
  }
  
  // If no roleName specified, only admins can see all roles
  if (!isAdmin) {
    throw new AppError('Tüm rollerin route\'larını görüntülemek için admin yetkisi gerekli', 403, 'FORBIDDEN');
  }
  
  const { data, error } = await supabase
    .from('role_routes')
    .select('role_name,route_path');
  if (error) {
    throw new AppError(`Rol route'ları alınamadı: ${error.message}`, 500, 'ROLE_ROUTES_FETCH_FAILED');
  }
  const byRole = new Map();
  (data || []).forEach((r) => {
    const arr = byRole.get(r.role_name) || [];
    arr.push(r.route_path);
    byRole.set(r.role_name, arr);
  });
  const items = Array.from(byRole.entries()).map(([name, routes]) => ({ roleName: name, routes }));
  return sendList(res, items, 'Rol route\'ları alındı', items.length);
}));

// PUT /admin/role-routes
// Body: { roleName: string, routes: string[] }
router.put('/role-routes', requireAuth, requireAdmin, catchAsync(async (req, res) => {
  const body = req.body || {};
  const roleName = typeof body.roleName === 'string' ? body.roleName.trim() : '';
  const routes = Array.isArray(body.routes) ? body.routes.filter((p) => typeof p === 'string' && p.trim()) : [];
  if (!roleName) {
    throw new AppError('roleName zorunlu', 400, 'BAD_REQUEST');
  }
  // Sil → Ekle (basit eşitleme)
  const { error: delErr } = await supabase
    .from('role_routes')
    .delete()
    .eq('role_name', roleName);
  if (delErr) {
    throw new AppError(`Rol route'ları temizlenemedi: ${delErr.message}`, 500, 'ROLE_ROUTES_DELETE_FAILED');
  }
  if (routes.length > 0) {
    const rows = routes.map((path) => ({ role_name: roleName, route_path: path.trim() }));
    const { error: insErr } = await supabase
      .from('role_routes')
      .insert(rows);
    if (insErr) {
      throw new AppError(`Rol route'ları güncellenemedi: ${insErr.message}`, 500, 'ROLE_ROUTES_UPDATE_FAILED');
    }
  }
  return sendSuccess(res, { roleName, routes }, 'Rol route\'ları başarıyla güncellendi');
}));