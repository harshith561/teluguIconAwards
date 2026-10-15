const router = require('express').Router();
const { pool } = require('../config/database');
const { cached, invalidate } = require('../utils/cache');

router.get('/', async (req, res) => {
  try {
    const rows = await cached('settings:all', 60, async () => {
      const [rows] = await pool.query('SELECT setting_key, setting_value, group_name FROM settings');
      return rows;
    });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:key', async (req, res) => {
  try {
    const rows = await cached(`settings:key:${req.params.key}`, 60, async () => {
      const [rows] = await pool.query('SELECT setting_value FROM settings WHERE setting_key = ?', [req.params.key]);
      return rows;
    });
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Setting not found' });
    }
    res.json({ key: req.params.key, value: rows[0].setting_value });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
module.exports.invalidate = (prefix) => invalidate(prefix);