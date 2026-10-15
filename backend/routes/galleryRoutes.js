const router = require('express').Router();
const { pool } = require('../config/database');

// GET /api/gallery?category=
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let sql = `SELECT id, category, item_type, url, thumbnail_url, title, description, sort_order
               FROM gallery_items WHERE is_published = 1`;
    const params = [];
    if (category) { sql += ' AND category = ?'; params.push(category); }
    sql += ' ORDER BY sort_order ASC, id DESC LIMIT 200';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/gallery/categories
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT category FROM gallery_items WHERE is_published = 1 ORDER BY category ASC`
    );
    res.json(rows.map(r => r.category));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
