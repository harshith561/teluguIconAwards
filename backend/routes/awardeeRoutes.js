const router = require('express').Router();
const { pool } = require('../config/database');

// GET /api/awardees?event_id=&year=&category=&name=
router.get('/', async (req, res) => {
  try {
    const { event_id, year, category, name } = req.query;
    let sql = `
      SELECT a.id, a.name, a.category, a.award_type, a.photo_url, a.bio, a.social_handle, a.year,
             pe.name AS event_name, pe.slug AS event_slug
      FROM awardees a
      JOIN past_events pe ON a.past_event_id = pe.id
      WHERE pe.is_published = 1
    `;
    const params = [];
    if (event_id) { sql += ' AND a.past_event_id = ?'; params.push(event_id); }
    if (year)     { sql += ' AND a.year = ?';           params.push(year); }
    if (category) { sql += ' AND a.category LIKE ?';   params.push(`%${category}%`); }
    if (name)     { sql += ' AND a.name LIKE ?';       params.push(`%${name}%`); }
    sql += ' ORDER BY a.year DESC, a.category ASC LIMIT 200';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/awardees/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, pe.name AS event_name, pe.slug AS event_slug
       FROM awardees a JOIN past_events pe ON a.past_event_id = pe.id WHERE a.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Awardee not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
