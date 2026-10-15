const router = require('express').Router();
const crypto = require('crypto');
const { pool } = require('../config/database');
const otpService = require('../services/otpService');

// Add-on req. 19: "Nominees should receive their URL, QR and campaign kit as
// soon as their nomination is approved."
//
// There is no email/SMS provider wired up, so the delivery channel is this
// page: the nominee proves they own the mobile number with an OTP (reusing the
// same OTP infrastructure as voting) and immediately sees their status, their
// permanent URL and their campaign kit.
//
// Only nominations matching the verified mobile number are ever returned, and
// only a non-sensitive public campaign profile is exposed - never voter data,
// never another person's nomination.

const TOKEN_MINUTES = 30;

const STATUS_LABELS = {
  pending: { label: 'Under Review', tone: 'pending', note: 'Our team is reviewing your nomination. You will hear from us shortly.' },
  shortlisted: { label: 'Approved — Official Nominee', tone: 'approved', note: 'Your nomination is approved. Your public nominee page, QR code and campaign kit are live below.' },
  verified: { label: 'Approved — Official Nominee', tone: 'approved', note: 'Your nomination is approved. Your public nominee page, QR code and campaign kit are live below.' },
  rejected: { label: 'Not Selected', tone: 'rejected', note: 'Thank you for nominating. This nomination was not shortlisted for 2026.' },
  archived: { label: 'Withdrawn', tone: 'rejected', note: 'This nomination is no longer active.' },
};

const rateWindow = new Map(); // ip -> { count, start }
const RATE_MAX = 20;
const RATE_WINDOW = 60 * 60 * 1000;

function rateLimited(ip) {
  const now = Date.now();
  const entry = rateWindow.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW) {
    rateWindow.set(ip, { count: 1, start: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateWindow) {
    if (now - entry.start > RATE_WINDOW) rateWindow.delete(key);
  }
}, 10 * 60 * 1000).unref();

const clientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) return forwarded.split(',')[0].trim().slice(0, 60);
  return (req.ip || (req.connection && req.connection.remoteAddress) || '').slice(0, 60) || null;
};

// Last 10 digits, so 9876543210 and +91 98765 43210 both match how they typed.
const lastTenDigits = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : null;
};

const normalizeName = (value) => String(value || '').trim().toLowerCase();

router.post('/send', async (req, res) => {
  try {
    if (rateLimited(clientIp(req))) {
      return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }
    const result = await otpService.sendOtp(req.body.mobile);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Failed to send OTP' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    await otpService.verifyOtp(mobile, otp);
    const { normalized, token } = await otpService.createVerificationToken(mobile);

    await pool.query(
      "UPDATE otp_sessions SET used_at = NOW() WHERE mobile = ? AND purpose = 'nomination_status' AND used_at IS NULL",
      [normalized]
    );
    await pool.query(
      "INSERT INTO otp_sessions (mobile, token_hash, purpose, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))",
      [normalized, crypto.createHash('sha256').update(token).digest('hex'), 'nomination_status', TOKEN_MINUTES]
    );

    res.json({
      type: 'success',
      message: 'Mobile verified successfully.',
      verification_token: token,
      mobile: normalized,
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Verification failed' });
  }
});

router.post('/lookup', async (req, res) => {
  try {
    if (rateLimited(clientIp(req))) {
      return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }

    const token = String(req.body.verification_token || '');
    if (!token) return res.status(400).json({ message: 'Verification required' });

    // The token must be an unexpired, unused nomination-status token for some
    // mobile number. Votes use purpose 'vote' and can never satisfy this.
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const [sessions] = await pool.query(
      `SELECT mobile FROM otp_sessions
        WHERE token_hash = ? AND purpose = 'nomination_status' AND used_at IS NULL AND expires_at > NOW()
        LIMIT 1`,
      [tokenHash]
    );
    if (sessions.length === 0) {
      return res.status(401).json({ message: 'Your session has expired. Please verify your mobile number again.' });
    }

    const digits = lastTenDigits(sessions[0].mobile);
    if (!digits) return res.status(400).json({ message: 'Please verify a valid 10-digit mobile number.' });

    // A nomination can produce a nominee either through nomination_id or, for
    // rows promoted before that column existed, by name + category. MySQL has no
    // LATERAL join, so the candidates are fetched once and matched in memory.
    const [rows] = await pool.query(
      `SELECT nom.id AS nomination_id,
              nom.category_id,
              nom.nomination_code,
              nom.full_name AS applicant_name,
              nom.creator_name,
              nom.status AS nomination_status,
              nom.created_at,
              c.name AS category_name,
              c.voting_open
         FROM nominations nom
         JOIN categories c ON c.id = nom.category_id
        WHERE RIGHT(REGEXP_REPLACE(COALESCE(nom.phone, ''), '[^0-9]', ''), 10) = ?
        ORDER BY nom.id DESC
        LIMIT 20`,
      [digits]
    );

    if (rows.length === 0) {
      return res.json({
        message: 'We could not find a nomination for this mobile number yet. Double-check the number you nominated with.',
        nominations: [],
      });
    }

    const nomineeByNominationId = new Map();
    const nomineeByNameAndCategory = new Map();

    const nominationIds = rows.map((r) => r.nomination_id);
    const nameKeys = [...new Set(rows.map((r) => normalizeName(r.creator_name || r.applicant_name)).filter(Boolean))];

    if (nominationIds.length > 0) {
      const [linked] = await pool.query(
        `SELECT id, nomination_id, full_name, category_id, slug, nominee_code, photo_url, vote_count, status
           FROM nominees
          WHERE nomination_id IN (${nominationIds.map(() => '?').join(',')})
          ORDER BY id ASC`,
        nominationIds
      );
      for (const nominee of linked) {
        if (!nomineeByNominationId.has(nominee.nomination_id)) nomineeByNominationId.set(nominee.nomination_id, nominee);
      }
    }

    if (nameKeys.length > 0) {
      const [byName] = await pool.query(
        `SELECT id, nomination_id, full_name, category_id, slug, nominee_code, photo_url, vote_count, status
           FROM nominees
          WHERE LOWER(TRIM(full_name)) IN (${nameKeys.map(() => '?').join(',')})
          ORDER BY id ASC`,
        nameKeys
      );
      for (const nominee of byName) {
        const key = `${nominee.category_id}|${normalizeName(nominee.full_name)}`;
        if (!nomineeByNameAndCategory.has(key)) nomineeByNameAndCategory.set(key, nominee);
      }
    }

    const matched = rows.map((row) => {
      const byId = nomineeByNominationId.get(row.nomination_id)
        || nomineeByNameAndCategory.get(`${row.category_id}|${normalizeName(row.creator_name || row.applicant_name)}`);
      return { ...row, nominee: byId || null };
    });

    const nominations = matched.map((row) => {
      const nominee = row.nominee;
      const isLive = Boolean(nominee) && String(nominee.status) === 'approved';
      const approved = ['shortlisted', 'verified'].includes(row.nomination_status);

      // Never promise a kit that isn't live. A nomination can be approved
      // before its nominee page exists, and saying "Official Nominee" then
      // showing no kit is worse than saying the page is still being set up.
      let status;
      if (isLive) {
        status = {
          key: row.nomination_status,
          tone: 'approved',
          label: 'Approved — Official Nominee',
          note: 'Your nomination is approved. Your public nominee page, QR code and campaign kit are live below.',
        };
      } else if (approved) {
        status = {
          key: row.nomination_status,
          tone: 'pending',
          label: 'Approved — Page Being Set Up',
          note: 'Your nomination is approved. Your official page and QR code are being generated and will appear here automatically — usually within a day.',
        };
      } else {
        status = STATUS_LABELS[row.nomination_status] || STATUS_LABELS.pending;
      }

      return {
        nomination_code: row.nomination_code || null,
        applicant_name: row.creator_name || row.applicant_name,
        category_name: row.category_name,
        submitted_on: row.created_at,
        status: { key: row.nomination_status, ...status },
        campaign: isLive
          ? {
            nominee_name: nominee.full_name,
            nominee_slug: nominee.slug,
            nominee_code: nominee.nominee_code,
            photo_url: nominee.photo_url,
            vote_count: Number(nominee.vote_count || 0),
            voting_open: Number(row.voting_open) === 1,
            kit_url: `/nominee-kit?nominee=${nominee.slug}`,
          }
          : null,
      };
    });

    res.json({ message: 'ok', nominations });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to look up your nomination' });
  }
});

module.exports = router;