const router = require('express').Router();
const { pool } = require('../config/database');
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const { cached, invalidate } = require('../utils/cache');

router.get('/', async (req, res) => {
  try {
    const rows = await cached('categories:all', 60, async () => {
      const [rows] = await pool.query(
        'SELECT id, name, slug, type, description, icon, sort_order, voting_open, poster_template, poster_theme_color, poster_badge_text, poster_tagline FROM categories ORDER BY sort_order ASC'
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
        "SELECT id, name, slug, description, icon, poster_template, poster_theme_color, poster_badge_text, poster_tagline FROM categories WHERE type = 'jury' ORDER BY sort_order ASC LIMIT 10"
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
        "SELECT id, name, slug, description, icon, poster_template, poster_theme_color, poster_badge_text, poster_tagline FROM categories WHERE type = 'self_nomination' ORDER BY sort_order ASC LIMIT 40"
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
        "SELECT id, name, slug, description, icon, poster_template, poster_theme_color, poster_badge_text, poster_tagline FROM categories WHERE type = 'jury' ORDER BY sort_order ASC LIMIT 10"
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
        "SELECT id, name, slug, description, icon, poster_template, poster_theme_color, poster_badge_text, poster_tagline FROM categories WHERE type = 'self_nomination' ORDER BY sort_order ASC LIMIT 40"
      );
      return rows;
    });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Category sponsors endpoint - returns active sponsors linked to this category
router.get('/:id/sponsors', async (req, res) => {
  try {
    const categoryId = req.params.id;
    const isNumeric = /^\d+$/.test(categoryId);
    let resolvedId = isNumeric ? parseInt(categoryId, 10) : null;

    if (!resolvedId) {
      const [cat] = await pool.query('SELECT id FROM categories WHERE slug = ? LIMIT 1', [categoryId]);
      if (cat.length > 0) resolvedId = cat[0].id;
    }

    if (!resolvedId) return res.status(404).json({ message: 'Category not found' });

    // Fetch category-mapped sponsors
    let [rows] = await pool.query(
      `SELECT cs.id AS association_id, cs.role, cs.sort_order AS display_order,
              s.id, s.id AS sponsor_id, s.name, s.tier, s.logo_url, s.website_url, s.tagline, COALESCE(s.is_active, 1) AS is_active
         FROM category_sponsors cs
         JOIN sponsors s ON cs.sponsor_id = s.id
        WHERE cs.category_id = ?
        ORDER BY cs.sort_order ASC, s.sort_order ASC, s.id ASC`,
      [resolvedId]
    );

    // Fetch all active global sponsors (Title Partner, Powered By, Co-Powered By, etc.)
    const [globalSpons] = await pool.query(
      `SELECT NULL AS association_id,
              CASE
                WHEN tier = 'title_partner' THEN 'Title Partner'
                WHEN tier = 'powered_by' THEN 'Powered By'
                WHEN tier = 'co_powered_by' THEN 'Co-Powered By'
                ELSE 'Official Partner'
              END AS role,
              sort_order AS display_order,
              id, id AS sponsor_id, name, tier, logo_url, website_url, tagline, is_active
         FROM sponsors
        WHERE is_active = 1
        ORDER BY CASE tier
          WHEN 'title_partner' THEN 1
          WHEN 'powered_by' THEN 2
          WHEN 'co_powered_by' THEN 3
          ELSE 4
        END ASC, sort_order ASC, id ASC`
    );

    // Merge: include all category sponsors + all global sponsors without duplicate sponsor IDs
    const combined = [...rows];
    for (const gs of globalSpons) {
      const exists = combined.some((r) => (r.sponsor_id || r.id) === gs.id);
      if (!exists) {
        combined.push(gs);
      }
    }

    // Sort by tier precedence: Title Partner > Powered By > Co-Powered By > Category Partner
    combined.sort((a, b) => {
      const tierRank = (t) => {
        if (t === 'title_partner') return 1;
        if (t === 'powered_by') return 2;
        if (t === 'co_powered_by') return 3;
        return 4;
      };
      return tierRank(a.tier) - tierRank(b.tier) || (a.sort_order || 0) - (b.sort_order || 0);
    });

    res.json(combined);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const rows = await cached(`category:${req.params.slug}`, 60, async () => {
      const [rows] = await pool.query(
        'SELECT id, name, slug, type, description, icon, sort_order, voting_open, poster_template, poster_theme_color, poster_badge_text, poster_tagline FROM categories WHERE slug = ? OR CAST(id AS CHAR) = ? LIMIT 1',
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
    const { name, slug, type, description, icon, voting_open, poster_template, poster_theme_color, poster_badge_text, poster_tagline } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ message: 'Name and slug are required' });
    }
    const [result] = await pool.query(
      'INSERT INTO categories (name, slug, type, description, icon, voting_open, poster_template, poster_theme_color, poster_badge_text, poster_tagline) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        name,
        slug,
        type || 'self_nomination',
        description || null,
        icon || null,
        voting_open === false ? 0 : 1,
        poster_template || 'gold_prestige',
        poster_theme_color || '#D4AF37',
        poster_badge_text || 'OFFICIAL NOMINEE',
        poster_tagline || null,
      ]
    );
    invalidate('categories:');
    res.status(201).json({ message: 'Category created', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { name, slug, type, description, icon, voting_open, sort_order, poster_template, poster_theme_color, poster_badge_text, poster_tagline } = req.body;
    await pool.query(
      `UPDATE categories SET
         name = COALESCE(?, name),
         slug = COALESCE(?, slug),
         type = COALESCE(?, type),
         description = COALESCE(?, description),
         icon = COALESCE(?, icon),
         voting_open = COALESCE(?, voting_open),
         sort_order = COALESCE(?, sort_order),
         poster_template = COALESCE(?, poster_template),
         poster_theme_color = COALESCE(?, poster_theme_color),
         poster_badge_text = COALESCE(?, poster_badge_text),
         poster_tagline = COALESCE(?, poster_tagline)
       WHERE id = ?`,
      [
        name,
        slug,
        type,
        description,
        icon,
        voting_open === undefined ? null : voting_open ? 1 : 0,
        sort_order,
        poster_template,
        poster_theme_color,
        poster_badge_text,
        poster_tagline,
        req.params.id,
      ]
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