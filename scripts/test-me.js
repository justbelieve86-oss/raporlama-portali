// Node 18+ script: login then call /api/me with Bearer token
const http = require('http');
const https = require('https');

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk.toString()));
      res.on('end', () => {
        try {
          const json = JSON.parse(data || '{}');
          resolve({ status: res.statusCode, json });
        } catch (e) {
          resolve({ status: res.statusCode, json: null, text: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function main() {
  const base = process.env.API_BASE || 'http://localhost:4000/api';
  const username = process.env.USERNAME || 'hayri.kayar';
  const password = process.env.PASSWORD || 'HayriKayar123!';

  const loginRes = await fetchJson(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (loginRes.status < 200 || loginRes.status >= 300) {
    console.error('Login failed:', loginRes.status, loginRes.json);
    process.exit(1);
  }
  const token = loginRes.json?.data?.token || loginRes.json?.data?.access_token;
  const role = loginRes.json?.data?.role;
  console.log('Login OK. role=', role, 'tokenLen=', token?.length || 0);

  const meRes = await fetchJson(`${base}/me`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  console.log('GET /me status=', meRes.status);
  console.log(JSON.stringify(meRes.json, null, 2));
}

main().catch((e) => { console.error('Error:', e); process.exit(2); });