require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cluster = require('cluster');
const os = require('os');
const zlib = require('zlib');
const mysql = require('mysql2/promise');

const { testConnection, pool, poolConfig } = require('./config/database');
const voteCounter = require('./utils/voteCounter');

// Flush queued vote counters once a second per nominee instead of writing that
// row on every vote - see utils/voteCounter.js for the measured reason.
voteCounter.startAutoFlush(pool);

const app = express();
app.disable('x-powered-by');

// Behind nginx / Cloudflare / Railway / a load balancer, req.ip is the PROXY's
// socket address unless Express is told to trust the forwarded header. That is
// not cosmetic: the per-IP vote rate limit and the (ip_address, user_agent)
// duplicate guard both key off req.ip, so with it unset every visitor on the
// site looks like one shared IP. The first person to vote in a category would
// then lock out the entire audience with "already voted in this category", and
// 20 requests would exhaust the hourly limit for everybody.
//
// TRUST_PROXY accepts:  true | 1 | number of proxy hops to trust.
// Leave it UNSET when the API is exposed directly to the internet, because
// trusting a client-supplied header when nothing rewrites it would let anyone
// forge their IP.
const TRUST_PROXY = process.env.TRUST_PROXY;
if (TRUST_PROXY === 'true' || TRUST_PROXY === '1') {
  app.set('trust proxy', true);
} else if (TRUST_PROXY && /^\d+$/.test(TRUST_PROXY)) {
  app.set('trust proxy', Number(TRUST_PROXY));
}

//app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// gzip JSON/text responses to cut bandwidth under heavy traffic.
app.use((req, res, next) => {
  if (!(req.headers['accept-encoding'] || '').toLowerCase().includes('gzip')) return next();
  const send = res.send.bind(res);
  res.send = (body) => {
    if (res.getHeader('Content-Encoding')) return send(body);
    const ct = String(res.getHeader('Content-Type') || '');
    if (ct && !/json|text|javascript|xml/.test(ct)) return send(body);
    const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body === undefined ? '' : String(body));
    res.setHeader('Content-Encoding', 'gzip');
    res.removeHeader('Content-Length');
    res.setHeader('Vary', 'Accept-Encoding');
    zlib.gzip(buffer, (err, compressed) => {
      if (err) {
        res.removeHeader('Content-Encoding');
        res.setHeader('Content-Length', buffer.length);
        return send(buffer);
      }
      send(compressed);
    });
  };
  next();
});

const fs = require('fs');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Nominee photos and sponsor logos are drawn into <canvas> on client to build posters.
// Express static requires explicit headers for cross-origin canvas loading.
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
}, express.static(uploadDir, {
  maxAge: '7d',
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  },
}));

// Fallback to database `images` table if upload file is not found on disk
app.use('/uploads', async (req, res, next) => {
  const filename = path.basename(req.path);
  if (!filename) return next();
  try {
    const { pool } = require('./config/database');
    const [rows] = await pool.query(
      'SELECT mime_type, file_size, image_data FROM images WHERE original_filename = ? LIMIT 1',
      [filename]
    );
    if (rows && rows.length > 0 && rows[0].image_data) {
      res.setHeader('Content-Type', rows[0].mime_type || 'image/jpeg');
      res.setHeader('Content-Length', rows[0].file_size || rows[0].image_data.length);
      res.setHeader('Cache-Control', 'public, max-age=604800');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      return res.end(rows[0].image_data);
    }
  } catch (_) {}

  // Production uploads fallback: if file exists on live server, stream and cache locally
  try {
    const prodUrl = `https://teluguiconawards.in/uploads/${encodeURIComponent(filename)}`;
    const prodRes = await fetch(prodUrl);
    if (prodRes.ok) {
      const buffer = Buffer.from(await prodRes.arrayBuffer());
      res.setHeader('Content-Type', prodRes.headers.get('content-type') || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=604800');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      fs.writeFile(path.join(uploadDir, filename), buffer, () => {});
      return res.end(buffer);
    }
  } catch (_) {}

  next();
});

// Safe image proxy endpoint for external sponsor logos that lack CORS headers
app.get('/api/proxy-image', async (req, res) => {
  try {
    const rawUrl = req.query.url;
    if (!rawUrl || typeof rawUrl !== 'string') {
      return res.status(400).send('Missing url parameter');
    }
    const parsed = new URL(rawUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).send('Invalid protocol');
    }

    // SSRF prevention: block local / private IP ranges
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.endsWith('.local')
    ) {
      return res.status(403).send('Forbidden target');
    }

    const upstreamRes = await fetch(rawUrl, {
      signal: AbortSignal.timeout(6000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TeluguIconAwards/1.0',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).send('Failed to fetch image');
    }

    const contentType = upstreamRes.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await upstreamRes.arrayBuffer());

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  } catch (err) {
    return res.status(502).send('Failed to fetch image');
  }
});

