const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCurrentUser() {
  try {
    console.log('🔍 Checking user sessions and KPI assignments...\n');
    
    // Get all users
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Error fetching users:', userError);
      return;
    }
    
    console.log(`👥 Found ${users.users.length} users:`);
    users.users.forEach(user => {
      console.log(`  - ${user.email} (ID: ${user.id})`);
    });
    
    // Check KPI assignments for each user
    const TOYOTA_BRAND_ID = '14c8d05c-f63a-4a9f-93bd-60d61cdf9f5a';
    
    for (const user of users.users) {
      const { data: assignments, error: assignError } = await supabase
        .from('user_brand_kpis')
        .select(`
          kpi_id,
          kpis(name, category)
        `)
        .eq('user_id', user.id)
        .eq('brand_id', TOYOTA_BRAND_ID);
      
      if (!assignError && assignments.length > 0) {
        console.log(`\n🚗 ${user.email} has ${assignments.length} Toyota KPIs:`);
        assignments.slice(0, 5).forEach(assignment => {
          console.log(`  - ${assignment.kpis?.name} (${assignment.kpis?.category})`);
        });
        if (assignments.length > 5) {
          console.log(`  ... and ${assignments.length - 5} more`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkCurrentUser();