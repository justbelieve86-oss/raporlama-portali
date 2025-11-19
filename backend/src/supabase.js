const { createClient } = require('@supabase/supabase-js');
const logger = require('./utils/logger');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  const errorMsg = 'Supabase URL veya Service Role Key eksik. Lütfen .env dosyasını kontrol edin.';
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${errorMsg} Production ortamında zorunludur.`);
  }
  logger.warn(errorMsg);
}

// Production'da boş string kontrolü
if (process.env.NODE_ENV === 'production') {
  if (!supabaseUrl || supabaseUrl.trim() === '') {
    throw new Error('SUPABASE_URL boş olamaz. Production ortamında geçerli bir URL gereklidir.');
  }
  if (!supabaseServiceRoleKey || supabaseServiceRoleKey.trim() === '') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY boş olamaz. Production ortamında geçerli bir key gereklidir.');
  }
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

module.exports = { supabase };