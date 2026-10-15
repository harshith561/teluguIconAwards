/**
 * load-test.js
 * ------------
 * Measures what the API actually sustains, so capacity claims are based on
 * numbers rather than guesses.
 *
 * Usage:
 *   node scripts/load-test.js read  --concurrency=200 --duration=20
 *   node scripts/load-test.js vote  --concurrency=50  --duration=20
 *
 * Reports throughput plus p50/p95/p99 latency and the error breakdown.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const MODE = process.argv[2] || 'read';
const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split('=')[1]) : fallback;
};

const BASE = process.env.LOAD_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3001}`;
const CONCURRENCY = arg('concurrency', 200);
const DURATION = arg('duration', 20) * 1000;
const SEND_FORWARDED_FOR = process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1';

const cfg = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'telugu_icon_awards',
};

let voters = [];
let nominees = [];
let voterCursor = 0;

async function prepareVoteData() {
  const db = await mysql.createConnection(cfg);
  const crypto = require('crypto');

  const [cats] = await db.query(
    "SELECT c.id FROM categories c WHERE c.type = 'self_nomination' AND c.voting_open = 1 LIMIT 40"
  );
  const catIds = cats.map((c) => c.id);
  if (catIds.length === 0) throw new Error('No open self-nomination categories found');

  const [existing] = await db.query('SELECT id, category_id FROM nominees WHERE status = ? LIMIT 5000', ['approved']);
  nominees = existing;
  const [nomCatRows] = await db.query(
    `SELECT n.id, n.category_id FROM nominees n
      WHERE n.status = 'approved' AND n.category_id IN (${catIds.map(() => '?').join(',')}) LIMIT 5000`,
    catIds
  );
  const votable = nomCatRows.length > 0 ? nomCatRows : nominees;
  if (!votable.length) throw new Error('No approved nominees in an open category');

  // One unique (phone, email, fingerprint) per request, because the votes table
  // enforces one of each per category. Sized from throughput headroom, and
  // inserted in batches so preparation is not the slow part.
  const COUNT = Math.min(300000, Math.max(CONCURRENCY * 20, (DURATION / 1000) * 4000));
  voters = [];
  const BATCH = 500;
  for (let start = 0; start < COUNT; start += BATCH) {
    const rows = [];
    for (let i = start; i < Math.min(start + BATCH, COUNT); i++) {
      const phone = String(7000000000 + i);
      const email = `load${i}@test.local`;
      const fingerprint = `load-fp-${i}`;
      const token = `loadtoken${i}${'x'.repeat(52)}`.slice(0, 64);
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const n = votable[i % votable.length];
      // Distinct public IP per voter, as a real load balancer would forward.
      voters.push({ token, phone, email, fingerprint, nomineeId: n.id, ip: `203.0.${Math.floor(i / 256) % 256}.${i % 256}` });
      rows.push([`91${phone}`, tokenHash]);
    }
    await db.query(
      `INSERT INTO otp_sessions (mobile, token_hash, purpose, expires_at)
       VALUES ${rows.map(() => '(?, ?, \'vote\', DATE_ADD(NOW(), INTERVAL 90 MINUTE))').join(',')}
       ON DUPLICATE KEY UPDATE used_at = NULL, expires_at = DATE_ADD(NOW(), INTERVAL 90 MINUTE)`,
      rows.flat()
    );
  }

  await db.end();
  console.log(`Prepared ${voters.length} single-use voters, ${votable.length} approved nominees\n`);
}

async function cleanupVoteData() {
  const db = await mysql.createConnection(cfg);
  await db.query("DELETE FROM votes WHERE voter_email LIKE 'load%@test.local'");
  await db.query(
    "DELETE FROM otp_sessions WHERE purpose = 'vote' AND mobile LIKE '917%' AND created_at > DATE_SUB(NOW(), INTERVAL 2 HOUR)"
  );
  await db.end();
}

const stats = { ok: 0, err: 0, byStatus: {}, byError: {}, latencies: [] };

function recordLatency(ms) {
  stats.latencies.push(ms);
}

function recordFailure(label) {
  stats.err += 1;
  stats.byError[label] = (stats.byError[label] || 0) + 1;
}

async function hitRead() {
  const endpoints = [
    '/api/categories',
    '/api/nominees',
    '/api/nominees/featured',
    '/api/settings',
    '/api/sponsors',
    '/api/tickets/availability',
    '/api/gallery',
    '/api/past-events',
  ];
  const path = endpoints[Math.floor(Math.random() * endpoints.length)];
  const t0 = process.hrtime.bigint();
  try {
    const res = await fetch(BASE + path);
    await res.text();
    recordLatency(Number(process.hrtime.bigint() - t0) / 1e6);
    if (res.status >= 200 && res.status < 300) stats.ok += 1;
    else { recordFailure(`HTTP ${res.status} ${path}`); }
    stats.byStatus[res.status] = (stats.byStatus[res.status] || 0) + 1;
  } catch (e) {
    recordLatency(Number(process.hrtime.bigint() - t0) / 1e6);
    recordFailure(e.code || e.message || 'fetch error');
  }
}

async function hitVote() {
  // Each voter is single-use, so advance a cursor rather than picking at random
  // (replaying identities would only measure the 400 duplicate path).
  const v = voters.length ? voters[voterCursor++ % voters.length] : null;
  if (!v) return;
  const body = JSON.stringify({
    nominee_id: v.nomineeId,
    voter_name: 'Load Tester',
    voter_email: v.email,
    voter_phone: v.phone,
    verification_token: v.token,
    device_fingerprint: v.fingerprint,
  });
  const headers = { 'Content-Type': 'application/json' };
  // Stand in for the reverse proxy/load balancer that supplies X-Forwarded-For
  // in production. Without it every simulated visitor shares one IP and trips
  // the per-IP duplicate guard after the first vote in each category.
  if (SEND_FORWARDED_FOR) headers['X-Forwarded-For'] = v.ip;
  const t0 = process.hrtime.bigint();
  try {
    const res = await fetch(`${BASE}/api/votes`, { method: 'POST', headers, body });
    const text = await res.text();
    recordLatency(Number(process.hrtime.bigint() - t0) / 1e6);
    if (res.status >= 200 && res.status < 300) stats.ok += 1;
    else {
      let msg = '';
      try { msg = (JSON.parse(text) || {}).message || ''; } catch { msg = text.slice(0, 80); }
      recordFailure(`HTTP ${res.status} ${String(msg).slice(0, 70)}`);
    }
    stats.byStatus[res.status] = (stats.byStatus[res.status] || 0) + 1;
  } catch (e) {
    recordLatency(Number(process.hrtime.bigint() - t0) / 1e6);
    recordFailure(e.code || e.message || 'fetch error');
  }
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

async function main() {
  if (MODE === 'vote') {
    await prepareVoteData();
    if (!nominees.length) {
      console.log('No approved nominees to vote for. Run scripts/seed-initial-admin-data.js first.');
      process.exit(1);
    }
  }

  console.log(`Mode      : ${MODE}`);
  console.log(`Target    : ${BASE}`);
  console.log(`Concurrent: ${CONCURRENCY}`);
  console.log(`Duration  : ${DURATION / 1000}s`);
  console.log(`XFF spoof : ${SEND_FORWARDED_FOR ? 'yes (TRUST_PROXY on)' : 'no'}\n`);

  const hit = MODE === 'vote' ? hitVote : hitRead;
  const deadline = Date.now() + DURATION;
  let inflight = 0;

  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (Date.now() < deadline) {
        inflight += 1;
        await hit();
        inflight -= 1;
      }
    })
  );

  const total = stats.ok + stats.err;
  const elapsed = DURATION / 1000;
  const sorted = stats.latencies.slice().sort((a, b) => a - b);

  console.log('================ RESULTS ================');
  console.log(`Requests      : ${total}`);
  console.log(`Throughput    : ${Math.round(total / elapsed)} req/s`);
  console.log(`Success       : ${stats.ok} (${((stats.ok / total) * 100).toFixed(2)}%)`);
  console.log(`Errors        : ${stats.err} (${((stats.err / total) * 100).toFixed(2)}%)`);
  console.log(`p50 latency   : ${percentile(sorted, 50).toFixed(1)} ms`);
  console.log(`p95 latency   : ${percentile(sorted, 95).toFixed(1)} ms`);
  console.log(`p99 latency   : ${percentile(sorted, 99).toFixed(1)} ms`);
  console.log(`max latency   : ${sorted[sorted.length - 1].toFixed(1)} ms`);
  console.log('\nStatus codes  :', JSON.stringify(stats.byStatus));
  console.log('Error breakdown:');
  const entries = Object.entries(stats.byError).sort((a, b) => b[1] - a[1]).slice(0, 12);
  if (entries.length === 0) console.log('  (none)');
  entries.forEach(([k, v]) => console.log(`  ${v.toString().padStart(7)}  ${k}`));
  console.log('========================================');

  if (MODE === 'vote') await cleanupVoteData();
  process.exit(stats.err / total > 0.05 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });