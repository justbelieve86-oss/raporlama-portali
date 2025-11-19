const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });

async function main() {
  const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const service = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const email = process.env.TEST_USER_EMAIL || 'test@example.com';
  const password = process.env.TEST_USER_PASSWORD || 'test123456';

  // Resolve brand and KPI
  const { data: brand } = await service
    .from('brands')
    .select('id,name')
    .eq('name', 'Toyota')
    .limit(1)
    .maybeSingle();
  const { data: usersList, error: listErr } = await service.auth.admin.listUsers();
  if (listErr) {
    console.error('List users failed:', listErr);
    return;
  }
  const userId = (usersList.users || []).find(u => u.email === email)?.id;
  if (!userId) {
    console.error('User not found by email:', email);
    return;
  }
  const { data: mapping } = await service
    .from('user_brand_kpis')
    .select('kpi_id')
    .eq('user_id', userId)
    .eq('brand_id', brand.id)
    .limit(1)
    .maybeSingle();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Insert with service role
  const payload = { user_id: userId, brand_id: brand.id, kpi_id: mapping.kpi_id, year, month, value: 1.11 };
  const { error: insErr } = await service
    .from('kpi_reports')
    .upsert(payload, { onConflict: 'user_id,brand_id,kpi_id,year,month' });
  if (insErr) {
    console.error('Service insert failed:', insErr);
    return;
  }
  console.log('Service insert succeeded');

  // Sign in anon and attempt update
  const { data: signInData, error: signErr } = await anon.auth.signInWithPassword({ email, password });
  if (signErr) {
    console.error('Sign-in failed:', signErr);
    return;
  }
  console.log('Signed in as', signInData.user?.id);

  const { error: updErr } = await anon
    .from('kpi_reports')
    .update({ value: 2.22 })
    .eq('user_id', userId)
    .eq('brand_id', brand.id)
    .eq('kpi_id', mapping.kpi_id)
    .eq('year', year)
    .eq('month', month);
  if (updErr) {
    console.error('Anon update failed:', updErr);
  } else {
    console.log('Anon update succeeded');
  }
}

main();