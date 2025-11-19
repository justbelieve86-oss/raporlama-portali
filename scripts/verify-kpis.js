const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyKpis() {
  try {
    console.log('🔍 Verifying KPIs in database...\n');
    
    // Check if KPIs exist
    const { data: kpis, error: kpiError } = await supabase
      .from('kpis')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (kpiError) {
      console.error('❌ Error fetching KPIs:', kpiError);
      return;
    }
    
    console.log(`✅ Found ${kpis.length} KPIs in database:`);
    kpis.forEach(kpi => {
      console.log(`  - ${kpi.name} (ID: ${kpi.id}, Category: ${kpi.category})`);
    });
    
    // Check user_brand_kpis assignments
    const { data: assignments, error: assignError } = await supabase
      .from('user_brand_kpis')
      .select(`
        *,
        kpis(name, category),
        brands(name)
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (assignError) {
      console.error('❌ Error fetching KPI assignments:', assignError);
      return;
    }
    
    console.log(`\n✅ Found ${assignments.length} KPI assignments:`);
    assignments.forEach(assignment => {
      console.log(`  - User ${assignment.user_id} -> ${assignment.kpis?.name} (${assignment.brands?.name})`);
    });
    
    // Check specific user and brand
    const TOYOTA_BRAND_ID = '14c8d05c-f63a-4a9f-93bd-60d61cdf9f5a';
    const { data: toyotaAssignments, error: toyotaError } = await supabase
      .from('user_brand_kpis')
      .select(`
        *,
        kpis(name, category)
      `)
      .eq('brand_id', TOYOTA_BRAND_ID);
    
    if (toyotaError) {
      console.error('❌ Error fetching Toyota assignments:', toyotaError);
      return;
    }
    
    console.log(`\n🚗 Toyota brand KPI assignments: ${toyotaAssignments.length}`);
    toyotaAssignments.forEach(assignment => {
      console.log(`  - User ${assignment.user_id} -> ${assignment.kpis?.name}`);
    });
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

verifyKpis();