const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY eksik!');
  console.log('Backend/.env dosyasını kontrol edin.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function createAdminUser() {
  const email = process.argv[2];
  const password = process.argv[3];
  const username = process.argv[4] || email.split('@')[0];

  if (!email || !password) {
    console.log('❌ Kullanım: node create-admin.js <email> <password> [username]');
    console.log('Örnek: node create-admin.js admin@example.com 123456 admin');
    process.exit(1);
  }

  try {
    console.log('🔄 Admin kullanıcısı oluşturuluyor...');
    
    // Supabase Auth'da kullanıcı oluştur
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        role: 'admin',
        username: username
      },
    });

    if (error) {
      console.error('❌ Kullanıcı oluşturma hatası:', error.message);
      process.exit(1);
    }

    const userId = data?.user?.id;
    if (!userId) {
      console.error('❌ Kullanıcı ID alınamadı');
      process.exit(1);
    }

    // Profiles tablosuna admin rolü ekle
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ 
        id: userId, 
        role: 'admin' 
      });

    if (profileError) {
      console.error('❌ Profile oluşturma hatası:', profileError.message);
      // Kullanıcıyı sil
      await supabase.auth.admin.deleteUser(userId);
      process.exit(1);
    }

    console.log('✅ Admin kullanıcısı başarıyla oluşturuldu!');
    console.log('📧 Email:', email);
    console.log('👤 Username:', username);
    console.log('🔑 Password:', password);
    console.log('🛡️  Role: admin');
    console.log('');
    console.log('🌐 Giriş yapmak için: http://localhost:4321/login');
    
  } catch (error) {
    console.error('❌ Beklenmeyen hata:', error.message);
    process.exit(1);
  }
}

createAdminUser();