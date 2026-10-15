const router = require('express').Router();
const { pool } = require('../config/database');

// GET /api/media?type=
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    let sql = `SELECT id, item_type, title, description, url, thumbnail_url, source, published_date, sort_order
               FROM media_items WHERE is_published = 1`;
    const params = [];
    if (type) { sql += ' AND item_type = ?'; params.push(type); }
    sql += ' ORDER BY sort_order ASC, published_date DESC LIMIT 100';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/videos?category=
router.get('/videos', async (req, res) => {
  try {
    const { category } = req.query;
    let sql = `SELECT id, category, title, description, youtube_id, thumbnail_url, duration, sort_order
               FROM video_items WHERE is_published = 1`;
    const params = [];
    if (category) { sql += ' AND category = ?'; params.push(category); }
    sql += ' ORDER BY sort_order ASC, id DESC LIMIT 100';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
