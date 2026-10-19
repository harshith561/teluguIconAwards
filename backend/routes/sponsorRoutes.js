const router = require('express').Router();
const { pool } = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, tier, image_id,
              COALESCE(CASE WHEN image_id IS NOT NULL THEN CONCAT('/api/images/', image_id, '/file') ELSE NULL END, logo_url) AS logo_url,
              website_url, tagline
       FROM sponsors
       WHERE is_active = 1
       ORDER BY sort_order ASC, id ASC`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/by-tier', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, tier, image_id,
              COALESCE(CASE WHEN image_id IS NOT NULL THEN CONCAT('/api/images/', image_id, '/file') ELSE NULL END, logo_url) AS logo_url,
              website_url, tagline
       FROM sponsors
       WHERE is_active = 1
       ORDER BY tier ASC, sort_order ASC, id ASC`
    );
    const grouped = rows.reduce((acc, sponsor) => {
      if (!acc[sponsor.tier]) acc[sponsor.tier] = [];
      acc[sponsor.tier].push(sponsor);
      return acc;
    }, {});
    res.json(grouped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;