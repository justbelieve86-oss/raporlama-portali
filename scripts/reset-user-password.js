const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const service = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findUser({ identifier }) {
  const { data, error } = await service.auth.admin.listUsers();
  if (error) throw error;
  const users = data?.users || [];
  const byEmail = users.find(u => (u.email || '').toLowerCase() === identifier.toLowerCase());
  if (byEmail) return byEmail;
  const byUsername = users.find(u => (u.user_metadata?.username || '').toLowerCase() === identifier.toLowerCase());
  return byUsername || null;
}

async function main() {
  const identifier = process.argv[2]; // email veya username
  const newPassword = process.argv[3];

  if (!identifier || !newPassword) {
    console.log('Kullanım: node scripts/reset-user-password.js <email|username> <newPassword>');
    console.log('Örnek: node scripts/reset-user-password.js hayri.kayar HayriKayar123!');
    process.exit(1);
  }

  try {
    const user = await findUser({ identifier });
    if (!user) {
      console.error('❌ Kullanıcı bulunamadı:', identifier);
      process.exit(1);
    }

    const { error: updateErr } = await service.auth.admin.updateUserById(user.id, { password: newPassword });
    if (updateErr) {
      console.error('❌ Şifre güncellenemedi:', updateErr.message || updateErr);
      process.exit(1);
    }

    console.log('✅ Şifre başarıyla güncellendi');
    console.log('👤 Kullanıcı:', user.email, '/', user.user_metadata?.username, `(${user.id})`);
  } catch (e) {
    console.error('❌ Beklenmeyen hata:', e);
    process.exit(1);
  }
}

main();