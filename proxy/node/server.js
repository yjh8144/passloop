import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;
const AUTH_SECRET = process.env.AUTH_SECRET;

if (!AUTH_SECRET) {
  console.error('ERROR: AUTH_SECRET environment variable is required');
  process.exit(1);
}

app.options('*', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Proxy-Key, x-api-key, anthropic-version',
  });
  res.status(204).end();
});

app.all('*', async (req, res) => {
  if (req.headers['x-proxy-key'] !== AUTH_SECRET) {
    res.set('Access-Control-Allow-Origin', '*');
    return res.status(401).send('Unauthorized');
  }

  const targetUrl = req.query.url;
  if (!targetUrl) {
    res.set('Access-Control-Allow-Origin', '*');
    return res.status(400).send('Missing ?url= parameter');
  }

  try {
    const headers = { 'Content-Type': req.headers['content-type'] || 'application/json' };
    if (req.headers['authorization']) headers['Authorization'] = req.headers['authorization'];
    if (req.headers['x-api-key']) headers['x-api-key'] = req.headers['x-api-key'];
    if (req.headers['anthropic-version']) headers['anthropic-version'] = req.headers['anthropic-version'];

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
    }));
  } catch (err) {
    res.set('Access-Control-Allow-Origin', '*');
    res.status(500).send(`Proxy Error: ${err.message}`);
  }
});

app.listen(PORT, () => console.log(`CORS proxy running on port ${PORT}`));
