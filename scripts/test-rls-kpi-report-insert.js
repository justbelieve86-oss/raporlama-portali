const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });

const service = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function main() {
  try {
    const email = 'test@example.com';
    const password = 'test123456';

    // Resolve Toyota brand id
    const { data: brand, error: brandErr } = await service
      .from('brands')
      .select('id,name')
      .eq('name', 'Toyota')
      .limit(1)
      .maybeSingle();
    if (brandErr) throw brandErr;
    if (!brand) throw new Error('Toyota brand not found');

    // Pick one KPI assigned to test user for Toyota
    const { data: mapping, error: mapErr } = await service
      .from('user_brand_kpis')
      .select('kpi_id')
      .eq('brand_id', brand.id)
      .limit(1)
      .maybeSingle();
    if (mapErr) throw mapErr;
    if (!mapping) throw new Error('No KPI mapping found for Toyota');

    // Sign in as normal user with anon client
    const { data: signInData, error: signInErr } = await anon.auth.signInWithPassword({ email, password });
    if (signInErr) throw signInErr;
    const userId = signInData.user?.id;
    if (!userId) throw new Error('No user id after sign-in');

    console.log('👤 Signed in as', email, userId);

    // Attempt to upsert a kpi_report row (should pass RLS now)
    const now = new Date();
    const year = now.getFullYear();
    const month = Math.max(1, Math.min(12, now.getMonth() + 1));

    const payload = {
      user_id: userId,
      brand_id: brand.id,
      kpi_id: mapping.kpi_id,
      year,
      month,
      value: 123.45,
    };

    const { error: upErr } = await anon
      .from('kpi_reports')
      .upsert(payload, { onConflict: 'user_id,brand_id,kpi_id,year,month' });
    if (upErr) throw upErr;

    console.log('✅ RLS insert succeeded for kpi_reports:', { year, month, kpi_id: mapping.kpi_id });
  } catch (e) {
    console.error('❌ RLS test failed:', e);
    process.exitCode = 1;
  }
}

main();