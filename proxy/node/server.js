import express from 'express';

const app = express();
const portArg = process.argv.find(arg => arg.startsWith('--port='));
const PORT = portArg ? portArg.split('=')[1] : 3001;
const AUTH_SECRET = process.env.AUTH_SECRET;

const RATE_WINDOW = 60_000;
const RATE_MAX = 60;
const hits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  let list = hits.get(ip);
  if (!list) { list = []; hits.set(ip, list); }
  while (list.length && now - list[0] > RATE_WINDOW) list.shift();
  if (list.length >= RATE_MAX) return true;
  list.push(now);
  return false;
}

setInterval(() => {
  for (const [ip, list] of hits) {
    if (!list.length) hits.delete(ip);
  }
}, 300_000);

function validateUrl(urlString) {
  let parsed;
  try { parsed = new URL(urlString); } catch { return false; }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) return false;
  const ipMatch = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipMatch) {
    const [, a, b] = ipMatch.map(Number);
    if (a === 0 || a === 127 || a === 10) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 169 && b === 254) return false;
  }
  if (hostname === '[::1]' || hostname.startsWith('[::ffff:') || hostname.startsWith('[fe80:')) return false;
  return true;
}

if (!AUTH_SECRET) {
  console.error('ERROR: AUTH_SECRET environment variable is required');
  process.exit(1);
}

app.use((req, res) => {
  if (req.method === 'OPTIONS') {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Proxy-Key, x-api-key, anthropic-version, x-goog-api-key',
    });
    return res.status(204).end();
  }

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
  if (isRateLimited(clientIp)) {
    res.set('Access-Control-Allow-Origin', '*');
    return res.status(429).send('Too Many Requests');
  }

  if (req.headers['x-proxy-key'] !== AUTH_SECRET) {
    res.set('Access-Control-Allow-Origin', '*');
    return res.status(401).send('Unauthorized');
  }

  const targetUrl = req.query.url;
  if (!targetUrl) {
    res.set('Access-Control-Allow-Origin', '*');
    return res.status(400).send('Missing ?url= parameter');
  }

  if (!validateUrl(targetUrl)) {
    res.set('Access-Control-Allow-Origin', '*');
    return res.status(403).send('Forbidden: target URL not allowed');
  }

  (async () => {
    try {
      const headers = { 'Content-Type': req.headers['content-type'] || 'application/json' };
      if (req.headers['authorization']) headers['Authorization'] = req.headers['authorization'];
      if (req.headers['x-api-key']) headers['x-api-key'] = req.headers['x-api-key'];
      if (req.headers['anthropic-version']) headers['anthropic-version'] = req.headers['anthropic-version'];
      if (req.headers['x-goog-api-key']) headers['x-goog-api-key'] = req.headers['x-goog-api-key'];

      const response = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : req,
        duplex: 'half',
      });

      res.set('Access-Control-Allow-Origin', '*');
      res.status(response.status);

      response.body.pipeTo(new WritableStream({
        write(chunk) { res.write(chunk); },
        close() { res.end(); },
      })).catch(() => { if (!res.writableEnded) res.end(); });
    } catch (err) {
      console.error('Proxy error:', err);
      res.set('Access-Control-Allow-Origin', '*');
      res.status(500).send('Proxy Error: request failed');
    }
  })();
});

app.listen(PORT, () => console.log(`CORS proxy running on port ${PORT}`));
