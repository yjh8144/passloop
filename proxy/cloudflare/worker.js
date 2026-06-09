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

function parseAllowedTargetHosts(value) {
  if (!value) return null;
  const hosts = String(value)
    .split(',')
    .map((item) => item.trim().toLowerCase().replace(/\.+$/, ''))
    .filter(Boolean);
  return hosts.length ? new Set(hosts) : null;
}

function hostMatchesAllowlist(hostname, allowlist) {
  if (!allowlist) return true;
  if (allowlist.has(hostname)) return true;
  for (const allowed of allowlist) {
    if (allowed.startsWith('*.') && hostname.endsWith(allowed.slice(1))) return true;
  }
  return false;
}

function validateUrl(urlString, env) {
  let parsed;
  try { parsed = new URL(urlString); } catch { return false; }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  let hostname = parsed.hostname.toLowerCase().replace(/\.+$/, '');
  if (!hostname) return false;
  if (!hostMatchesAllowlist(hostname, parseAllowedTargetHosts(env?.ALLOWED_TARGET_HOSTS))) {
    return false;
  }
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
  // Cloudflare Workers cannot resolve DNS in user code. Configure
  // ALLOWED_TARGET_HOSTS in production to close DNS-rebinding/SSRF gaps for names.
  return true;
}

export default {
  async fetch(request, env, ctx) {
    // 处理 OPTIONS 预检请求（不验证密钥）
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Proxy-Key, x-api-key, anthropic-version, x-goog-api-key',
        },
      });
    }

    // 验证密钥
    const authKey = request.headers.get('X-Proxy-Key');
    if (authKey !== env.AUTH_SECRET) {
      return new Response('Unauthorized', {
        status: 401,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response('Missing ?url= parameter', {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (!validateUrl(targetUrl, env)) {
      return new Response('Forbidden: target URL not allowed', {
        status: 403,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    try {
      const forwardHeaders = new Headers();
      forwardHeaders.set('Content-Type', request.headers.get('Content-Type') || 'application/json');
      const auth = request.headers.get('Authorization');
      if (auth) forwardHeaders.set('Authorization', auth);
      const apiKey = request.headers.get('x-api-key');
      if (apiKey) forwardHeaders.set('x-api-key', apiKey);
      const anthropicVersion = request.headers.get('anthropic-version');
      if (anthropicVersion) forwardHeaders.set('anthropic-version', anthropicVersion);
      const googApiKey = request.headers.get('x-goog-api-key');
      if (googApiKey) forwardHeaders.set('x-goog-api-key', googApiKey);

      const response = await fetch(targetUrl, {
        method: request.method,
        headers: forwardHeaders,
        body: request.body,
      });

      const modifiedHeaders = new Headers(response.headers);
      modifiedHeaders.set('Access-Control-Allow-Origin', '*');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: modifiedHeaders,
      });

    } catch (err) {
      console.error('Proxy error:', err);
      return new Response('Proxy Error: request failed', {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }
  }
};
