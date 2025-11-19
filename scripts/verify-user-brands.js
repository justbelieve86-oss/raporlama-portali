const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const service = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  try {
    const emails = ['test@example.com', 'owner@test.com', 'hayrikaya1r@windowslive.com'];
    const { data: usersData, error: usersErr } = await service.auth.admin.listUsers();
    if (usersErr) throw usersErr;
    const users = usersData.users.filter(u => emails.includes(u.email));

    const { data: toyota, error: brandErr } = await service
      .from('brands')
      .select('id,name')
      .eq('name', 'Toyota')
      .limit(1)
      .maybeSingle();
    if (brandErr) throw brandErr;
    if (!toyota) throw new Error('Toyota not found');

    console.log('Brand:', toyota);

    for (const u of users) {
      const { data: rows, error } = await service
        .from('user_brands')
        .select('*')
        .eq('user_id', u.id)
        .eq('brand_id', toyota.id);
      if (error) throw error;
      console.log(`${u.email}:`, rows.length > 0 ? 'AUTHORIZED' : 'NOT AUTHORIZED');
    }
  } catch (e) {
    console.error('Verification failed:', e);
    process.exitCode = 1;
  }
}

main();