const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function assignKpisToTestUser() {
  try {
    const TEST_USER_ID = 'c702214b-9f32-4598-99c3-5928b96b4290'; // test@example.com
    const TOYOTA_BRAND_ID = '14c8d05c-f63a-4a9f-93bd-60d61cdf9f5a';
    
    console.log('🔄 Assigning KPIs to test@example.com user...\n');
    
    // Get all KPIs
    const { data: kpis, error: kpiError } = await supabase
      .from('kpis')
      .select('id, name')
      .limit(10); // Assign first 10 KPIs
    
    if (kpiError) {
      console.error('❌ Error fetching KPIs:', kpiError);
      return;
    }
    
    console.log(`📋 Found ${kpis.length} KPIs to assign`);
    
    // Assign each KPI to the test user
    const assignments = kpis.map(kpi => ({
      user_id: TEST_USER_ID,
      brand_id: TOYOTA_BRAND_ID,
      kpi_id: kpi.id
    }));
    
    const { data, error } = await supabase
      .from('user_brand_kpis')
      .upsert(assignments, { 
        onConflict: 'user_id,brand_id,kpi_id',
        ignoreDuplicates: true 
      });
    
    if (error) {
      console.error('❌ Error assigning KPIs:', error);
      return;
    }
    
    console.log(`✅ Successfully assigned ${kpis.length} KPIs to test@example.com`);
    kpis.forEach(kpi => {
      console.log(`  - ${kpi.name}`);
    });
    
  } catch (error) {
    console.error('❌ Assignment failed:', error);
  }
}

assignKpisToTestUser();