require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUsers() {
  console.log('Supabase URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
  console.log('Service key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');
  
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error('Error:', error.message);
      return;
    }
    
    console.log('\nUsers found:');
    data.users.forEach(user => {
      const username = user.user_metadata?.username || 'N/A';
      console.log(`Email: ${user.email}, Username: ${username}, ID: ${user.id}`);
    });
  } catch (err) {
    console.error('Exception:', err.message);
  }
}

checkUsers();