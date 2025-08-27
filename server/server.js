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
const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090'; // Используем 127.0.0.1 вместо localhost

// Ports
const HTTP_PORT = parseInt(process.env.HTTP_PORT || '80');
const HTTPS_PORT = parseInt(process.env.PORT || '443');

// SSL options - проверяем наличие сертификатов
const keyPath = process.env.TLS_KEY;
const certPath = process.env.TLS_CERT;
const caPath = process.env.TLS_CA;

const useSSL = keyPath && certPath && fs.existsSync(keyPath) && fs.existsSync(certPath);

if (!useSSL && FORCE_HTTPS) {
  console.warn('WARNING: SSL certificates not found. Running in HTTP mode.');
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

// CORS headers for PocketBase API - более полная настройка
app.use('/api/', (req, res, next) => {
  const origin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Token, X-Client-Id');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
});

// Proxy middleware for PocketBase API с улучшенной обработкой
const apiProxy = createProxyMiddleware({
  target: POCKETBASE_URL,
  changeOrigin: true,
  secure: false,
  logLevel: 'warn', // Меняем на warn для меньшего спама в логах
  timeout: 30000, // 30 секунд таймаут
  proxyTimeout: 30000,
  on: {
    proxyReq: (proxyReq, req, res) => {
      // Логируем только в debug режиме
      if (process.env.DEBUG === 'true') {
        console.log(`[API Proxy] ${req.method} ${req.originalUrl} -> ${POCKETBASE_URL}${req.url}`);
      }

      // Убеждаемся, что заголовки правильно передаются
      if (req.headers.host) {
        proxyReq.setHeader('X-Forwarded-Host', req.headers.host);
      }
      proxyReq.setHeader('X-Forwarded-Proto', req.secure ? 'https' : 'http');
      proxyReq.setHeader('X-Real-IP', req.ip || req.socket.remoteAddress || '');

      // Убираем заголовок connection для избежания проблем
      proxyReq.removeHeader('connection');
    },
    proxyRes: (proxyRes, req, res) => {
      // Добавляем CORS заголовки к ответу от PocketBase
      const origin = req.headers.origin || '*';
      proxyRes.headers['access-control-allow-origin'] = origin;
      proxyRes.headers['access-control-allow-credentials'] = 'true';
    },
    error: (err, req, res) => {
      console.error('[API Proxy Error]:', err.message);
      console.error('Target URL was:', POCKETBASE_URL);

      // Более информативные сообщения об ошибках
      if (err.code === 'ECONNREFUSED') {
        res.status(503).json({
          error: 'PocketBase service is unavailable',
          details: 'Cannot connect to PocketBase. Please ensure it is running.',
          target: POCKETBASE_URL
        });
      } else if (err.code === 'ETIMEDOUT') {
        res.status(504).json({
          error: 'Request timeout',
          details: 'PocketBase did not respond in time'
        });
      } else {
        res.status(502).json({
          error: 'Proxy error',
          details: err.message
        });
      }
    }
  }
});

// Apply API proxy
app.use('/api/', apiProxy);

// Proxy for PocketBase WebSocket с улучшенной конфигурацией
const wsProxy = createProxyMiddleware({
  target: POCKETBASE_URL,
  changeOrigin: true,
  ws: true,
  secure: false,
  logLevel: 'warn',
  on: {
    proxyReqWs: (proxyReq, req, socket, options, head) => {
      if (process.env.DEBUG === 'true') {
        console.log('[WS Proxy] WebSocket connection to PocketBase');
      }
      proxyReq.setHeader('X-Real-IP', req.socket.remoteAddress || '');
    },
    error: (err, req, socket) => {
      console.error('[WS Proxy Error]:', err.message);
      socket.end();
    }
  }
});

app.use('/pb_ws', wsProxy);

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

    // Проверяем существование deploy.sh
    if (fs.existsSync(scriptPath)) {
      const { stdout, stderr } = await pexecFile('bash', [scriptPath], { cwd: __dirname, env: process.env, timeout: 15 * 60 * 1000 });
      console.log('deploy: ok');
      return res.json({ ok: true, message: 'Rebuilt successfully', event, delivery });
    } else {
      console.warn('deploy.sh not found, skipping deployment script');
      return res.json({ ok: true, message: 'Code updated, deployment script not found', event, delivery });
    }
  } catch (err) {
    console.error('deploy: failed', err);
    return res.status(500).json({ ok: false, error: 'Deploy failed', details: err.message });
  }
});

