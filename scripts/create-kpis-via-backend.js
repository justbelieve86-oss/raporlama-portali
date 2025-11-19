const fs = require('fs');

async function createKpisViaBackend() {
  // Read the login token
  let token;
  try {
    const loginData = JSON.parse(fs.readFileSync('/tmp/login.json', 'utf8'));
    token = loginData.access_token;
  } catch (error) {
    console.error('Could not read login token:', error.message);
    process.exit(1);
  }

  const userId = "9b45e0ec-13b2-40d6-8aeb-8d1765415a0a";
  const toyotaId = "1";

  console.log(`User ID: ${userId}`);
  console.log(`Toyota Brand ID: ${toyotaId}`);

  // Sample KPIs to create
  const sampleKpis = [
    {
      name: 'Gizli Müşteri',
      category: 'Satış',
      unit: 'Puan',
      status: 'aktif',
      ytd_calc: 'ortalama',
      calculation_type: 'direct'
    },
    {
      name: 'Müşteri Memnuniyeti',
      category: 'Satış', 
      unit: 'Puan',
      status: 'aktif',
      ytd_calc: 'ortalama',
      calculation_type: 'direct'
    },
    {
      name: 'Satış Adedi',
      category: 'Satış',
      unit: 'Adet',
      status: 'aktif',
      ytd_calc: 'toplam',
      calculation_type: 'direct'
    },
    {
      name: 'Ciro',
      category: 'Satış',
      unit: 'TL',
      status: 'aktif',
      ytd_calc: 'toplam',
      calculation_type: 'direct'
    },
    {
      name: 'Servis Memnuniyeti',
      category: 'Servis',
      unit: 'Puan',
      status: 'aktif',
      ytd_calc: 'ortalama',
      calculation_type: 'direct'
    },
    {
      name: 'Servis İş Emri Sayısı',
      category: 'Servis',
      unit: 'Adet',
      status: 'aktif',
      ytd_calc: 'toplam',
      calculation_type: 'direct'
    }
  ];

  console.log('\nCreating KPIs directly in database...');

  // Since there's no KPI creation API, let's create them directly via SQL
  const sqlStatements = [];
  
  // Generate INSERT statements for KPIs
  sampleKpis.forEach((kpi, index) => {
    const kpiId = index + 1;
    sqlStatements.push(`
INSERT INTO public.kpis (id, name, category, unit, status, ytd_calc, calculation_type, report_count)
VALUES (${kpiId}, '${kpi.name}', '${kpi.category}', '${kpi.unit}', '${kpi.status}', '${kpi.ytd_calc}', '${kpi.calculation_type}', 0)
ON CONFLICT (id) DO NOTHING;`);
    
    // Generate INSERT statements for user_brand_kpis
    sqlStatements.push(`
INSERT INTO public.user_brand_kpis (user_id, brand_id, kpi_id)
VALUES ('${userId}', '${toyotaId}', ${kpiId})
ON CONFLICT (user_id, brand_id, kpi_id) DO NOTHING;`);
  });

  // Write SQL file
  const sqlContent = sqlStatements.join('\n');
  fs.writeFileSync('/tmp/create_sample_kpis.sql', sqlContent);
  
  console.log('SQL file created at /tmp/create_sample_kpis.sql');
  console.log('\nSQL Content:');
  console.log(sqlContent);
  
  return true;
}

createKpisViaBackend().catch(console.error);