const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const nomineeRoutes = require('./routes/nomineeRoutes');
const nominationRoutes = require('./routes/nominationRoutes');
const voteRoutes = require('./routes/voteRoutes');
const otpRoutes = require('./routes/otpRoutes');
const sponsorRoutes = require('./routes/sponsorRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const contactRoutes = require('./routes/contactRoutes');
const adminRoutes = require('./routes/adminRoutes');
const smsTemplateRoutes = require('./routes/smsTemplateRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const pastEventRoutes = require('./routes/pastEventRoutes');
const awardeeRoutes = require('./routes/awardeeRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const sponsorLeadRoutes = require('./routes/sponsorLeadRoutes');
const imageRoutes = require('./routes/imageRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const nominationStatusRoutes = require('./routes/nominationStatusRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/nominees', nomineeRoutes);
app.use('/api/nominations', nominationRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/sponsors', sponsorRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/sms-templates', smsTemplateRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/past-events', pastEventRoutes);
app.use('/api/awardees', awardeeRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/sponsor-leads', sponsorLeadRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/nomination-status', nominationStatusRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Telugu Icon Awards API is running', db: process.env.DB_PORT, pid: process.pid });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001;

// Every table lives in backend/database/schema.sql and the file is idempotent
// (CREATE TABLE IF NOT EXISTS + guarded INSERTs), so the server can safely apply
// it on boot. That keeps a fresh XAMPP install working without a manual step.
const runMigrations = async () => {
  const fs = require('fs');
  const sql = fs.readFileSync(path.join(__dirname, 'database', 'schema.sql'), 'utf-8');
  const { database, ...serverLevelConfig } = poolConfig;
  const conn = await mysql.createConnection({
    ...serverLevelConfig,
    multipleStatements: true,
  });
  try {
    await conn.query(sql);
    console.log('✓ Schema applied (backend/database/schema.sql)');
  } finally {
    await conn.end();
  }
};

// The pool is created with a database already selected, so a missing database
// makes every query fail with ER_BAD_DB_ERROR. Create it first, at server level.
const ensureDatabaseExists = async () => {
  const { database, ...serverLevelConfig } = poolConfig;
  const conn = await mysql.createConnection(serverLevelConfig);
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await conn.end();
  }
};

const ensureDatabase = async () => {

  try {
    await ensureDatabaseExists();
  } catch (_) {
    // Shared hosting users do not have server-level CREATE DATABASE privileges.
  }
  const connected = await testConnection();
  return connected;
};

const startServer = () => {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ Telugu Icon Awards API running on http://0.0.0.0:${PORT} (pid ${process.pid})`);
  });
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
};

const USE_CLUSTER = process.env.CLUSTER === '1' || process.env.CLUSTER === 'true';
const WORKERS = Math.max(1, Number(process.env.WORKERS) || 1);

const main = async () => {
  if (USE_CLUSTER && cluster.isMaster) {
    console.log(`[cluster] master ${process.pid} spawning ${WORKERS} worker(s)...`);
    for (let i = 0; i < WORKERS; i++) cluster.fork();
    cluster.on('exit', (worker, code, signal) => {
      console.log(`[cluster] worker ${worker.process.pid} died (${signal || code}). Restarting...`);
      cluster.fork();
    });
  } else {
    // Start HTTP server immediately so Railway health checks pass instantly
    startServer();

    // Railway keep-alive: Ping public healthcheck every 4 minutes to prevent idle sleep
    const keepAliveUrl = process.env.PUBLIC_URL || 'https://awards-production-13eb.up.railway.app';
    if (typeof fetch === 'function' && keepAliveUrl) {
      setInterval(() => {
        fetch(`${keepAliveUrl}/api/health`)
          .then((r) => r.json())
          .then(() => console.log('[keepalive] Ping sent to keep Railway awake'))
          .catch(() => { });
      }, 4 * 60 * 1000).unref();
    }

    // Verify database connection asynchronously in background
    ensureDatabase().catch((err) => {
      console.error('Database connection check error:', err.message);
    });
  }
};

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err.message);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', (err && err.message) || err);
});

const shutdown = async (code) => {
  console.log('Shutting down gracefully...');
  // Persist any vote counters still queued in memory before closing the pool.
  try {
    const { flushed, nominees } = await voteCounter.flush(pool);
    if (flushed > 0) console.log(`✓ Flushed ${flushed} vote(s) across ${nominees} nominee(s)`);
  } catch (e) { console.error('Counter flush on shutdown failed:', e.message); }
  try { await pool.end(); } catch (e) { }
  process.exit(code);
};
process.on('SIGTERM', () => shutdown(0));
process.on('SIGINT', () => shutdown(0));

if (require.main === module) {
  main();
}

module.exports = app;