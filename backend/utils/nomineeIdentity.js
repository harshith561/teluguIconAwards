const crypto = require('crypto');
const { pool } = require('../config/database');

const CODE_PREFIX = 'TIC26-';
const CODE_PAD = 5;

// "Ananya Nagalla" -> "ananya-nagalla"
function slugify(input) {
  const base = String(input || '')
    .normalize('NFKD')
    // strip combining marks left behind by NFKD (accented latin)
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base.slice(0, 180);
}

// A slug that is free to use. Falls back to a numbered suffix only on collision,
// so the common case stays readable: /nominee/ananya-nagalla
async function uniqueSlug(desired, excludeId) {
  const base = slugify(desired) || `nominee-${excludeId || Date.now()}`;
  const filter = excludeId ? 'AND id <> ?' : '';

  for (let attempt = 1; attempt <= 60; attempt += 1) {
    const candidate = attempt === 1 ? base : `${base.slice(0, 180 - String(attempt).length - 1)}-${attempt}`;
    const params = excludeId ? [candidate, excludeId] : [candidate];
    const [rows] = await pool.query(`SELECT id FROM nominees WHERE slug = ? ${filter} LIMIT 1`, params);
    if (rows.length === 0) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

// TIC26-00001, TIC26-00002, ...
// MySQL has no sequences, so the number comes from the `code_counters` table.
// LAST_INSERT_ID(expr) returns the pre-increment value on the row that already
// existed and the new value on the row that was inserted, so one statement
// yields 1 on the first call and n on every later call - atomically, so two
// concurrent inserts can never be handed the same code.
async function generateNomineeCode() {
  const conn = await pool.getConnection();
  try {
    await conn.query(
      `INSERT INTO code_counters (name, value) VALUES ('nominee_code', LAST_INSERT_ID(1))
         ON DUPLICATE KEY UPDATE value = LAST_INSERT_ID(value + 1)`
    );
    const [rows] = await conn.query('SELECT LAST_INSERT_ID() AS n');
    const next = Number((rows[0] && rows[0].n) || 1);
    return CODE_PREFIX + String(next).padStart(CODE_PAD, '0');
  } catch (error) {
    // The counters table is missing (older database) - fall back to max+1 so
    // the endpoint keeps working.
    const [rows] = await pool.query(
      "SELECT CAST(COALESCE(MAX(CAST(SUBSTRING_INDEX(nominee_code, '-', -1) AS UNSIGNED)), 0) AS SIGNED) + 1 AS next FROM nominees WHERE nominee_code LIKE 'TIC26-%'"
    );
    const next = Number((rows[0] && rows[0].next) || 1);
    return CODE_PREFIX + String(next).padStart(CODE_PAD, '0');
  } finally {
    conn.release();
  }
}

function isUniqueViolation(error) {
  if (!error) return false;
  if (error.code === 'ER_DUP_ENTRY') return true;
  return /duplicate entry|duplicate key/i.test(String(error.message || ''));
}

// Runs `insert` with a fresh nominee code, retrying on the (rare) chance of a
// code collision so a busy awards night can never fail to create a nominee.
async function withNomineeCode(insert) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const nominee_code = await generateNomineeCode();
    try {
      return await insert(nominee_code);
    } catch (error) {
      lastError = error;
      if (!isUniqueViolation(error)) throw error;
    }
  }
  throw lastError;
}

const hashFingerprint = (ip, userAgent) =>
  crypto.createHash('sha256').update(`${ip || ''}|${userAgent || ''}`).digest('hex').slice(0, 64);

const clientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) return forwarded.split(',')[0].trim().slice(0, 60);
  return (req.ip || (req.connection && req.connection.remoteAddress) || '').slice(0, 60) || null;
};

// Additive migrations may not have been applied to a given database, so a column
// can be missing. Probe once and cache so the API keeps serving instead of
// erroring with "Unknown column".
const columnCache = new Map();

async function hasColumn(table, column) {
  const key = `${table}.${column}`;
  if (columnCache.has(key)) return columnCache.get(key);
  let exists = false;
  try {
    const [rows] = await pool.query(
      `SELECT 1 AS ok FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1`,
      [table, column]
    );
    exists = rows.length > 0;
  } catch (_) {
    exists = false;
  }
  columnCache.set(key, exists);
  return exists;
}

function resetColumnCache() {
  columnCache.clear();
}

module.exports = {
  CODE_PREFIX,
  slugify,
  uniqueSlug,
  generateNomineeCode,
  withNomineeCode,
  isUniqueViolation,
  hashFingerprint,
  clientIp,
  hasColumn,
  resetColumnCache,
};
