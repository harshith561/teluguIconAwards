const router = require('express').Router();
const path = require('path');
const multer = require('multer');
const { pool } = require('../config/database');
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const { slugify, uniqueSlug, withNomineeCode, hasColumn } = require('../utils/nomineeIdentity');
const { invalidate } = require('../utils/cache');

const fs = require('fs');
const crypto = require('crypto');
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const sponsorsUploadDir = path.join(uploadDir, 'sponsors');
if (!fs.existsSync(sponsorsUploadDir)) {
  fs.mkdirSync(sponsorsUploadDir, { recursive: true });
}

function isValidImageBuffer(buffer) {
  if (!buffer || buffer.length < 12) return false;
  // JPEG: ff d8 ff
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  // PNG: 89 50 4e 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
  // WebP: RIFF ... WEBP
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return true;
  return false;
}

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_IMAGE_SIZE = 1 * 1024 * 1024; // 1 MB limit

const memoryStorage = multer.memoryStorage();
const upload = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: (req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    if (ALLOWED_IMAGE_MIMES.includes(mime)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image format. Only JPEG, PNG, and WebP images are allowed.'));
    }
  },
});

router.use(authenticate, authorizeAdmin);

// POST /api/admin/upload — Dedicated admin image upload endpoint storing in database
router.post('/upload', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          message: 'Image is required. Please upload an image smaller than or equal to 1 MB (1,048,576 bytes).',
        });
      }
      return res.status(400).json({ message: err.message || 'Image upload error' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        message: 'Image is required. Please upload an image smaller than or equal to 1 MB.',
      });
    }

    if (req.file.size > MAX_IMAGE_SIZE || req.file.buffer.length > MAX_IMAGE_SIZE) {
      return res.status(400).json({
        message: 'Image is required. Please upload an image smaller than or equal to 1 MB.',
      });
    }

    const originalFilename = req.file.originalname || 'image.jpg';
    const mimeType = req.file.mimetype || 'image/jpeg';
    const fileSize = req.file.size || req.file.buffer.length;
    const section = (req.body.section || 'admin').trim();

    const [result] = await pool.query(
      'INSERT INTO images (original_filename, mime_type, file_size, image_data, section) VALUES (?, ?, ?, ?, ?)',
      [originalFilename, mimeType, fileSize, req.file.buffer, section]
    );

    const insertedId = result.insertId;
    const fileUrl = `/api/images/${insertedId}/file`;

    return res.status(201).json({
      id: insertedId,
      url: fileUrl,
      filename: originalFilename,
      size: fileSize,
      mime_type: mimeType,
      message: 'Image uploaded and stored in database successfully',
    });
  } catch (error) {
    console.error('Error storing image in database:', error);
    return res.status(500).json({ message: 'Failed to save image in database: ' + error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [totalNominations] = await pool.query('SELECT CAST(COUNT(*) AS SIGNED) AS count FROM nominations');
    const [pendingNominations] = await pool.query("SELECT CAST(COUNT(*) AS SIGNED) AS count FROM nominations WHERE status = 'pending'");
    const [approvedNominations] = await pool.query("SELECT CAST(COUNT(*) AS SIGNED) AS count FROM nominations WHERE status = 'shortlisted'");
    const [verifiedNominations] = await pool.query("SELECT CAST(COUNT(*) AS SIGNED) AS count FROM nominations WHERE status = 'verified'");
    const [totalVotes] = await pool.query('SELECT CAST(COUNT(*) AS SIGNED) AS count FROM votes');
    const [flaggedVotes] = await pool.query('SELECT CAST(COUNT(*) AS SIGNED) AS count FROM votes WHERE is_flagged = 1');
    const [totalNominees] = await pool.query('SELECT CAST(COUNT(*) AS SIGNED) AS count FROM nominees');
    const [totalCategories] = await pool.query('SELECT CAST(COUNT(*) AS SIGNED) AS count FROM categories');
    const [totalSponsors] = await pool.query('SELECT CAST(COUNT(*) AS SIGNED) AS count FROM sponsors');
    const [recentVotes] = await pool.query(
      `SELECT v.id, v.voter_name, v.voter_email, v.created_at, v.is_flagged, n.full_name AS nominee_name
       FROM votes v JOIN nominees n ON v.nominee_id = n.id
       ORDER BY v.id DESC LIMIT 10`
    );

    res.json({
      stats: {
        totalNominations: totalNominations[0].count,
        pendingNominations: pendingNominations[0].count,
        approvedNominations: approvedNominations[0].count,
        verifiedNominations: verifiedNominations[0].count,
        totalVotes: totalVotes[0].count,
        flaggedVotes: flaggedVotes[0].count,
        totalNominees: totalNominees[0].count,
        totalCategories: totalCategories[0].count,
        totalSponsors: totalSponsors[0].count,
      },
      recentVotes,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const NOMINEE_PROFILE_COLUMNS = [
  'achievements',
  'youtube_url',
  'instagram_url',
  'facebook_url',
  'website_url',
  'other_profile_url',
];

const firstUrl = (...candidates) => {
  for (const value of candidates) {
    const trimmed = String(value || '').trim();
    if (trimmed) return trimmed;
  }
  return null;
};

// Shortlisting a nomination creates (or refreshes) the official nominee page.
// Idempotent: re-shortlisting updates the same nominee and never mints a new
// URL, so links already printed on posters and QR codes keep working.
//
// `db` is the executor to use. Pass a transaction connection to keep the
// nominee row and the nomination status in one atomic unit - otherwise a
// failure here leaves the nomination reading "Shortlisted" with no nominee
// page behind it.
async function promoteNomination(nomination, categoryId, db = pool) {
  const fullName = nomination.creator_name || nomination.full_name;
  const profile = {
    bio: nomination.journey || null,
    achievements: nomination.achievements || null,
    photo_url: nomination.photo_url || null,
    social_handle: firstUrl(nomination.instagram_url, nomination.youtube_url, nomination.facebook_url, nomination.other_profile_url, nomination.website_url),
    youtube_url: nomination.youtube_url || null,
    instagram_url: nomination.instagram_url || null,
    facebook_url: nomination.facebook_url || null,
    website_url: nomination.website_url || null,
    other_profile_url: nomination.other_profile_url || null,
  };

  const hasNominationId = await hasColumn('nominees', 'nomination_id');
  const extraColumns = [];
  for (const column of NOMINEE_PROFILE_COLUMNS) {
    if (await hasColumn('nominees', column)) extraColumns.push(column);
  }

  const buildAssignments = () => extraColumns.map((column) => `${column} = ?`).join(', ');
  const buildValues = () => extraColumns.map((column) => profile[column]);

  let nomineeId = null;
  let nomineeCode = null;

  if (hasNominationId) {
    const [existing] = await db.query('SELECT id, nominee_code FROM nominees WHERE nomination_id = ? LIMIT 1', [nomination.id]);
    if (existing.length > 0) {
      nomineeId = existing[0].id;
      nomineeCode = existing[0].nominee_code;
      await db.query(
        `UPDATE nominees SET
           category_id = ?, full_name = ?, bio = ?, photo_url = ?, social_handle = ?, status = 'approved'
           ${extraColumns.length ? ', ' + buildAssignments() : ''}
         WHERE id = ?`,
        [categoryId, fullName, profile.bio, profile.photo_url, profile.social_handle, ...buildValues(), nomineeId]
      );
    }
  }

  if (!nomineeId) {
    const slug = await uniqueSlug(fullName);
    const created = await withNomineeCode(async (code) => {
      const [result] = await db.query(
        `INSERT INTO nominees (category_id, full_name, slug, bio, photo_url, social_handle, status, nominee_code${hasNominationId ? ', nomination_id' : ''}${extraColumns.length ? ', ' + extraColumns.join(', ') : ''})
         VALUES (?, ?, ?, ?, ?, ?, 'approved', ?${hasNominationId ? ', ?' : ''}${extraColumns.length ? ', ' + extraColumns.map(() => '?').join(', ') : ''})`,
        [categoryId, fullName, slug, profile.bio, profile.photo_url, profile.social_handle, code, ...(hasNominationId ? [nomination.id] : []), ...buildValues()]
      );
      return { id: result.insertId, code };
    });
    nomineeId = created.id;
    nomineeCode = created.code;
  }

  if (nomineeCode) {
    await db.query('UPDATE nominations SET nomination_code = COALESCE(nomination_code, ?) WHERE id = ?', [nomineeCode, nomination.id]);
  }
  return { id: nomineeId, nominee_code: nomineeCode };
}

router.get('/nominations', async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT n.id, n.nomination_code, n.full_name, n.creator_name, n.email, n.phone, n.city, n.state,
                      n.primary_platform, n.youtube_url, n.instagram_url, n.facebook_url, n.photo_url,
                      n.journey, n.achievements, n.status, n.created_at, c.name AS category_name
               FROM nominations n JOIN categories c ON n.category_id = c.id`;
    const params = [];
    if (status) {
      sql += ' WHERE n.status = ?';
      params.push(status);
    } else {
      sql += " WHERE n.status != 'deleted'";
    }
    sql += ' ORDER BY n.id DESC LIMIT 300';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/nominations/:id', async (req, res) => {
  let conn;
  try {
    const { status, admin_notes, category_id } = req.body;
    const [rows] = await pool.query('SELECT * FROM nominations WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Nomination not found' });
    }
    const nomination = rows[0];

    // The status write and the promotion it triggers are one unit. Committing
    // the status first meant a failure while creating the nominee page left the
    // dashboard reading "Shortlisted" with no nominee behind it - the admin
    // saw a success state and a missing nominee with no error to explain it.
    conn = await pool.getConnection();
    let promoted = null;
    try {
      await conn.beginTransaction();

      await conn.query(
        'UPDATE nominations SET status = COALESCE(?, status), admin_notes = COALESCE(?, admin_notes), category_id = COALESCE(?, category_id) WHERE id = ?',
        [status, admin_notes, category_id, req.params.id]
      );

      // Shortlisting a verified nomination promotes it to an official nominee.
      if (status === 'shortlisted') {
        promoted = await promoteNomination(nomination, category_id || nomination.category_id, conn);
      } else if (status) {
        // When status is undone (e.g. back to verified, rejected, or deleted),
        // update the nominee status so it immediately stops showing up on website/voting.
        const nomineeStatus = status === 'deleted' ? 'deleted' : status === 'rejected' ? 'rejected' : 'archived';
        await conn.query(
          'UPDATE nominees SET status = ? WHERE nomination_id = ?',
          [nomineeStatus, req.params.id]
        );
      }

      await conn.commit();
      invalidate('nominees');
      invalidate('nominee:');
    } catch (txErr) {
      try { await conn.rollback(); } catch (_) {}
      throw txErr;
    } finally {
      conn.release();
      conn = null;
    }

    res.json({ message: 'Nomination updated', ...(promoted ? { nominee: promoted } : {}) });
  } catch (error) {
    if (conn) { try { conn.rollback(); } catch (_) {} conn.release(); }
    console.error('Update nomination error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

router.delete('/nominations/:id', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Mark nomination as deleted
    await conn.query("UPDATE nominations SET status = 'deleted' WHERE id = ?", [req.params.id]);
    // Also mark any associated nominee as deleted so it is immediately removed from voting and website
    await conn.query("UPDATE nominees SET status = 'deleted' WHERE nomination_id = ?", [req.params.id]);

    await conn.commit();
    invalidate('nominees');
    invalidate('nominee:');
    res.json({ message: 'Nomination deleted' });
  } catch (error) {
    if (conn) { try { await conn.rollback(); } catch (_) {} }
    res.status(500).json({ message: error.message });
  } finally {
    if (conn) conn.release();
  }
});

router.get('/nominees', async (req, res) => {
  try {
    const extraColumns = [];
    for (const column of NOMINEE_PROFILE_COLUMNS) {
      if (await hasColumn('nominees', column)) extraColumns.push(column);
    }
    const selectExtras = extraColumns.map((column) => `, n.${column}`).join('');

    const analyticsJoin = `
       LEFT JOIN (
         SELECT nominee_id,
                SUM(CASE WHEN event_type = 'page_view'    THEN 1 ELSE 0 END) AS views,
                SUM(CASE WHEN event_type = 'vote_click'  THEN 1 ELSE 0 END) AS vote_clicks,
                SUM(CASE WHEN event_type = 'share_click' THEN 1 ELSE 0 END) AS share_clicks,
                SUM(CASE WHEN event_type = 'qr_scan'     THEN 1 ELSE 0 END) AS qr_scans
           FROM nominee_campaign_events
          GROUP BY nominee_id
       ) ev ON ev.nominee_id = n.id`;

    const baseSelect = `SELECT n.id, n.category_id, n.full_name, n.slug, n.bio, n.photo_url, n.social_handle, n.followers_count,
              n.featured, n.status, n.nominee_code, n.vote_count,
              c.name AS category_name, c.slug AS category_slug, c.voting_open${selectExtras}`;
    const analyticsSelect = `,
              CAST(COALESCE(ev.views, 0) AS SIGNED) AS page_views,
              CAST(COALESCE(ev.vote_clicks, 0) AS SIGNED) AS vote_clicks,
              CAST(COALESCE(ev.share_clicks, 0) AS SIGNED) AS share_clicks,
              CAST(COALESCE(ev.qr_scans, 0) AS SIGNED) AS qr_scans`;

    let rows;
    try {
      [rows] = await pool.query(
        `${baseSelect}${analyticsSelect}
       FROM nominees n
       JOIN categories c ON c.id = n.category_id
       ${analyticsJoin}
       ORDER BY n.id DESC`
      );
    } catch (queryError) {
      // Analytics table not created yet - still serve the directory.
      if (queryError.code !== 'ER_NO_SUCH_TABLE') throw queryError;
      [rows] = await pool.query(
        `${baseSelect}
       FROM nominees n
       JOIN categories c ON c.id = n.category_id
       ORDER BY n.id DESC`
      );
    }
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Full campaign payload for the admin "MY CAMPAIGN" panel (add-on req. 8).
router.get('/nominees/:id/campaign', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.query(
      `SELECT n.*, c.name AS category_name, c.slug AS category_slug, c.voting_open
         FROM nominees n JOIN categories c ON c.id = n.category_id
        WHERE n.id = ? LIMIT 1`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Nominee not found' });
    }

    const [totals] = await pool.query(
      `SELECT
         SUM(CASE WHEN event_type = 'page_view'    THEN 1 ELSE 0 END) AS page_views,
         SUM(CASE WHEN event_type = 'vote_click'  THEN 1 ELSE 0 END) AS vote_clicks,
         SUM(CASE WHEN event_type = 'share_click' THEN 1 ELSE 0 END) AS share_clicks,
         SUM(CASE WHEN event_type = 'qr_scan'     THEN 1 ELSE 0 END) AS qr_scans,
         SUM(CASE WHEN event_type = 'poster_download' THEN 1 ELSE 0 END) AS poster_downloads,
         SUM(CASE WHEN event_type = 'qr_download'     THEN 1 ELSE 0 END) AS qr_downloads
       FROM nominee_campaign_events
       WHERE nominee_id = ?`,
      [id]
    );

    // MySQL has no generate_series(): build the 14-day window from a recursive
    // CTE of day offsets and left-join the events onto each one.
    const [timeseries] = await pool.query(
      `WITH RECURSIVE days AS (
         SELECT 0 AS n
         UNION ALL
         SELECT n + 1 FROM days WHERE n < 13
       )
       SELECT DATE_FORMAT(CURDATE() - INTERVAL d.n DAY, '%Y-%m-%d') AS day,
              CAST(COALESCE(SUM(CASE WHEN e.event_type = 'page_view'   THEN 1 ELSE 0 END), 0) AS SIGNED) AS views,
              CAST(COALESCE(SUM(CASE WHEN e.event_type = 'vote_click' THEN 1 ELSE 0 END), 0) AS SIGNED) AS vote_clicks
         FROM days d
         LEFT JOIN nominee_campaign_events e
           ON e.nominee_id = ?
          AND DATE(e.created_at) = CURDATE() - INTERVAL d.n DAY
        GROUP BY d.n
        ORDER BY d.n ASC`,
      [id]
    );

    res.json({
      nominee: rows[0],
      analytics: {
        ...(totals[0] || {}),
        conversions: rows[0].vote_count || 0,
      },
      timeseries,
    });
  } catch (error) {
    if (error && error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ message: 'Run migration-nominee-pages.sql to enable campaign analytics' });
    }
    res.status(500).json({ message: error.message });
  }
});

router.post('/nominees', async (req, res) => {
  try {
    const { full_name, category_id, bio, achievements, photo_url, social_handle, followers_count, featured, slug: requestedSlug } = req.body;
    if (!full_name || !category_id) {
      return res.status(400).json({ message: 'Full name and category are required' });
    }

    // The public URL is a permanent, shareable identity, so an explicit slug is
    // honoured when given and otherwise derived from the name.
    const slug = await uniqueSlug(requestedSlug || full_name);

    const profile = {
      achievements: achievements || null,
      youtube_url: req.body.youtube_url || null,
      instagram_url: req.body.instagram_url || null,
      facebook_url: req.body.facebook_url || null,
      website_url: req.body.website_url || null,
      other_profile_url: req.body.other_profile_url || null,
    };
    const extraColumns = [];
    for (const column of NOMINEE_PROFILE_COLUMNS) {
      if (await hasColumn('nominees', column)) extraColumns.push(column);
    }

    const created = await withNomineeCode(async (nomineeCode) => {
      const [result] = await pool.query(
        `INSERT INTO nominees (category_id, full_name, slug, bio, photo_url, social_handle, followers_count, featured, status, nominee_code, vote_count${extraColumns.length ? ', ' + extraColumns.join(', ') : ''})
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, 0${extraColumns.length ? ', ' + extraColumns.map(() => '?').join(', ') : ''})`,
        [category_id, full_name, slug, bio || null, photo_url || null, social_handle || null, followers_count || null,
          featured ? 1 : 0, nomineeCode, ...extraColumns.map((column) => profile[column])]
      );
      return { id: result.insertId, slug, nominee_code: nomineeCode };
    });

    invalidate('nominees');
    res.status(201).json({ message: 'Nominee created successfully', ...created });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/nominees/:id', async (req, res) => {
  try {
    const {
      full_name, bio, photo_url, social_handle, followers_count, featured, status, category_id, slug: requestedSlug,
    } = req.body;
    const id = parseInt(req.params.id, 10);

    const profile = {
      achievements: req.body.achievements,
      youtube_url: req.body.youtube_url,
      instagram_url: req.body.instagram_url,
      facebook_url: req.body.facebook_url,
      website_url: req.body.website_url,
      other_profile_url: req.body.other_profile_url,
    };
    const extraColumns = [];
    for (const column of NOMINEE_PROFILE_COLUMNS) {
      if (await hasColumn('nominees', column)) extraColumns.push(column);
    }

    // Slug is deliberately NOT auto-regenerated on rename: URLs that are already
    // printed on posters, QR codes and videos must keep resolving. It only
    // changes when an admin explicitly asks for a new one.
    let slug = null;
    const trimmedSlug = String(requestedSlug || '').trim();
    if (trimmedSlug) {
      const normalized = slugify(trimmedSlug);
      if (normalized) {
        const [current] = await pool.query('SELECT slug FROM nominees WHERE id = ? LIMIT 1', [id]);
        if (current.length === 0) return res.status(404).json({ message: 'Nominee not found' });
        if (current[0].slug !== normalized) slug = await uniqueSlug(normalized, id);
      }
    }

    await pool.query(
      `UPDATE nominees SET
         full_name = COALESCE(?, full_name),
         bio = COALESCE(?, bio),
         photo_url = COALESCE(?, photo_url),
         social_handle = COALESCE(?, social_handle),
         followers_count = COALESCE(?, followers_count),
         featured = COALESCE(?, featured),
         status = COALESCE(?, status),
         category_id = COALESCE(?, category_id),
         slug = COALESCE(?, slug)
         ${extraColumns.map((column) => `, ${column} = COALESCE(?, ${column})`).join('')}
       WHERE id = ?`,
      [full_name, bio, photo_url, social_handle, followers_count,
        featured === undefined ? null : featured ? 1 : 0, status, category_id, slug,
        ...extraColumns.map((column) => profile[column]), id]
    );
    invalidate('nominees');
    invalidate('nominee:');
    res.json({ message: 'Nominee updated', slug: slug || undefined });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/nominees/:id', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [nominee] = await conn.query('SELECT nomination_id FROM nominees WHERE id = ?', [req.params.id]);
    if (nominee.length > 0 && nominee[0].nomination_id) {
      // Revert the nomination status from shortlisted back to verified
      await conn.query(
        "UPDATE nominations SET status = 'verified' WHERE id = ? AND status = 'shortlisted'",
        [nominee[0].nomination_id]
      );
    }

    await conn.query('DELETE FROM nominees WHERE id = ?', [req.params.id]);

    await conn.commit();
    invalidate('nominees');
    invalidate('nominee:');
    res.json({ message: 'Nominee deleted' });
  } catch (error) {
    if (conn) { try { await conn.rollback(); } catch (_) {} }
    res.status(500).json({ message: error.message });
  } finally {
    if (conn) conn.release();
  }
});

router.get('/votes', async (req, res) => {
  try {
    const { flagged } = req.query;
    let sql = `SELECT v.id, v.voter_name, v.voter_email, v.voter_phone, v.ip_address, v.user_agent,
                      v.is_flagged, v.flag_reason, v.otp_verified, v.created_at, n.full_name AS nominee_name, c.name AS category_name
               FROM votes v
               JOIN nominees n ON v.nominee_id = n.id
               JOIN categories c ON v.category_id = c.id`;
    const params = [];
    if (flagged) {
      sql += ' WHERE v.is_flagged = 1';
    }
    sql += ' ORDER BY v.id DESC LIMIT 300';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/votes/:id/flag', async (req, res) => {
  try {
    const { is_flagged, flag_reason } = req.body;
    await pool.query(
      'UPDATE votes SET is_flagged = ?, flag_reason = ? WHERE id = ?',
      [is_flagged ? 1 : 0, flag_reason || null, req.params.id]
    );
    res.json({ message: 'Vote updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/votes/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT nominee_id FROM votes WHERE id = ?', [req.params.id]);
    if (rows.length > 0) {
      const nomineeId = rows[0].nominee_id;
      await pool.query('DELETE FROM votes WHERE id = ?', [req.params.id]);
      // GREATEST(0, vote_count - 1) does NOT protect this column: MySQL
      // evaluates `vote_count - 1` first, and on an UNSIGNED column a 0
      // underflows and raises "BIGINT UNSIGNED value is out of range". IF() is
      // short-circuiting, so the decrement is only ever evaluated when the
      // counter is genuinely above zero.
      await pool.query('UPDATE nominees SET vote_count = IF(vote_count > 0, vote_count - 1, 0) WHERE id = ?', [nomineeId]);
    }
    res.json({ message: 'Vote deleted and vote count updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =========================================================================
// SPONSOR MANAGEMENT (Admin)
// =========================================================================

const ALLOWED_SPONSOR_TYPES = [
  'Title Sponsor',
  'Powered By Sponsor',
  'Associate Sponsor',
  'Gold Sponsor',
  'Silver Sponsor',
  'Media Partner',
  'Event Partner',
  'Technology Partner',
  'Digital Partner',
  'Bronze Sponsor',
  'Official Partner',
  'Co-Presenting Sponsor',
];

// GET /api/admin/sponsors — Retrieve saved sponsors with category details and sponsor type
router.get('/sponsors', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        s.id,
        s.name,
        s.sponsor_type,
        COALESCE(
          s.logo,
          CASE WHEN s.image_id IS NOT NULL THEN CONCAT('/api/images/', s.image_id, '/file') ELSE NULL END,
          s.logo_url
        ) AS logo,
        COALESCE(s.link, s.website_url) AS link,
        COALESCE(s.category_id, cs.category_id) AS category_id,
        c.name AS category_name,
        s.created_at
      FROM sponsors s
      LEFT JOIN categories c ON c.id = COALESCE(s.category_id, (
        SELECT cs2.category_id 
        FROM category_sponsors cs2 
        WHERE cs2.sponsor_id = s.id 
        ORDER BY cs2.id DESC 
        LIMIT 1
      ))
      LEFT JOIN category_sponsors cs ON cs.sponsor_id = s.id AND cs.category_id = c.id
      ORDER BY s.id DESC
    `);

    const data = rows.map((r) => ({
      id: r.id,
      name: r.name,
      sponsor_type: r.sponsor_type || null,
      logo: r.logo || null,
      link: r.link || null,
      category_id: r.category_id || null,
      category_name: r.category_name || null,
    }));

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper for sponsor multipart upload with multer error handling
const sponsorUploadMiddleware = upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]);

const handleSponsorUpload = (req, res, next) => {
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }

  sponsorUploadMiddleware(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Image is too large. Maximum permitted size is 1 MB (1,048,576 bytes).',
        });
      }
      return res.status(400).json({ success: false, message: err.message || 'Image upload error' });
    }
    req.file = (req.files && (req.files.logo?.[0] || req.files.image?.[0])) || null;
    next();
  });
};

