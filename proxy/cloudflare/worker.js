export default {
  async fetch(request, env, ctx) {
    // 处理 OPTIONS 预检请求（不验证密钥）
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Proxy-Key, x-api-key, anthropic-version',
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

    try {
      const forwardHeaders = new Headers();
      forwardHeaders.set('Content-Type', request.headers.get('Content-Type') || 'application/json');
      const auth = request.headers.get('Authorization');
      if (auth) forwardHeaders.set('Authorization', auth);
      const apiKey = request.headers.get('x-api-key');
      if (apiKey) forwardHeaders.set('x-api-key', apiKey);
      const anthropicVersion = request.headers.get('anthropic-version');
      if (anthropicVersion) forwardHeaders.set('anthropic-version', anthropicVersion);

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
      return new Response(`Proxy Error: ${err.message}`, {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }
  }
};
