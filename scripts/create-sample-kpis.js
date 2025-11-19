const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY ortam değişkenleri zorunludur. Güvenlik için hardcoded anahtar kullanılmıyor.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSampleKpis() {
  console.log('Creating sample KPIs...');

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

  try {
    // Insert KPIs
    const { data: kpis, error: kpiError } = await supabase
      .from('kpis')
      .insert(sampleKpis)
      .select();

    if (kpiError) {
      console.error('Error creating KPIs:', kpiError);
      return;
    }

    console.log(`Successfully created ${kpis.length} KPIs:`);
    kpis.forEach(kpi => {
      console.log(`- ${kpi.name} (${kpi.category}) - ID: ${kpi.id}`);
    });

    return kpis;
  } catch (error) {
    console.error('Error:', error);
  }
}

async function assignKpisToUser(userId, brandId, kpis) {
  console.log(`\nAssigning KPIs to user ${userId} for brand ${brandId}...`);

  const userBrandKpis = kpis.map(kpi => ({
    user_id: userId,
    brand_id: brandId,
    kpi_id: kpi.id
  }));

  try {
    const { data, error } = await supabase
      .from('user_brand_kpis')
      .insert(userBrandKpis)
      .select();

    if (error) {
      console.error('Error assigning KPIs to user:', error);
      return;
    }

    console.log(`Successfully assigned ${data.length} KPIs to user`);
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

async function main() {
  const userId = process.env.USER_ID;
  const brandId = process.env.TOYOTA_ID;

  if (!userId || !brandId) {
    console.error('Please set USER_ID and TOYOTA_ID environment variables');
    process.exit(1);
  }

  console.log(`User ID: ${userId}`);
  console.log(`Toyota Brand ID: ${brandId}`);

  // Create sample KPIs
  const kpis = await createSampleKpis();
  if (!kpis) {
    console.error('Failed to create KPIs');
    process.exit(1);
  }

  // Assign KPIs to user
  await assignKpisToUser(userId, brandId, kpis);

  console.log('\nSample KPIs created and assigned successfully!');
}

if (require.main === module) {
  main().catch(console.error);
}