// Admin token ile backend DELETE /admin/users/:id çağrısını test eder
require('dotenv').config({ path: './backend/.env' });
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

async function signInAsAdmin() {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('SUPABASE_URL veya SUPABASE_ANON_KEY eksik');
  const client = createClient(url, anon);
  const { data, error } = await client.auth.signInWithPassword({
    email: 'admin@example.com',
    password: 'admin123456',
  });
  if (error) throw error;
  return data.session?.access_token;
}

async function getUsers(token) {
  const base = 'http://localhost:4012/api';
  const res = await axios.get(`${base}/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = res.data?.data || {};
  const items = payload.items || [];
  return items;
}

async function deleteUserByEmail(token, email) {
  const users = await getUsers(token);
  const user = users.find((u) => u.email === email);
  if (!user) throw new Error(`Kullanıcı bulunamadı: ${email}`);
  const base = 'http://localhost:4012/api';
  const res = await axios.delete(`${base}/admin/users/${user.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

async function main() {
  try {
    const token = await signInAsAdmin();
    console.log('Admin token alındı:', !!token);
    const users = await getUsers(token);
    console.log('Kullanıcı sayısı:', users.length);
    const testUser = users.find((u) => u.email === 'test@example.com');
    console.log('Test kullanıcı:', testUser ? { id: testUser.id, email: testUser.email } : null);

    const result = await deleteUserByEmail(token, 'test@example.com');
    console.log('Delete sonucu:', result);
  } catch (e) {
    console.error('Silme testi hatası:', e?.message || e);
    if (e?.response) {
      console.error('Status:', e.response.status, e.response.statusText);
      console.error('Body:', e.response.data);
    }
  }
}

main();