const router = require('express').Router();
const { pool } = require('../config/database');
const { cached } = require('../utils/cache');
const { hasColumn } = require('../utils/nomineeIdentity');

// Achievements + social URLs are optional add-on columns (see
// migration-nominee-pages.sql). Probe once so the public API still works on a
// database that has not been migrated yet.
let profileColumnsPromise = null;
async function profileColumns() {
  if (!profileColumnsPromise) {
    profileColumnsPromise = (async () => {
      const columns = [];
      for (const column of ['achievements', 'youtube_url', 'instagram_url', 'facebook_url', 'website_url', 'other_profile_url']) {
        // eslint-disable-next-line no-await-in-loop
        if (await hasColumn('nominees', column)) columns.push(column);
      }
      return columns;
    })();
  }
  return profileColumnsPromise;
}

router.get('/', async (req, res) => {
  try {
    const { category, status, featured } = req.query;
    const key = `nominees:${category || ''}|${status || ''}|${featured || ''}`;
    const extras = await profileColumns();
    const rows = await cached(key, 30, async () => {
      let sql = `SELECT n.id, n.full_name, n.slug, n.bio, n.photo_url, n.social_handle, n.followers_count,
                        n.featured, n.status, n.nominee_code, n.vote_count,
                        c.name AS category_name, c.slug AS category_slug${extras.map((c) => `, n.${c}`).join('')}
                 FROM nominees n JOIN categories c ON n.category_id = c.id WHERE 1=1`;
      const params = [];
      // Accept either a category slug or a numeric category id.
      if (category) { sql += ' AND (c.slug = ? OR CAST(c.id AS CHAR) = ?)'; params.push(category, String(category)); }
      if (status) { sql += ' AND n.status = ?'; params.push(status); }
      if (featured) { sql += ' AND n.featured = 1'; }
      sql += " AND n.status = 'approved' ORDER BY n.vote_count DESC, n.featured DESC, n.id ASC";
      const [rows] = await pool.query(sql, params);
      return rows;
    });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/featured', async (req, res) => {
  try {
    const rows = await cached('nominees:featured', 30, async () => {
      const [rows] = await pool.query(
        `SELECT n.id, n.full_name, n.slug, n.bio, n.photo_url, n.social_handle, n.followers_count,
                n.nominee_code, n.vote_count, c.name AS category_name
         FROM nominees n JOIN categories c ON n.category_id = c.id
         WHERE n.featured = 1 AND n.status = 'approved'
         ORDER BY n.vote_count DESC LIMIT 12`
      );
      return rows;
    });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const isNumeric = /^\d+$/.test(id);
    const rows = await cached(`nominee:${id}`, 30, async () => {
      let sql;
      let params;
      if (isNumeric) {
        // Try by numeric ID first, then fall back to slug
        sql = `SELECT n.*, c.name AS category_name, c.slug AS category_slug, c.description AS category_description, c.voting_open
               FROM nominees n JOIN categories c ON n.category_id = c.id
               WHERE (n.id = ? OR n.slug = ?) AND n.status = 'approved' LIMIT 1`;
        params = [parseInt(id, 10), id];
      } else {
        // Slug lookup
        sql = `SELECT n.*, c.name AS category_name, c.slug AS category_slug, c.description AS category_description, c.voting_open
               FROM nominees n JOIN categories c ON n.category_id = c.id
               WHERE n.slug = ? AND n.status = 'approved' LIMIT 1`;
        params = [id];
      }
      const [rows] = await pool.query(sql, params);
      return rows;
    });
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Nominee not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


module.exports = router;