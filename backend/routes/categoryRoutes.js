const router = require('express').Router();
const { pool } = require('../config/database');
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const { cached, invalidate } = require('../utils/cache');

router.get('/', async (req, res) => {
  try {
    const rows = await cached('categories:all', 60, async () => {
      const [rows] = await pool.query(
        'SELECT id, name, slug, type, description, icon, sort_order, voting_open FROM categories ORDER BY sort_order ASC'
      );
      return rows;
    });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/jury', async (req, res) => {
  try {
    const rows = await cached('categories:jury', 60, async () => {
      const [rows] = await pool.query(
        "SELECT id, name, slug, description, icon FROM categories WHERE type = 'jury' ORDER BY sort_order ASC LIMIT 10"
      );
      return rows;
    });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/self-nomination', async (req, res) => {
  try {
    const rows = await cached('categories:self', 60, async () => {
      const [rows] = await pool.query(
        "SELECT id, name, slug, description, icon FROM categories WHERE type = 'self_nomination' ORDER BY sort_order ASC LIMIT 40"
      );
      return rows;
    });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Aliases matching the documented API: /curated == /jury, /peoples-choice == /self-nomination
router.get('/curated', async (req, res) => {
  try {
    const rows = await cached('categories:curated', 60, async () => {
      const [rows] = await pool.query(
        "SELECT id, name, slug, description, icon FROM categories WHERE type = 'jury' ORDER BY sort_order ASC LIMIT 10"
      );
      return rows;
    });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/peoples-choice', async (req, res) => {
  try {
    const rows = await cached('categories:peoples-choice', 60, async () => {
      const [rows] = await pool.query(
        "SELECT id, name, slug, description, icon FROM categories WHERE type = 'self_nomination' ORDER BY sort_order ASC LIMIT 40"
      );
      return rows;
    });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const rows = await cached(`category:${req.params.slug}`, 60, async () => {
      const [rows] = await pool.query(
        'SELECT id, name, slug, type, description, icon, sort_order, voting_open FROM categories WHERE slug = ? OR CAST(id AS CHAR) = ? LIMIT 1',
        [req.params.slug, req.params.slug]
      );
      return rows;
    });
    if (!rows.length) return res.status(404).json({ message: 'Category not found' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { name, slug, type, description, icon, voting_open } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ message: 'Name and slug are required' });
    }
    const [result] = await pool.query(
      'INSERT INTO categories (name, slug, type, description, icon, voting_open) VALUES (?, ?, ?, ?, ?, ?)',
      [name, slug, type || 'self_nomination', description || null, icon || null, voting_open === false ? 0 : 1]
    );
    invalidate('categories:');
    res.status(201).json({ message: 'Category created', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { name, slug, type, description, icon, voting_open, sort_order } = req.body;
    await pool.query(
      'UPDATE categories SET name = COALESCE(?, name), slug = COALESCE(?, slug), type = COALESCE(?, type), description = COALESCE(?, description), icon = COALESCE(?, icon), voting_open = COALESCE(?, voting_open), sort_order = COALESCE(?, sort_order) WHERE id = ?',
      [name, slug, type, description, icon, voting_open === undefined ? null : voting_open ? 1 : 0, sort_order, req.params.id]
    );
    invalidate('categories:');
    res.json({ message: 'Category updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    invalidate('categories:');
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;