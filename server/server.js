// Express static server for Vite build in ./out (ESM)
import express from 'express';
import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Env configuration
const PRIMARY_DOMAIN = process.env.PRIMARY_DOMAIN || '';
const ENABLE_WWW_REDIRECT = (process.env.ENABLE_WWW_REDIRECT || 'true').toLowerCase() === 'true';
const FORCE_HTTPS = (process.env.FORCE_HTTPS || 'true').toLowerCase() === 'true';
const DEPLOY_TOKEN = process.env.DEPLOY_TOKEN || process.env.WEBHOOK_TOKEN || '';
const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://localhost:8090';

// Ports
const HTTP_PORT = 80;
const HTTPS_PORT = Number(process.env.PORT) || 443;

// SSL options
const keyPath = process.env.TLS_KEY;
const certPath = process.env.TLS_CERT;
const caPath = process.env.TLS_CA;

if (!keyPath || !certPath) {
  console.error('TLS_KEY and TLS_CERT must be set for production');
  process.exit(1);
}

// Simple colored request logger
app.use((req, res, next) => {
  const start = Date.now();
  const ip = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '').toString();

  res.on('finish', () => {
    const dur = Date.now() - start;
    const status = res.statusCode;
    const cRed = '\x1b[31m';
    const cYellow = '\x1b[33m';
    const cGreen = '\x1b[32m';
    const cCyan = '\x1b[36m';
    const cBlue = '\x1b[34m';
    const cMagenta = '\x1b[35m';
    const reset = '\x1b[0m';
    const statusColor = status >= 500 ? cRed : status >= 400 ? cYellow : cGreen;
    const now = new Date();
    const dateStr = now.toISOString();

    const parts = [
      `${cBlue}${dateStr}${reset}`,
      `${cCyan}${ip}${reset}`,
      `${cMagenta}${req.method}${reset}`,
      `${cMagenta}${req.originalUrl}${reset}`,
      `${statusColor}${status}${reset}`,
      `${cGreen}${dur}ms${reset}`,
    ];

    console.log(parts.join(' '));
  });

  next();
});

// Trust proxy so that req.secure works correctly behind proxies
app.enable('trust proxy');

// Parse JSON for webhook (must be before routes)
app.use(express.json({ limit: '256kb' }));

// CORS headers for PocketBase API
app.use('/api/', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Token');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Proxy middleware for PocketBase API - ВАЖНО: перед всеми редиректами!
app.use('/api/', createProxyMiddleware({
  target: POCKETBASE_URL,
  changeOrigin: true,
  secure: false, // Разрешить HTTP целевой сервер
  logLevel: 'debug',
  on: {
    proxyReq: (proxyReq, req, res) => {
      console.log(`Proxying to PocketBase: ${req.method} ${req.originalUrl} -> ${POCKETBASE_URL}${req.url}`);
      // Убедимся, что заголовки правильно передаются
      proxyReq.setHeader('X-Forwarded-Proto', 'https');
      proxyReq.setHeader('X-Forwarded-Host', req.headers.host);
    },
    error: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.status(502).json({ error: 'Cannot connect to PocketBase backend' });
    }
  }
}));

// Proxy for PocketBase WebSocket
app.use('/pb_ws', createProxyMiddleware({
  target: POCKETBASE_URL,
  changeOrigin: true,
  ws: true,
  secure: false,
  logLevel: 'debug'
}));

// GitHub webhook
app.post('/deploy', async (req, res) => {
  const token = (req.query.token || '').toString();

  if (!DEPLOY_TOKEN) {
    return res.status(500).json({ ok: false, error: 'DEPLOY_TOKEN is not configured on server' });
  }

  if (!token || token !== DEPLOY_TOKEN) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const event = req.headers['x-github-event'];
  const delivery = req.headers['x-github-delivery'];
  const ip = (req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || '').toString();
  console.log(`deploy: request received ip=${ip} event=${event} delivery=${delivery}`);

  try {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const pexecFile = promisify(execFile);

    console.log('deploy: git fetch');
    await pexecFile('git', ['fetch', '--all'], { cwd: __dirname, env: process.env });
    console.log('deploy: git reset --hard origin/main');
    await pexecFile('git', ['reset', '--hard', 'origin/main'], { cwd: __dirname, env: process.env });

    console.log('deploy: start');
    const scriptPath = path.join(__dirname, 'deploy.sh');
    const { stdout, stderr } = await pexecFile('bash', [scriptPath], { cwd: __dirname, env: process.env, timeout: 15 * 60 * 1000 });
    console.log('deploy: ok');
    return res.json({ ok: true, message: 'Rebuilt successfully', event, delivery });
  } catch (err) {
    console.error('deploy: failed');
    return res.status(500).json({ ok: false, error: 'Deploy failed' });
  }
});

// Redirect www -> non-www (skip API routes)
if (ENABLE_WWW_REDIRECT && PRIMARY_DOMAIN) {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/pb_ws') || req.path === '/deploy') return next();
    const host = req.headers.host || '';

    if (host.startsWith('www.')) {
      const redirectTo = `https://${PRIMARY_DOMAIN}${req.originalUrl}`;
      return res.redirect(301, redirectTo);
    }

    next();
  });
}

// HTTP->HTTPS redirect (skip API routes)
if (FORCE_HTTPS) {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/pb_ws') || req.path === '/deploy') return next();

    if (!req.secure) {
      const host = req.headers.host ? req.headers.host.split(':')[0] : PRIMARY_DOMAIN || '';
      const url = `https://${host}${req.originalUrl}`;
      return res.redirect(301, url);
    }

    next();
  });
}

const outDir = path.resolve(__dirname, 'out');

// Serve static assets
app.use('/assets', express.static(path.join(outDir, 'assets'), {
  immutable: true,
  maxAge: '1y',
}));

app.use(express.static(outDir, {
  maxAge: '1h',
  extensions: ['html']
}));

// SPA fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/pb_ws') || req.path === '/deploy') {
    return next();
  }
  
  if (path.extname(req.path)) return next();

  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(outDir, 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  if (err.code === 'ECONNREFUSED') {
    console.error('Cannot connect to PocketBase at', POCKETBASE_URL);
    return res.status(503).json({ error: 'Backend service unavailable' });
  }
  next(err);
});

// Create HTTPS server
const sslOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
  ...(caPath ? { ca: fs.readFileSync(caPath) } : {}),
};

const httpsServer = https.createServer(sslOptions, app);
httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
  console.log(`HTTPS server running at https://0.0.0.0:${HTTPS_PORT}`);
  console.log(`PocketBase proxy: /api/* -> ${POCKETBASE_URL}`);
});

// HTTP redirect server
const httpApp = express();
httpApp.enable('trust proxy');
httpApp.use((req, res) => {
  const host = req.headers.host ? req.headers.host.split(':')[0] : PRIMARY_DOMAIN || '';
  const url = `https://${host}${req.originalUrl}`;
  res.redirect(301, url);
});

http.createServer(httpApp).listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`HTTP redirect server running at http://0.0.0.0:${HTTP_PORT}`);
});

// WebSocket upgrade handling
httpsServer.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/pb_ws')) {
    console.log('WebSocket upgrade for PocketBase');
  }
});
