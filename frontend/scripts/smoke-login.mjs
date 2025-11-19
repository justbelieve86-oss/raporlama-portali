// Simple smoke test to verify /login renders as expected
import http from 'node:http';
import https from 'node:https';

const PORT = process.env.PORT || 4321;
const URL = process.env.URL || `http://localhost:${PORT}/login`;

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk.toString()));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      })
      .on('error', reject);
  });
}

(async () => {
  try {
    const { status, body } = await fetchText(URL);
    const okStatus = status && status >= 200 && status < 300;
    const hasLoginHeading = /Giriş Yap/i.test(body);
    const hasForm = /<form/i.test(body);
    const passed = okStatus && hasLoginHeading && hasForm;

    if (passed) {
      console.log(`[SMOKE] PASS /login status=${status} heading=${hasLoginHeading} form=${hasForm}`);
      process.exit(0);
    }
    console.error(`[SMOKE] FAIL /login status=${status} heading=${hasLoginHeading} form=${hasForm}`);
    process.exit(1);
  } catch (err) {
    console.error('[SMOKE] ERROR', err?.message || err);
    process.exit(2);
  }
})();