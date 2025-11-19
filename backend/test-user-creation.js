require('dotenv').config({ path: './backend/.env' });
const { supabase } = require('./src/supabase');

async function findUserIdByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Kullanıcılar listelenemedi:', error);
    return null;
  }
  const u = (data?.users || []).find((x) => x.email === email);
  return u?.id || null;
}

async function ensureUser(email, password, role, username) {
  // Önce kullanıcıyı oluşturmaya çalış
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, role }
  });
  let userId = data?.user?.id || null;
  if (error) {
    console.warn(`Kullanıcı zaten olabilir veya oluşturma hatası: ${email}`, error?.message || error);
    // Varsa mevcut kullanıcı id'sini bul
    userId = await findUserIdByEmail(email);
    if (userId) {
      console.log(`Kullanıcı zaten var: ${email}. Şifre güncelleniyor...`);
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, { password });
      if (updateError) {
        throw new Error(`Kullanıcı şifresi güncellenemedi: ${updateError.message}`);
      }
      console.log(`Şifre güncellendi: ${email}`);
    }
  }
  if (!userId) {
    throw new Error(`Kullanıcı id bulunamadı: ${email}`);
  }
  console.log(`Kullanıcı hazır: ${email} -> ${userId}`);
  // Profiles tablosuna rolü yaz
  const { error: upsertErr } = await supabase
    .from('profiles')
    .upsert({ id: userId, role }, { onConflict: 'id' });
  if (upsertErr) {
    throw upsertErr;
  }
  console.log(`Profiles upsert başarılı: ${email} role=${role}`);
  return userId;
}

async function createOrEnsureUsers() {
  try {
    console.log('Supabase URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
    console.log('Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');
    const testId = await ensureUser('test@example.com', 'test123456', 'user', 'testuser');
    const adminId = await ensureUser('admin@example.com', 'admin123456', 'admin', 'admin');
    console.log('Hazır kullanıcılar:', { testId, adminId });
  } catch (error) {
    console.error('Hata:', error);
  }
}

createOrEnsureUsers();