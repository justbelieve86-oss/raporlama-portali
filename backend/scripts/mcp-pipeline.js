// SQL + HTTP + Shell örnek pipeline
// - HTTP: Backend üzerinden admin KPI listesini alır
// - SQL: Supabase Postgres'ten günlük raporları sorgular (service client)
// - Shell: Proje kökündeki doğrulama scriptini çalıştırır

const { exec } = require('node:child_process');
const path = require('node:path');
const { supabase } = require('../src/supabase');

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:4000';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || 'admin123';

async function login() {
  const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Login failed: status=${res.status} body=${txt}`);
  }
  const json = await res.json();
  const token = json?.data?.token;
  if (!token) throw new Error('Login succeeded but token missing');
  return token;
}

async function fetchAdminKpis(token) {
  const res = await fetch(`${BACKEND_URL}/api/admin/kpis`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Fetch admin KPIs failed: status=${res.status} body=${txt}`);
  }
  const json = await res.json();
  // sendList envelope: { success, data: { items, total } }
  const items = json?.data?.items || [];
  return items;
}

async function queryDailyReportsLastNDays(days = 1) {
  const now = new Date();
  const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const fromIso = fromDate.toISOString();

  // Table schema: year, month, day, value, created_at
  // Use created_at to approximate last N days window.
  const { data, error } = await supabase
    .from('kpi_daily_reports')
    .select('kpi_id, brand_id, year, month, day, value, created_at')
    .gte('created_at', fromIso);
  if (error) throw new Error(`SQL query error: ${error.message}`);
  return data || [];
}

function runVerifyScript() {
  return new Promise((resolve) => {
    const rootDir = path.resolve(__dirname, '../../');
    const cmd = 'node scripts/verify-kpis.js';
    exec(cmd, { cwd: rootDir }, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });
}

async function main() {
  try {
    console.log('[PIPELINE] Starting SQL+HTTP+Shell pipeline...');

    // HTTP: login and fetch enriched KPI list
    console.log('[HTTP] Logging in...');
    const token = await login();
    console.log('[HTTP] Token acquired. Fetching admin KPIs...');
    const kpis = await fetchAdminKpis(token);
    console.log(`[HTTP] KPI count: ${kpis.length}`);

    // SQL: query recent daily reports and do simple checks
    console.log('[SQL] Querying last day daily reports...');
    const reports = await queryDailyReportsLastNDays(1);
    const anomalies = reports.filter(r => {
      const v = Number(r.value);
      return Number.isNaN(v) || v < 0;
    });
    console.log(`[SQL] Reports: ${reports.length}, anomalies: ${anomalies.length}`);
    if (anomalies.length) {
      console.log('[SQL] Sample anomaly:', anomalies[0]);
    }

    // Shell: run existing verification script
    console.log('[SHELL] Running verify-kpis.js...');
    const { error, stdout, stderr } = await runVerifyScript();
    if (error) {
      console.error('[SHELL] verify-kpis.js error:', error.message);
    }
    if (stdout) console.log('[SHELL][stdout]\n' + stdout.trim());
    if (stderr) console.error('[SHELL][stderr]\n' + stderr.trim());

    console.log('[PIPELINE] Completed.');
    process.exit(0);
  } catch (err) {
    console.error('[PIPELINE] Failed:', err?.message || err);
    process.exit(1);
  }
}

module.exports = { login, fetchAdminKpis, queryDailyReportsLastNDays, runVerifyScript };

if (require.main === module) {
  main();
}