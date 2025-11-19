const path = require('path');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../frontend/.env') });

async function main() {
  const url = process.env.PUBLIC_SUPABASE_URL;
  const anon = process.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.error('Missing frontend Supabase env vars');
    process.exit(1);
  }

  const supabase = createClient(url, anon);
  const { data, error } = await supabase.auth.signInWithPassword({ email: 'owner@test.com', password: '123456' });
  if (error) {
    console.error('Supabase login error:', error.message);
    process.exit(1);
  }

  const token = data.session?.access_token;
  if (!token) {
    console.error('No session token');
    process.exit(1);
  }

  await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 4000,
      path: '/api/admin/users',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Body:', body);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Request failed with status code ${res.statusCode}`));
        }
      });
    });

    req.on('error', (e) => {
      console.error('Request error:', e);
      reject(e);
    });

    req.end();
  });
}

main().catch(err => {
  console.error('Main function error:', err.message);
  process.exit(1);
});