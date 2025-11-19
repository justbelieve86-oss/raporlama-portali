const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const service = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  try {
    const BRAND_NAMES = ['Toyota', 'Honda', 'BYD'];

    // Resolve Toyota brand id
    // Resolve brand IDs for target names
    const { data: foundBrands, error: brandsErr } = await service
      .from('brands')
      .select('id,name')
      .in('name', BRAND_NAMES);
    if (brandsErr) throw brandsErr;
    if (!foundBrands || foundBrands.length === 0) throw new Error('Target brands not found');
    const brandMap = new Map(foundBrands.map(b => [b.name, b.id]));
    console.log('🚗 Brands:', foundBrands.map(b => `${b.name}:${b.id}`).join(', '));

    // List known users
    const { data: usersList, error: usersErr } = await service.auth.admin.listUsers();
    if (usersErr) throw usersErr;
    const users = usersList.users || [];

    const identifiersToAuthorize = [
      'test@example.com',
      'owner@test.com',
      'hayrikaya1r@windowslive.com',
      'hayri.kayar', // username-based authorization
    ];

    // Map emails to user ids
    const targets = users
      .filter(u => identifiersToAuthorize.includes(u.email) || identifiersToAuthorize.includes(u.user_metadata?.username))
      .map(u => ({ id: u.id, email: u.email, username: u.user_metadata?.username }));
    if (targets.length === 0) {
      console.log('No target users found to authorize.');
      return;
    }

    // Upsert user_brands entries
    // Upsert for all brands
    const rows = [];
    for (const t of targets) {
      for (const brandName of BRAND_NAMES) {
        const bId = brandMap.get(brandName);
        if (bId) rows.push({ user_id: t.id, brand_id: bId });
      }
    }
    const { error: upErr } = await service
      .from('user_brands')
      .upsert(rows, { onConflict: 'user_id,brand_id' });
    if (upErr) throw upErr;

    console.log('✅ Authorized users for brands:', BRAND_NAMES.join(', '));
    targets.forEach(t => console.log(`  - ${t.email} / ${t.username} (${t.id})`));
  } catch (e) {
    console.error('❌ Authorization failed:', e);
    process.exitCode = 1;
  }
}

main();