// Reusable sponsor update handler (supports both POST and PUT methods)
const handleUpdateSponsor = async (id, req, res) => {
  try {
    const parsedId = parseInt(id, 10);
    if (!parsedId || isNaN(parsedId) || parsedId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid sponsor ID' });
    }

    // Check if sponsor exists
    const [existingSponsors] = await pool.query('SELECT * FROM sponsors WHERE id = ? LIMIT 1', [parsedId]);
    if (existingSponsors.length === 0) {
      return res.status(404).json({ success: false, message: 'Sponsor not found' });
    }
    const currentSponsor = existingSponsors[0];

    let { name, sponsor_type, tier, image_id, logo, logo_url, link, website_url, category_id, tagline, is_active, sort_order } = req.body;

    if (name !== undefined) {
      name = typeof name === 'string' ? name.trim() : '';
      if (!name) {
        return res.status(400).json({ success: false, message: 'Sponsor name cannot be empty' });
      }
    }

    if (sponsor_type !== undefined) {
      const trimmedType = typeof sponsor_type === 'string' ? sponsor_type.trim() : '';
      if (!trimmedType) {
        return res.status(400).json({ success: false, message: 'Sponsor type cannot be empty' });
      }
      if (!ALLOWED_SPONSOR_TYPES.includes(trimmedType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid sponsor type. Must be one of: ${ALLOWED_SPONSOR_TYPES.join(', ')}`,
        });
      }
      // Check whether another sponsor already uses this type
      const [existing] = await pool.query(
        'SELECT id FROM sponsors WHERE sponsor_type = ? AND id != ? LIMIT 1',
        [trimmedType, parsedId]
      );
      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'This sponsor type has already been assigned to another sponsor.',
        });
      }
      sponsor_type = trimmedType;
    }

    // Handle optional link
    const rawLink = link !== undefined ? link : website_url;
    let finalLink = undefined;
    if (rawLink !== undefined) {
      const trimmedLink = typeof rawLink === 'string' ? rawLink.trim() : '';
      if (trimmedLink) {
        try {
          const parsed = new URL(trimmedLink);
          if (!['http:', 'https:'].includes(parsed.protocol)) {
            return res.status(400).json({ success: false, message: 'Invalid URL. Only HTTP and HTTPS links are allowed.' });
          }
        } catch (err) {
          return res.status(400).json({ success: false, message: 'Please enter a valid website URL (e.g. https://example.com)' });
        }
        finalLink = trimmedLink;
      } else {
        finalLink = null;
      }
    }

    // Handle new uploaded logo file if provided
    let newLogoPath = null;
    let newImageId = null;
    if (req.file && req.file.buffer) {
      if (req.file.size > MAX_IMAGE_SIZE || req.file.buffer.length > MAX_IMAGE_SIZE) {
        return res.status(400).json({
          success: false,
          message: 'Image exceeds maximum allowed size of 1 MB (1,048,576 bytes).',
        });
      }

      if (!isValidImageBuffer(req.file.buffer)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid image format. Only genuine JPG, JPEG, PNG, and WebP images are allowed.',
        });
      }

      const rawExt = path.extname(req.file.originalname || '').toLowerCase();
      const ext = ['.jpg', '.jpeg', '.png', '.webp'].includes(rawExt) ? rawExt : '.png';
      const filename = `sponsor-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
      newLogoPath = `/uploads/sponsors/${filename}`;
      const absoluteFilePath = path.join(sponsorsUploadDir, filename);

      await fs.promises.writeFile(absoluteFilePath, req.file.buffer);

      try {
        const [imgRes] = await pool.query(
          'INSERT INTO images (original_filename, mime_type, file_size, image_data, section, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [req.file.originalname || filename, req.file.mimetype || 'image/png', req.file.size || req.file.buffer.length, req.file.buffer, 'sponsors', 'sponsor', parsedId]
        );
        newImageId = imgRes.insertId;
      } catch (imgErr) {
        console.error('Non-critical: Failed to save sponsor image to images table:', imgErr.message);
      }

      // If old logo exists and is not shared, safely unlink it
      const oldLogo = currentSponsor.logo || currentSponsor.logo_url;
      if (oldLogo && typeof oldLogo === 'string' && oldLogo.startsWith('/uploads/sponsors/')) {
        const [shared] = await pool.query(
          'SELECT id FROM sponsors WHERE (logo = ? OR logo_url = ?) AND id != ? LIMIT 1',
          [oldLogo, oldLogo, parsedId]
        );
        if (shared.length === 0) {
          const oldFilename = path.basename(oldLogo);
          const oldDiskPath = path.join(sponsorsUploadDir, oldFilename);
          const resolvedOld = path.resolve(oldDiskPath);
          const resolvedDir = path.resolve(sponsorsUploadDir);
          if (resolvedOld.startsWith(resolvedDir) && fs.existsSync(resolvedOld)) {
            try {
              await fs.promises.unlink(resolvedOld);
            } catch (unlinkErr) {
              console.error('Non-critical: Failed to unlink old logo:', unlinkErr.message);
            }
          }
        }
      }
    }

    const finalLogo = newLogoPath || logo || logo_url;
    const finalImageId = newImageId || image_id;

    try {
      await pool.query(
        `UPDATE sponsors SET
           name = COALESCE(?, name),
           sponsor_type = COALESCE(?, sponsor_type),
           tier = COALESCE(?, tier),
           image_id = COALESCE(?, image_id),
           logo = COALESCE(?, logo),
           logo_url = COALESCE(?, logo_url),
           link = CASE WHEN ? = 1 THEN ? ELSE link END,
           website_url = CASE WHEN ? = 1 THEN ? ELSE website_url END,
           category_id = COALESCE(?, category_id),
           tagline = COALESCE(?, tagline),
           is_active = COALESCE(?, is_active),
           sort_order = COALESCE(?, sort_order)
         WHERE id = ?`,
        [
          name || null,
          sponsor_type || null,
          tier || null,
          finalImageId || null,
          finalLogo || null,
          finalLogo || null,
          rawLink !== undefined ? 1 : 0,
          finalLink !== undefined ? finalLink : null,
          rawLink !== undefined ? 1 : 0,
          finalLink !== undefined ? finalLink : null,
          category_id ? parseInt(category_id, 10) : null,
          tagline || null,
          is_active === undefined ? null : (is_active ? 1 : 0),
          sort_order !== undefined ? sort_order : null,
          parsedId,
        ]
      );
    } catch (updateErr) {
      if (updateErr.code === 'ER_DUP_ENTRY' || updateErr.errno === 1062) {
        return res.status(409).json({
          success: false,
          message: 'This sponsor type has already been assigned to another sponsor.',
        });
      }
      throw updateErr;
    }

    invalidate('sponsors:');
    invalidate('categories:');

    // Retrieve updated sponsor
    const [updatedRows] = await pool.query(
      `SELECT id, name, sponsor_type,
              COALESCE(logo, logo_url) AS logo,
              COALESCE(link, website_url) AS link
       FROM sponsors WHERE id = ?`,
      [parsedId]
    );

    return res.json({
      success: true,
      message: 'Sponsor updated successfully',
      data: updatedRows[0] || null,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/admin/sponsors — Create a sponsor or Update if id/sponsor_id is passed
router.post('/sponsors', handleSponsorUpload, async (req, res) => {
  try {
    // If an id / sponsor_id is passed in body, route to update logic (supports POST for updates)
    const updateId = req.body.id || req.body.sponsor_id;
    if (updateId) {
      return await handleUpdateSponsor(updateId, req, res);
    }

    const rawName = req.body.name;
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    if (!name) {
      return res.status(400).json({ success: false, message: 'Sponsor name is required' });
    }

    // Category is optional
    const rawCatId = req.body.category_id;
    let categoryId = null;
    let categoryName = null;
    if (rawCatId !== undefined && rawCatId !== null && rawCatId !== '') {
      const parsedCatId = parseInt(rawCatId, 10);
      if (!isNaN(parsedCatId) && parsedCatId > 0) {
        const [catRows] = await pool.query('SELECT id, name FROM categories WHERE id = ?', [parsedCatId]);
        if (catRows.length > 0) {
          categoryId = parsedCatId;
          categoryName = catRows[0].name;
        } else {
          return res.status(400).json({ success: false, message: 'Selected category does not exist' });
        }
      }
    }

    // Validate sponsor_type
    const rawSponsorType = req.body.sponsor_type;
    const sponsorType = typeof rawSponsorType === 'string' ? rawSponsorType.trim() : '';
    if (!sponsorType) {
      return res.status(400).json({ success: false, message: 'Sponsor type is required' });
    }
    if (!ALLOWED_SPONSOR_TYPES.includes(sponsorType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid sponsor type. Must be one of: ${ALLOWED_SPONSOR_TYPES.join(', ')}`,
      });
    }

    // Check whether the selected sponsor_type is already assigned to another sponsor
    const [existingTypeRows] = await pool.query(
      'SELECT id, name FROM sponsors WHERE sponsor_type = ? LIMIT 1',
      [sponsorType]
    );
    if (existingTypeRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This sponsor type has already been assigned to another sponsor.',
      });
    }

    // Validate optional link
    const rawLink = req.body.link !== undefined ? req.body.link : req.body.website_url;
    let link = typeof rawLink === 'string' ? rawLink.trim() : '';
    if (link) {
      try {
        const parsed = new URL(link);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return res.status(400).json({ success: false, message: 'Invalid URL. Only HTTP and HTTPS links are allowed.' });
        }
      } catch (err) {
        return res.status(400).json({ success: false, message: 'Please enter a valid website URL (e.g. https://example.com)' });
      }
    } else {
      link = null;
    }

    // Validate logo file
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'Sponsor logo is required' });
    }

    if (req.file.size > MAX_IMAGE_SIZE || req.file.buffer.length > MAX_IMAGE_SIZE) {
      return res.status(400).json({
        success: false,
        message: 'Image exceeds maximum allowed size of 1 MB (1,048,576 bytes).',
      });
    }

    if (!isValidImageBuffer(req.file.buffer)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image format. Only genuine JPG, JPEG, PNG, and WebP images are allowed.',
      });
    }

    // Save logo to managed uploads directory
    const rawExt = path.extname(req.file.originalname || '').toLowerCase();
    const ext = ['.jpg', '.jpeg', '.png', '.webp'].includes(rawExt) ? rawExt : '.png';
    const filename = `sponsor-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    const relativeLogoPath = `/uploads/sponsors/${filename}`;
    const absoluteFilePath = path.join(sponsorsUploadDir, filename);

    await fs.promises.writeFile(absoluteFilePath, req.file.buffer);

    // Also store image record in images table for database storage parity
    let imageId = null;
    try {
      const [imgRes] = await pool.query(
        'INSERT INTO images (original_filename, mime_type, file_size, image_data, section, entity_type) VALUES (?, ?, ?, ?, ?, ?)',
        [req.file.originalname || filename, req.file.mimetype || 'image/png', req.file.size || req.file.buffer.length, req.file.buffer, 'sponsors', 'sponsor']
      );
      imageId = imgRes.insertId;
    } catch (imgErr) {
      console.error('Non-critical: Failed to save sponsor image to images table:', imgErr.message);
    }

    // Insert sponsor record (with concurrency protection on unique key)
    let newSponsorId;
    try {
      const [result] = await pool.query(
        `INSERT INTO sponsors (name, sponsor_type, logo, logo_url, link, website_url, category_id, image_id, tier, is_active, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'category_partner', 1, 0)`,
        [name, sponsorType, relativeLogoPath, relativeLogoPath, link, link, categoryId, imageId]
      );
      newSponsorId = result.insertId;
    } catch (insertErr) {
      if (insertErr.code === 'ER_DUP_ENTRY' || insertErr.errno === 1062) {
        return res.status(409).json({
          success: false,
          message: 'This sponsor type has already been assigned to another sponsor.',
        });
      }
      throw insertErr;
    }

    if (imageId) {
      await pool.query('UPDATE images SET entity_id = ? WHERE id = ?', [newSponsorId, imageId]).catch(() => {});
    }

    // Link in category_sponsors junction table if category is specified
    if (categoryId) {
      await pool.query(
        `INSERT INTO category_sponsors (category_id, sponsor_id, role, sort_order)
         VALUES (?, ?, 'Category Partner', 0)
         ON DUPLICATE KEY UPDATE role = VALUES(role)`,
        [categoryId, newSponsorId]
      ).catch(() => {});
    }

    invalidate('sponsors:');
    invalidate('categories:');

    const createdData = {
      id: newSponsorId,
      name,
      sponsor_type: sponsorType,
      logo: relativeLogoPath,
      link,
      category_id: categoryId,
      category_name: categoryName,
    };

    return res.status(201).json({
      success: true,
      message: 'Sponsor created successfully',
      id: newSponsorId,
      data: createdData,
    });
  } catch (error) {
    console.error('Error creating sponsor:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/sponsors/:id — Update sponsor via POST
router.post('/sponsors/:id', handleSponsorUpload, async (req, res) => {
  return await handleUpdateSponsor(req.params.id, req, res);
});

// PUT /api/admin/sponsors/:id — Update sponsor via PUT
router.put('/sponsors/:id', handleSponsorUpload, async (req, res) => {
  return await handleUpdateSponsor(req.params.id, req, res);
});

// DELETE /api/admin/sponsors/:id — Permanently delete a sponsor and safely remove logo file
router.delete('/sponsors/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid sponsor ID' });
    }

    const [rows] = await pool.query('SELECT id, name, logo, logo_url, image_id FROM sponsors WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sponsor not found' });
    }
    const sponsor = rows[0];

    // Delete sponsor record from database
    await pool.query('DELETE FROM sponsors WHERE id = ?', [id]);

    // Clean up category_sponsors junction table
    await pool.query('DELETE FROM category_sponsors WHERE sponsor_id = ?', [id]).catch(() => {});

    // Clean up database image entity if associated
    if (sponsor.image_id) {
      await pool.query("DELETE FROM images WHERE id = ? AND entity_type = 'sponsor'", [sponsor.image_id]).catch(() => {});
    }

    // Safely remove managed local file if not shared
    const logoPath = sponsor.logo || sponsor.logo_url;
    if (logoPath && typeof logoPath === 'string' && (logoPath.startsWith('/uploads/') || logoPath.startsWith('uploads/'))) {
      const [shared] = await pool.query(
        'SELECT id FROM sponsors WHERE (logo = ? OR logo_url = ?) AND id != ? LIMIT 1',
        [logoPath, logoPath, id]
      );
      if (shared.length === 0) {
        const rootUploadDir = path.resolve(__dirname, '..', 'uploads');
        const rel = logoPath.replace(/^\/?uploads\/?/, '');
        const targetPath = path.resolve(rootUploadDir, rel);
        // Security check: ensure path is strictly inside rootUploadDir
        if (targetPath.startsWith(rootUploadDir) && fs.existsSync(targetPath)) {
          await fs.promises.unlink(targetPath).catch(() => {});
        }
      }
    }

    invalidate('sponsors:');
    invalidate('categories:');
    return res.status(200).json({ success: true, message: 'Sponsor deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});



// ========== CATEGORY SPONSORS & POSTER TEMPLATES ADMIN ==========
router.get('/categories/:id/sponsors', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT cs.id AS association_id, cs.role, cs.sort_order AS display_order, cs.created_at AS associated_at,
              s.id, s.id AS sponsor_id, s.name, s.tier,
              COALESCE(CASE WHEN s.image_id IS NOT NULL THEN CONCAT('/api/images/', s.image_id, '/file') ELSE NULL END, s.logo_url) AS logo_url,
              s.website_url, s.tagline, COALESCE(s.is_active, 1) AS is_active
         FROM category_sponsors cs
         JOIN sponsors s ON cs.sponsor_id = s.id
        WHERE cs.category_id = ?
        ORDER BY cs.sort_order ASC, s.sort_order ASC, s.id ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/categories/:id/sponsors', async (req, res) => {
  try {
    const { sponsor_id, role, sort_order } = req.body;
    if (!sponsor_id) {
      return res.status(400).json({ message: 'sponsor_id is required' });
    }
    await pool.query(
      `INSERT INTO category_sponsors (category_id, sponsor_id, role, sort_order)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE role = VALUES(role), sort_order = VALUES(sort_order)`,
      [req.params.id, sponsor_id, role || 'Category Partner', sort_order || 0]
    );
    invalidate('categories:');
    res.status(201).json({ message: 'Sponsor associated with category successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/categories/:id/sponsors/:associationId', async (req, res) => {
  try {
    const { role, sort_order } = req.body;
    await pool.query(
      `UPDATE category_sponsors SET
         role = COALESCE(?, role),
         sort_order = COALESCE(?, sort_order)
       WHERE id = ? AND category_id = ?`,
      [role, sort_order, req.params.associationId, req.params.id]
    );
    invalidate('categories:');
    res.json({ message: 'Category sponsor association updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/categories/:id/sponsors/:sponsorId', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM category_sponsors WHERE category_id = ? AND sponsor_id = ?',
      [req.params.id, req.params.sponsorId]
    );
    invalidate('categories:');
    res.json({ message: 'Sponsor removed from category' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/categories/:id/poster-template', async (req, res) => {
  try {
    const { poster_template, poster_theme_color, poster_badge_text, poster_tagline } = req.body;
    await pool.query(
      `UPDATE categories SET
         poster_template = COALESCE(?, poster_template),
         poster_theme_color = COALESCE(?, poster_theme_color),
         poster_badge_text = COALESCE(?, poster_badge_text),
         poster_tagline = COALESCE(?, poster_tagline)
       WHERE id = ?`,
      [poster_template, poster_theme_color, poster_badge_text, poster_tagline, req.params.id]
    );
    invalidate('categories:');
    res.json({ message: 'Poster template settings saved successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/categories/:id/poster-preview', async (req, res) => {
  try {
    const [categories] = await pool.query(
      'SELECT id, name, slug, type, poster_template, poster_theme_color, poster_badge_text, poster_tagline FROM categories WHERE id = ? LIMIT 1',
      [req.params.id]
    );
    if (!categories.length) return res.status(404).json({ message: 'Category not found' });
    const category = categories[0];

    const [categorySponsors] = await pool.query(
      `SELECT cs.id AS association_id, cs.role, cs.sort_order AS display_order,
              s.id, s.id AS sponsor_id, s.name, s.tier,
              COALESCE(CASE WHEN s.image_id IS NOT NULL THEN CONCAT('/api/images/', s.image_id, '/file') ELSE NULL END, s.logo_url) AS logo_url,
              s.website_url, s.tagline, COALESCE(s.is_active, 1) AS is_active
         FROM category_sponsors cs
         JOIN sponsors s ON cs.sponsor_id = s.id
        WHERE cs.category_id = ?
        ORDER BY cs.sort_order ASC, s.sort_order ASC, s.id ASC`,
      [category.id]
    );

    // Master switch enforcement: inactive sponsors (is_active = 0) are excluded from the poster preview!
    const activeCategorySponsors = categorySponsors.filter((s) => Number(s.is_active) === 1);

    let displaySponsors = activeCategorySponsors;
    if (!displaySponsors.length) {
      const [globalSpons] = await pool.query(
        `SELECT NULL AS association_id,
                CASE
                  WHEN tier = 'title_partner' THEN 'Title Partner'
                  WHEN tier = 'powered_by' THEN 'Powered By'
                  WHEN tier = 'co_powered_by' THEN 'Co-Powered By'
                  ELSE 'Official Partner'
                END AS role,
                sort_order AS display_order,
                id, id AS sponsor_id, name, tier,
                COALESCE(CASE WHEN image_id IS NOT NULL THEN CONCAT('/api/images/', image_id, '/file') ELSE NULL END, logo_url) AS logo_url,
                website_url, tagline, is_active
           FROM sponsors
          WHERE is_active = 1
          ORDER BY CASE tier
            WHEN 'title_partner' THEN 1
            WHEN 'powered_by' THEN 2
            WHEN 'co_powered_by' THEN 3
            ELSE 4
          END ASC, sort_order ASC, id ASC`
      );
      displaySponsors = globalSpons;
    }

    const [nominees] = await pool.query(
      `SELECT id, full_name, slug, photo_url, social_handle, nominee_code
         FROM nominees
        WHERE category_id = ?
        ORDER BY id ASC`,
      [category.id]
    );

    res.json({
      category,
      category_sponsors: categorySponsors,
      sponsors: displaySponsors,
      nominees,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/nominees/:id/regenerate-poster', async (req, res) => {
  try {
    const nomineeId = req.params.id;
    const [nominees] = await pool.query(
      `SELECT n.id, n.full_name, n.slug, n.photo_url, n.nominee_code, n.category_id,
              c.name AS category_name, c.poster_template, c.poster_theme_color, c.poster_badge_text, c.poster_tagline
         FROM nominees n
         JOIN categories c ON n.category_id = c.id
        WHERE n.id = ? LIMIT 1`,
      [nomineeId]
    );
    if (!nominees.length) return res.status(404).json({ message: 'Nominee not found' });
    const nominee = nominees[0];

    // Log in audit_logs
    await pool.query(
      `INSERT INTO audit_logs (admin_id, admin_email, action, entity_type, entity_id, details)
       VALUES (?, ?, 'regenerate_poster', 'nominee', ?, ?)`,
      [
        req.user?.id || null,
        req.user?.email || 'admin',
        nominee.id,
        JSON.stringify({ nominee: nominee.full_name, category: nominee.category_name, timestamp: new Date() }),
      ]
    );

    invalidate('nominee:');
    invalidate('nominees');

    res.json({
      message: `Poster regenerated successfully for ${nominee.full_name}`,
      nominee,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/settings', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT setting_key, setting_value, group_name FROM settings');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
        [key, String(value)]
      );
    }
    res.json({ message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/messages', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM contact_messages ORDER BY id DESC LIMIT 200');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/messages/:id/read', async (req, res) => {
  try {
    await pool.query('UPDATE contact_messages SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Message marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== TICKETS ADMIN ==========
router.get('/tickets', async (req, res) => {
  try {
    const [configs] = await pool.query('SELECT * FROM tickets ORDER BY session ASC, tier ASC');
    const [orders] = await pool.query('SELECT * FROM ticket_orders ORDER BY id DESC LIMIT 300');
    const [stats] = await pool.query(`
      SELECT 
        CAST(COUNT(*) AS SIGNED) AS total_orders,
        CAST(COALESCE(SUM(quantity), 0) AS SIGNED) AS total_attendees,
        CAST(COALESCE(SUM(price_paisa), 0) AS SIGNED) AS total_revenue_paisa,
        CAST(COALESCE(SUM(is_checked_in), 0) AS SIGNED) AS total_checked_in
      FROM ticket_orders WHERE payment_status = 'paid'
    `);
    res.json({
      configs,
      orders,
      stats: stats[0] || { total_orders: 0, total_attendees: 0, total_revenue_paisa: 0, total_checked_in: 0 },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/tickets/:id/check-in', async (req, res) => {
  try {
    const { is_checked_in } = req.body;
    const checkedInVal = is_checked_in ? 1 : 0;
    const checkedAt = is_checked_in ? new Date() : null;
    await pool.query(
      'UPDATE ticket_orders SET is_checked_in = ?, checked_in_at = ? WHERE id = ?',
      [checkedInVal, checkedAt, req.params.id]
    );
    res.json({ message: `Ticket order ${checkedInVal ? 'checked in' : 'unchecked'}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/tickets/config/:id', async (req, res) => {
  try {
    const { inventory, price_paisa, availability, is_active } = req.body;
    await pool.query(
      `UPDATE tickets SET
         inventory = COALESCE(?, inventory),
         price_paisa = COALESCE(?, price_paisa),
         availability = COALESCE(?, availability),
         is_active = COALESCE(?, is_active),
         updated_at = NOW()
       WHERE id = ?`,
      [inventory, price_paisa, availability, is_active === undefined ? null : is_active ? 1 : 0, req.params.id]
    );
    res.json({ message: 'Ticket config updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== PAST EVENTS & AWARDEES CRUD ==========
router.get('/past-events', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM past_events ORDER BY sort_order ASC, year DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/past-events', async (req, res) => {
  try {
    const { slug, name, event_date, year, venue, description, poster_url, sort_order, is_published } = req.body;
    if (!slug || !name || !year) {
      return res.status(400).json({ message: 'Slug, Name and Year are required' });
    }
    const [result] = await pool.query(
      `INSERT INTO past_events (slug, name, event_date, year, venue, description, poster_url, sort_order, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [slug, name, event_date || null, year, venue || null, description || null, poster_url || null, sort_order || 0, is_published === 0 ? 0 : 1]
    );
    res.status(201).json({ message: 'Past event created', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/past-events/:id', async (req, res) => {
  try {
    const { slug, name, event_date, year, venue, description, poster_url, sort_order, is_published } = req.body;
    await pool.query(
      `UPDATE past_events SET
         slug = COALESCE(?, slug),
         name = COALESCE(?, name),
         event_date = COALESCE(?, event_date),
         year = COALESCE(?, year),
         venue = COALESCE(?, venue),
         description = COALESCE(?, description),
         poster_url = COALESCE(?, poster_url),
         sort_order = COALESCE(?, sort_order),
         is_published = COALESCE(?, is_published)
       WHERE id = ?`,
      [slug, name, event_date, year, venue, description, poster_url, sort_order, is_published, req.params.id]
    );
    res.json({ message: 'Past event updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/past-events/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM past_events WHERE id = ?', [req.params.id]);
    res.json({ message: 'Past event deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/awardees', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.*, pe.name AS event_name
      FROM awardees a JOIN past_events pe ON a.past_event_id = pe.id
      ORDER BY a.year DESC, a.id DESC LIMIT 200
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/awardees', async (req, res) => {
  try {
    const { past_event_id, name, category, award_type, photo_url, bio, social_handle, year } = req.body;
    if (!past_event_id || !name || !category) {
      return res.status(400).json({ message: 'past_event_id, name and category are required' });
    }
    const [result] = await pool.query(
      `INSERT INTO awardees (past_event_id, name, category, award_type, photo_url, bio, social_handle, year)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [past_event_id, name, category, award_type || null, photo_url || null, bio || null, social_handle || null, year || 2025]
    );
    res.status(201).json({ message: 'Awardee added', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/awardees/:id', async (req, res) => {
  try {
    const { past_event_id, name, category, award_type, photo_url, bio, social_handle, year } = req.body;
    await pool.query(
      `UPDATE awardees SET
         past_event_id = COALESCE(?, past_event_id),
         name = COALESCE(?, name),
         category = COALESCE(?, category),
         award_type = COALESCE(?, award_type),
         photo_url = COALESCE(?, photo_url),
         bio = COALESCE(?, bio),
         social_handle = COALESCE(?, social_handle),
         year = COALESCE(?, year)
       WHERE id = ?`,
      [past_event_id, name, category, award_type, photo_url, bio, social_handle, year, req.params.id]
    );
    res.json({ message: 'Awardee updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/awardees/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM awardees WHERE id = ?', [req.params.id]);
    res.json({ message: 'Awardee removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== GALLERY CMS ==========
router.get('/gallery', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM gallery_items ORDER BY id DESC LIMIT 200');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/gallery', async (req, res) => {
  try {
    const { category, item_type, url, thumbnail_url, title, description, sort_order, is_published } = req.body;
    if (!url) return res.status(400).json({ message: 'URL is required' });
    const [result] = await pool.query(
      `INSERT INTO gallery_items (category, item_type, url, thumbnail_url, title, description, sort_order, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [category || 'general', item_type || 'image', url, thumbnail_url || null, title || null, description || null, sort_order || 0, is_published === 0 ? 0 : 1]
    );
    res.status(201).json({ message: 'Gallery item added', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/gallery/:id', async (req, res) => {
  try {
    const { category, item_type, url, thumbnail_url, title, description, sort_order, is_published } = req.body;
    await pool.query(
      `UPDATE gallery_items SET
         category = COALESCE(?, category),
         item_type = COALESCE(?, item_type),
         url = COALESCE(?, url),
         thumbnail_url = COALESCE(?, thumbnail_url),
         title = COALESCE(?, title),
         description = COALESCE(?, description),
         sort_order = COALESCE(?, sort_order),
         is_published = COALESCE(?, is_published)
       WHERE id = ?`,
      [category, item_type, url, thumbnail_url, title, description, sort_order, is_published, req.params.id]
    );
    res.json({ message: 'Gallery item updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/gallery/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM gallery_items WHERE id = ?', [req.params.id]);
    res.json({ message: 'Gallery item deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== MEDIA CMS ==========
router.get('/media', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM media_items ORDER BY id DESC LIMIT 200');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/media', async (req, res) => {
  try {
    const { item_type, title, description, url, thumbnail_url, source, published_date, sort_order, is_published } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });
    const [result] = await pool.query(
      `INSERT INTO media_items (item_type, title, description, url, thumbnail_url, source, published_date, sort_order, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [item_type || 'press_release', title, description || null, url || null, thumbnail_url || null, source || null, published_date || new Date(), sort_order || 0, is_published === 0 ? 0 : 1]
    );
    res.status(201).json({ message: 'Media release added', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/media/:id', async (req, res) => {
  try {
    const { item_type, title, description, url, thumbnail_url, source, published_date, sort_order, is_published } = req.body;
    await pool.query(
      `UPDATE media_items SET
         item_type = COALESCE(?, item_type),
         title = COALESCE(?, title),
         description = COALESCE(?, description),
         url = COALESCE(?, url),
         thumbnail_url = COALESCE(?, thumbnail_url),
         source = COALESCE(?, source),
         published_date = COALESCE(?, published_date),
         sort_order = COALESCE(?, sort_order),
         is_published = COALESCE(?, is_published)
       WHERE id = ?`,
      [item_type, title, description, url, thumbnail_url, source, published_date, sort_order, is_published, req.params.id]
    );
    res.json({ message: 'Media release updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/media/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM media_items WHERE id = ?', [req.params.id]);
    res.json({ message: 'Media release deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== SPONSOR LEADS ==========
router.get('/sponsor-leads', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sponsor_leads ORDER BY id DESC LIMIT 200');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/sponsor-leads/:id/read', async (req, res) => {
  try {
    await pool.query('UPDATE sponsor_leads SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Sponsor lead marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/sponsor-leads/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM sponsor_leads WHERE id = ?', [req.params.id]);
    res.json({ message: 'Sponsor lead deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== EVENT PHASE SWITCHER ==========
router.put('/event-phase', async (req, res) => {
  try {
    const { phase } = req.body;
    if (!['phase_1', 'phase_2', 'phase_3', 'phase_4', 'phase_5'].includes(phase)) {
      return res.status(400).json({ message: 'Invalid phase value. Use phase_1 through phase_5' });
    }
    await pool.query(
      `INSERT INTO settings (setting_key, setting_value, group_name)
       VALUES ('event_phase', ?, 'event')
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [phase]
    );
    res.json({ message: `Event phase switched to ${phase}`, phase });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== AUDIT LOGS ==========
router.get('/audit-logs', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 200');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== VOTES EXPORT CSV ==========
router.get('/votes/export', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT v.id, v.voter_name, v.voter_email, v.voter_phone, v.ip_address, v.is_flagged, v.flag_reason,
             v.created_at, n.full_name AS nominee_name, c.name AS category_name
      FROM votes v
      JOIN nominees n ON v.nominee_id = n.id
      JOIN categories c ON v.category_id = c.id
      ORDER BY v.id DESC LIMIT 5000
    `);
    let csv = 'ID,Voter Name,Voter Email,Voter Phone,IP Address,Flagged,Flag Reason,Nominee,Category,Timestamp\n';
    rows.forEach((r) => {
      const line = [
        r.id,
        `"${(r.voter_name || '').replace(/"/g, '""')}"`,
        `"${(r.voter_email || '').replace(/"/g, '""')}"`,
        `"${(r.voter_phone || '').replace(/"/g, '""')}"`,
        `"${(r.ip_address || '').replace(/"/g, '""')}"`,
        r.is_flagged ? 'YES' : 'NO',
        `"${(r.flag_reason || '').replace(/"/g, '""')}"`,
        `"${(r.nominee_name || '').replace(/"/g, '""')}"`,
        `"${(r.category_name || '').replace(/"/g, '""')}"`,
        `"${r.created_at}"`,
      ].join(',');
      csv += line + '\n';
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="telugu-icon-votes.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;