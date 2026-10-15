const router = require('express').Router();
const { pool } = require('../config/database');

// GET /api/past-events
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, slug, name, event_date, year, venue, description, poster_url, sort_order
       FROM past_events WHERE is_published = 1 ORDER BY sort_order ASC, year DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/past-events/:slug
router.get('/:slug', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM past_events WHERE slug = ? AND is_published = 1`,
      [req.params.slug]
    );
    if (!rows.length) return res.status(404).json({ message: 'Past event not found' });
    const event = rows[0];

    // Fetch awardees for this event
    const [awardees] = await pool.query(
      `SELECT id, name, category, award_type, photo_url, bio, social_handle, year
       FROM awardees WHERE past_event_id = ? ORDER BY category ASC`,
      [event.id]
    );
    event.awardees = awardees;
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
