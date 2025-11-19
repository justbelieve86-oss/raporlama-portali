// Simple backend smoke test: checks /api/health returns 200
const http = require('http');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 4000);
const PATH = process.env.PATHNAME || '/api/health';

function fetchText(host, port, path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host, port, path, method: 'GET' }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk.toString()));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  try {
    const { status, body } = await fetchText(HOST, PORT, PATH);
    const ok = status >= 200 && status < 300;
    if (ok) {
      console.log(`[SMOKE] PASS ${PATH} status=${status} body=${body}`);
      process.exit(0);
    }
    console.error(`[SMOKE] FAIL ${PATH} status=${status} body=${body}`);
    process.exit(1);
  } catch (err) {
    console.error('[SMOKE] ERROR', err?.message || err);
    process.exit(2);
  }
})();