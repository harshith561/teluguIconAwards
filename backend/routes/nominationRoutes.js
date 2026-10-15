const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { pool } = require('../config/database');

const fs = require('fs');
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'nomination-' + unique + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/i;
    if (allowed.test(path.extname(file.originalname))) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// SELF-NOMINATION ONLY — creators submit their own profile.
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const {
      category_id, full_name, creator_name, email, phone, city, state,
      primary_platform, youtube_url, instagram_url, facebook_url,
      other_profile_url, website_url, journey, achievements, support_links,
    } = req.body;

    let catIds = [];
    if (req.body.category_ids) {
      if (Array.isArray(req.body.category_ids)) {
        catIds = req.body.category_ids.map(Number).filter(Boolean);
      } else if (typeof req.body.category_ids === 'string') {
        try {
          const parsed = JSON.parse(req.body.category_ids);
          catIds = Array.isArray(parsed) ? parsed.map(Number).filter(Boolean) : [Number(req.body.category_ids)].filter(Boolean);
        } catch {
          catIds = req.body.category_ids.split(',').map(s => Number(s.trim())).filter(Boolean);
        }
      }
    } else if (category_id) {
      catIds = [Number(category_id)].filter(Boolean);
    }

    if (catIds.length === 0) {
      return res.status(400).json({ message: 'Please select at least 1 category (up to 3 maximum)' });
    }
    if (catIds.length > 3) {
      return res.status(400).json({ message: 'Each creator may self-nominate in a maximum of 3 categories only' });
    }
    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ message: 'Full name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email address is required' });
    }
    if (!phone || !/^[0-9+\-\s]{10,15}$/.test(String(phone).trim())) {
      return res.status(400).json({ message: 'Please provide a valid mobile number' });
    }

    // Verify all selected categories are self_nomination
    const placeholders = catIds.map(() => '?').join(',');
    const [catRows] = await pool.query(
      `SELECT id, name FROM categories WHERE id IN (${placeholders}) AND type = 'self_nomination'`,
      catIds
    );
    if (catRows.length !== catIds.length) {
      return res.status(400).json({ message: 'One or more selected categories are not eligible for self-nomination' });
    }

    const [nomOpen] = await pool.query(
      "SELECT setting_value FROM settings WHERE setting_key = 'nominations_open'"
    );
    if (nomOpen.length > 0 && String(nomOpen[0].setting_value) === '0') {
      return res.status(400).json({ message: 'Nominations are currently closed' });
    }

    const photo_url = req.file ? ('/uploads/' + req.file.filename) : null;
    const insertedCodes = [];
    let primaryId = null;

    for (const cId of catIds) {
      const [result] = await pool.query(
        `INSERT INTO nominations
          (category_id, full_name, creator_name, email, phone, city, state,
           primary_platform, youtube_url, instagram_url, facebook_url,
           other_profile_url, website_url, photo_url, journey, achievements, support_links)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [cId, full_name.trim(), creator_name || full_name.trim(), email.trim(), phone.trim(),
         city || null, state || null, primary_platform || null,
         youtube_url || null, instagram_url || null, facebook_url || null,
         other_profile_url || null, website_url || null, photo_url,
         journey || null, achievements || null, support_links || null]
      );

      const nomId = result.insertId;
      if (!primaryId) primaryId = nomId;
      const code = 'TIA2026-' + String(nomId).padStart(6, '0');
      await pool.query('UPDATE nominations SET nomination_code = ? WHERE id = ?', [code, nomId]);
      insertedCodes.push(code);
    }

    res.status(201).json({
      message: 'Your self-nomination has been submitted successfully!',
      nomination_code: insertedCodes[0],
      nomination_codes: insertedCodes,
      id: primaryId,
    });
  } catch (error) {
    console.error('Nomination error:', error.message);
    res.status(500).json({ message: 'Failed to submit nomination' });
  }
});

module.exports = router;