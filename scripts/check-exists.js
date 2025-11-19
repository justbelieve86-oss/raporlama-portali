const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });

async function main() {
  const service = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const email = process.env.TEST_USER_EMAIL || 'test@example.com';
  const { data: usersList } = await service.auth.admin.listUsers();
  const userId = (usersList.users || []).find(u => u.email === email)?.id;
  const { data: brand } = await service.from('brands').select('id').eq('name', 'Toyota').maybeSingle();
  const { data, error } = await service
    .from('user_brands')
    .select('user_id,brand_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('brand_id', brand.id);
  console.log('Exists count:', data, 'error:', error);
}

main();