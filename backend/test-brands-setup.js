require('dotenv').config();
const { supabase } = require('./src/supabase');

async function setupTestBrands() {
  try {
    console.log('Test markalarını ve kullanıcı yetkilerini oluşturuyor...');
    
    // Test kullanıcısının ID'sini al
    const testUserId = 'c702214b-9f32-4598-99c3-5928b96b4290';
    
    // Önce mevcut markaları kontrol et
    const { data: existingBrands, error: brandsError } = await supabase
      .from('brands')
      .select('*');
    
    if (brandsError) {
      console.error('Brands tablosu sorgulanamadı:', brandsError);
      return;
    }
    
    console.log('Mevcut markalar:', existingBrands?.length || 0);
    
    // Test markaları oluştur
    const testBrands = [
      { name: 'Test Marka 1', description: 'Test için oluşturulan marka 1', status: 'aktif' },
      { name: 'Test Marka 2', description: 'Test için oluşturulan marka 2', status: 'aktif' },
      { name: 'Demo Marka', description: 'Demo amaçlı marka', status: 'aktif' }
    ];
    
    let brandIds = [];
    
    // Eğer marka yoksa oluştur
    if (!existingBrands || existingBrands.length === 0) {
      console.log('Yeni markalar oluşturuluyor...');
      const { data: newBrands, error: createError } = await supabase
        .from('brands')
        .insert(testBrands)
        .select();
      
      if (createError) {
        console.error('Markalar oluşturulamadı:', createError);
        return;
      }
      
      brandIds = newBrands.map(b => b.id);
      console.log('Oluşturulan markalar:', newBrands);
    } else {
      brandIds = existingBrands.map(b => b.id);
      console.log('Mevcut markalar kullanılıyor:', existingBrands.map(b => b.name));
    }
    
    // Test kullanıcısının mevcut marka yetkilerini kontrol et
    const { data: existingUserBrands, error: userBrandsError } = await supabase
      .from('user_brands')
      .select('*')
      .eq('user_id', testUserId);
    
    if (userBrandsError) {
      console.error('User brands sorgulanamadı:', userBrandsError);
      return;
    }
    
    console.log('Test kullanıcısının mevcut marka yetkileri:', existingUserBrands?.length || 0);
    
    // Eğer kullanıcının marka yetkisi yoksa oluştur
    if (!existingUserBrands || existingUserBrands.length === 0) {
      console.log('Test kullanıcısı için marka yetkileri oluşturuluyor...');
      const userBrandData = brandIds.map(brandId => ({
        user_id: testUserId,
        brand_id: brandId
      }));
      
      const { data: newUserBrands, error: userBrandCreateError } = await supabase
        .from('user_brands')
        .insert(userBrandData)
        .select();
      
      if (userBrandCreateError) {
        console.error('Kullanıcı marka yetkileri oluşturulamadı:', userBrandCreateError);
        return;
      }
      
      console.log('Oluşturulan kullanıcı marka yetkileri:', newUserBrands);
    } else {
      console.log('Test kullanıcısının zaten marka yetkileri var');
    }
    
    // Son durumu kontrol et
    const { data: finalBrands, error: finalError } = await supabase
      .from('user_brands')
      .select(`
        brand_id,
        brands (
          id,
          name,
          status
        )
      `)
      .eq('user_id', testUserId);
    
    if (finalError) {
      console.error('Final kontrol hatası:', finalError);
      return;
    }
    
    console.log('Test kullanıcısının yetkili olduğu markalar:');
    finalBrands?.forEach(ub => {
      console.log(`- ${ub.brands.name} (${ub.brands.status})`);
    });
    
    console.log('✅ Test markaları ve yetkileri başarıyla oluşturuldu!');
    
  } catch (error) {
    console.error('Hata:', error);
  }
}

setupTestBrands();