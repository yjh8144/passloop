import express from 'express';

const app = express();
const portArg = process.argv.find(arg => arg.startsWith('--port='));
const PORT = portArg ? portArg.split('=')[1] : 3001;
const AUTH_SECRET = process.env.AUTH_SECRET;
const TRUST_PROXY = process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true';

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

// Parse any IPv4 literal accepted by inet_aton (dotted/decimal/octal/hex and
// short forms like "127.1" or "2130706433") into four octets, or null if the
// host is not an IPv4 literal and should be treated as a DNS name.
function parseIpv4(host) {
  const parts = host.split('.');
  if (parts.length < 1 || parts.length > 4) return null;
  const nums = [];
  for (const part of parts) {
    if (part === '') return null;
    let n;
    if (/^0x[0-9a-f]+$/i.test(part)) n = parseInt(part, 16);
    else if (/^0[0-7]+$/.test(part)) n = parseInt(part, 8);
    else if (/^[0-9]+$/.test(part)) n = parseInt(part, 10);
    else return null;
    if (!Number.isInteger(n) || n < 0) return null;
    nums.push(n);
  }
  let value;
  const len = nums.length;
  if (len === 1) {
    if (nums[0] > 0xffffffff) return null;
    value = nums[0];
  } else if (len === 2) {
    if (nums[0] > 0xff || nums[1] > 0xffffff) return null;
    value = nums[0] * 0x1000000 + nums[1];
  } else if (len === 3) {
    if (nums[0] > 0xff || nums[1] > 0xff || nums[2] > 0xffff) return null;
    value = nums[0] * 0x1000000 + nums[1] * 0x10000 + nums[2];
  } else {
    if (nums.some((n) => n > 0xff)) return null;
    value = nums[0] * 0x1000000 + nums[1] * 0x10000 + nums[2] * 0x100 + nums[3];
  }
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function isBlockedIpv4(octets) {
  const [a, b] = octets;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 10) return true; // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 169 && b === 254) return true; // link-local
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  return false;
}

// Expand an IPv6 literal (without brackets) into eight 16-bit groups, or null.
function expandIpv6(host) {
  if (!host.includes(':')) return null;
  let text = host;
  // Handle an embedded IPv4 tail (e.g. ::ffff:127.0.0.1).
  const lastColon = text.lastIndexOf(':');
  const tail = text.slice(lastColon + 1);
  if (tail.includes('.')) {
    const v4 = parseIpv4(tail);
    if (!v4) return null;
    const hi = ((v4[0] << 8) | v4[1]).toString(16);
    const lo = ((v4[2] << 8) | v4[3]).toString(16);
    text = text.slice(0, lastColon + 1) + hi + ':' + lo;
  }
  const halves = text.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  let groups;
  if (halves.length === 2) {
    const back = halves[1] ? halves[1].split(':') : [];
    const missing = 8 - head.length - back.length;
    if (missing < 0) return null;
    groups = [...head, ...Array(missing).fill('0'), ...back];
  } else {
    groups = head;
  }
  if (groups.length !== 8) return null;
  const nums = groups.map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN));
  return nums.some((n) => Number.isNaN(n)) ? null : nums;
}

function isBlockedIpv6(g) {
  if (g.slice(0, 7).every((n) => n === 0) && g[7] === 1) return true; // ::1 loopback
  if (g.every((n) => n === 0)) return true; // :: unspecified
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
  if ((g[0] & 0xffc0) === 0xfec0) return true; // fec0::/10 site-local (deprecated)
  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible (::a.b.c.d) embed an IPv4 address.
  const mapped = g.slice(0, 5).every((n) => n === 0) && g[5] === 0xffff;
  const compat = g.slice(0, 6).every((n) => n === 0) && (g[6] !== 0 || g[7] !== 0);
  if (mapped || compat) {
    return isBlockedIpv4([(g[6] >> 8) & 0xff, g[6] & 0xff, (g[7] >> 8) & 0xff, g[7] & 0xff]);
  }
  return false;
}

function validateUrl(urlString) {
  let parsed;
  try { parsed = new URL(urlString); } catch { return false; }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  let hostname = parsed.hostname.toLowerCase().replace(/\.+$/, '');
  if (!hostname) return false;
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) return false;
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    const v6 = expandIpv6(hostname.slice(1, -1));
    return v6 ? !isBlockedIpv6(v6) : false;
  }
  const v4 = parseIpv4(hostname);
  if (v4) return !isBlockedIpv4(v4);
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

  const clientIp = TRUST_PROXY && req.headers['x-forwarded-for']
    ? req.headers['x-forwarded-for'].split(',')[0].trim()
    : req.socket.remoteAddress;
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
