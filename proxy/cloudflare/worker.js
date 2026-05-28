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

    if (!validateUrl(targetUrl)) {
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
