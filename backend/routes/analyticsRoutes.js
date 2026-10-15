const router = require('express').Router();
const { pool } = require('../config/database');
const { hashFingerprint, clientIp } = require('../utils/nomineeIdentity');

// Campaign funnel for a single nominee page:
//   page_view -> vote_click -> (votes table) conversion
//   share_click / qr_scan are side branches off page_view.
const ALLOWED_EVENTS = Object.assign(Object.create(null), {
  page_view: 1800,
  vote_click: 300,
  share_click: 300,
  qr_scan: 1800,
  qr_download: 60,
  poster_download: 60,
  kit_view: 60,
});

// In-memory throttle so a stuck client cannot flood the table.
const recent = new Map(); // key -> timestamp
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 30;

function throttled(key) {
  const now = Date.now();
  const entry = recent.get(key);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    recent.set(key, { count: 1, start: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of recent) {
    if (now - entry.start > RATE_WINDOW_MS) recent.delete(key);
  }
}, 10 * 60 * 1000).unref();

// POST /api/analytics/track
// Body: { nominee_id, event_type, source?, referrer? }
// Deliberately stores no voter identity - only a one-way hash used to
// de-duplicate repeats of the same action.
router.post('/track', async (req, res) => {
  try {
    const nomineeId = parseInt(req.body && req.body.nominee_id, 10);
    const eventType = String((req.body && req.body.event_type) || '').trim();

    if (!nomineeId || !ALLOWED_EVENTS[eventType]) {
      return res.status(400).json({ message: 'Invalid tracking payload' });
    }

    const ip = clientIp(req);
    const ua = (req.headers['user-agent'] || '').slice(0, 300) || null;
    const fingerprint = hashFingerprint(ip, ua);
    const source = req.body.source ? String(req.body.source).slice(0, 60) : null;
    const referrer = req.body.referrer ? String(req.body.referrer).slice(0, 300) : null;

    if (throttled(`${fingerprint}:${eventType}`)) {
      return res.json({ ok: true, counted: false });
    }

    // Only track approved, publicly-visible nominees.
    const [nominees] = await pool.query(
      `SELECT n.id FROM nominees n
         LEFT JOIN nominations nom ON n.nomination_id = nom.id
        WHERE n.id = ? AND n.status = 'approved'
          AND (n.nomination_id IS NULL OR nom.status = 'shortlisted')
        LIMIT 1`,
      [nomineeId]
    );
    if (nominees.length === 0) {
      return res.status(404).json({ message: 'Nominee not found' });
    }

    // De-duplicate: one person refreshing a page should not inflate the count.
    const windowSeconds = ALLOWED_EVENTS[eventType];
    const [existing] = await pool.query(
      `SELECT id FROM nominee_campaign_events
        WHERE nominee_id = ? AND event_type = ? AND fingerprint = ?
          AND created_at > DATE_SUB(NOW(), INTERVAL ? SECOND)
        LIMIT 1`,
      [nomineeId, eventType, fingerprint, String(windowSeconds)]
    );
    if (existing.length > 0) {
      return res.json({ ok: true, counted: false });
    }

    await pool.query(
      `INSERT INTO nominee_campaign_events (nominee_id, event_type, source, referrer, fingerprint, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nomineeId, eventType, source, referrer, fingerprint, ip, ua]
    );
    res.json({ ok: true, counted: true });
  } catch (error) {
    // Analytics must never break the page for a visitor.
    if (error && error.code === 'ER_NO_SUCH_TABLE') {
      return res.json({ ok: true, counted: false, skipped: 'table_missing' });
    }
    console.error('Analytics track error:', error.message);
    res.status(500).json({ message: 'Failed to record event' });
  }
});

module.exports = router;
