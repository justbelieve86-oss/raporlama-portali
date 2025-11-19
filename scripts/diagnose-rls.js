const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });

async function main() {
  const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const service = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const email = process.env.TEST_USER_EMAIL || 'test@example.com';
  const password = process.env.TEST_USER_PASSWORD || 'test123456';

  try {
    const { data: brand, error: brandErr } = await service
      .from('brands')
      .select('id,name')
      .eq('name', 'Toyota')
      .limit(1)
      .maybeSingle();
    if (brandErr) throw brandErr;
    if (!brand) throw new Error('Toyota brand not found');

    const { data: authData, error: signErr } = await anon.auth.signInWithPassword({ email, password });
    if (signErr) throw signErr;
    const userId = authData.user?.id;
    console.log('Signed in as:', email, userId);

    // Check user_brands visibility via anon client
    const { data: ubRows, error: ubErr } = await anon
      .from('user_brands')
      .select('user_id, brand_id')
      .eq('user_id', userId)
      .eq('brand_id', brand.id);
    if (ubErr) {
      console.error('user_brands query error:', ubErr);
    } else {
      console.log('user_brands rows visible to user:', ubRows);
    }

    // Find a KPI id; prefer one assigned to this user for this brand
    const { data: myMapping, error: myMapErr } = await service
      .from('user_brand_kpis')
      .select('kpi_id,user_id,brand_id')
      .eq('user_id', userId)
      .eq('brand_id', brand.id)
      .limit(1)
      .maybeSingle();
    if (myMapErr) throw myMapErr;
    if (!myMapping) throw new Error('No KPI mapping found for this user and Toyota');

    const now = new Date();
    const year = now.getFullYear();
    // Use a different month to avoid conflict with existing rows
    const month = ((now.getMonth() + 2) % 12) + 1;

    const payload = {
      user_id: userId,
      brand_id: brand.id,
      kpi_id: myMapping.kpi_id,
      year,
      month,
      value: 12.34,
    };

    console.log('Attempting upsert with payload:', payload);
    const { data: insData, error: insErr } = await anon
      .from('kpi_reports')
      .insert(payload)
      .select();
    if (insErr) {
      console.error('Insert error:', insErr);
    } else {
      console.log('Insert success:', insData);
    }
  } catch (e) {
    console.error('diagnose-rls failed:', e);
    process.exitCode = 1;
  }
}

main();