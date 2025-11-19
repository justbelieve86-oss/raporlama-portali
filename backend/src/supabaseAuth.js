const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

function createAuthClient() {
  // Auth işlemleri için yalnızca ANON key kullanılmalı
  if (!supabaseUrl || !anonKey) {
    const errorMsg = 'Supabase URL veya ANON key eksik. Auth client oluşturulamadı.';
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`${errorMsg} Production ortamında zorunludur.`);
    }
    throw new Error(errorMsg);
  }
  return createClient(supabaseUrl, anonKey);
}

module.exports = { createAuthClient };