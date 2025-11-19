const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

async function main() {
  const table = process.argv[2] || 'kpi_reports';
  const service = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  try {
    const { data, error } = await service.rpc('list_rls_policies', { table_name: table });
    if (error) {
      console.error('Error listing policies:', error);
      return;
    }
    console.log(`Policies on public.${table}:`);
    (data || []).forEach(p => {
      console.log(`- ${p.policyname}: permissive=${p.permissive}, roles=${p.roles}, cmd=${p.cmd}, qual=${p.qual}, with_check=${p.with_check}`);
    });
  } catch (e) {
    console.error('Failed to list policies:', e);
  }
}

main();