// Redirect www -> non-www (skip API routes)
if (ENABLE_WWW_REDIRECT && PRIMARY_DOMAIN) {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/pb_ws') || req.path === '/deploy') return next();
    const host = req.headers.host || '';

    if (host.startsWith('www.')) {
      const protocol = req.secure ? 'https' : 'http';
      const redirectTo = `${protocol}://${PRIMARY_DOMAIN}${req.originalUrl}`;
      return res.redirect(301, redirectTo);
    }

    next();
  });
}

// HTTP->HTTPS redirect (skip API routes) - только если SSL включен
if (FORCE_HTTPS && useSSL) {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/pb_ws') || req.path === '/deploy') return next();

    if (!req.secure) {
      const host = req.headers.host ? req.headers.host.split(':')[0] : PRIMARY_DOMAIN || 'localhost';
      const url = `https://${host}${req.originalUrl}`;
      return res.redirect(301, url);
    }

    next();
  });
}

const outDir = path.resolve(__dirname, 'out');

// Проверяем существование директории out
if (!fs.existsSync(outDir)) {
  console.warn(`Directory ${outDir} does not exist. Creating it...`);
  fs.mkdirSync(outDir, { recursive: true });
}

// Serve static assets
app.use('/assets', express.static(path.join(outDir, 'assets'), {
  immutable: true,
  maxAge: '1y',
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
  }
}));

app.use(express.static(outDir, {
  maxAge: '1h',
  extensions: ['html'],
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// SPA fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/pb_ws') || req.path === '/deploy') {
    return next();
  }

  if (path.extname(req.path)) return next();

  const indexPath = path.join(outDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(indexPath);
  } else {
    res.status(404).send('index.html not found. Please build the project first.');
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    pocketbase: POCKETBASE_URL,
    ssl: useSSL
  });
});

// Start servers
if (useSSL) {
  // Create HTTPS server
  const sslOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
    ...(caPath && fs.existsSync(caPath) ? { ca: fs.readFileSync(caPath) } : {}),
  };

  const httpsServer = https.createServer(sslOptions, app);

  // Правильная обработка WebSocket upgrade
  httpsServer.on('upgrade', (req, socket, head) => {
    if (req.url.startsWith('/pb_ws')) {
      wsProxy.upgrade(req, socket, head);
    }
  });

  httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`✅ HTTPS server running at https://0.0.0.0:${HTTPS_PORT}`);
    console.log(`✅ PocketBase proxy: /api/* -> ${POCKETBASE_URL}`);
    console.log(`✅ WebSocket proxy: /pb_ws -> ${POCKETBASE_URL}`);
  });

  // HTTP redirect server
  if (FORCE_HTTPS) {
    const httpApp = express();
    httpApp.enable('trust proxy');
    httpApp.use((req, res) => {
      const host = req.headers.host ? req.headers.host.split(':')[0] : PRIMARY_DOMAIN || 'localhost';
      const url = `https://${host}${req.originalUrl}`;
      res.redirect(301, url);
    });

    http.createServer(httpApp).listen(HTTP_PORT, '0.0.0.0', () => {
      console.log(`✅ HTTP redirect server running at http://0.0.0.0:${HTTP_PORT}`);
    });
  }
} else {
  // Запускаем только HTTP сервер
  const httpServer = http.createServer(app);

  // Правильная обработка WebSocket upgrade для HTTP
  httpServer.on('upgrade', (req, socket, head) => {
    if (req.url.startsWith('/pb_ws')) {
      wsProxy.upgrade(req, socket, head);
    }
  });

  httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`✅ HTTP server running at http://0.0.0.0:${HTTP_PORT}`);
    console.log(`✅ PocketBase proxy: /api/* -> ${POCKETBASE_URL}`);
    console.log(`✅ WebSocket proxy: /pb_ws -> ${POCKETBASE_URL}`);
    console.log(`⚠️  SSL is not configured. Running in HTTP mode.`);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  process.exit(0);
});
