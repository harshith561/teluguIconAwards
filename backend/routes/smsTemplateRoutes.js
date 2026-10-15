const router = require('express').Router();
const { pool } = require('../config/database');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.use(authenticate, authorizeAdmin);

// ---------------------------------------------
// Sender IDs (registered on the DLT platform / provider)
// ---------------------------------------------
router.get('/senders', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sms_senders ORDER BY id ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/senders', async (req, res) => {
  try {
    const { sender_id, name } = req.body;
    if (!sender_id || !String(sender_id).trim()) {
      return res.status(400).json({ message: 'Sender ID is required' });
    }
    const normalized = String(sender_id).trim().toUpperCase();
    if (!/^[A-Z0-9]{1,20}$/.test(normalized)) {
      return res.status(400).json({ message: 'Sender ID must be 1-20 uppercase letters/numbers' });
    }
    const [result] = await pool.query(
      'INSERT INTO sms_senders (sender_id, name) VALUES (?, ?)',
      [normalized, name || null]
    );
    res.status(201).json({ message: 'Sender ID added', id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'This Sender ID already exists' });
    }
    res.status(500).json({ message: error.message });
  }
});

router.delete('/senders/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM sms_senders WHERE id = ?', [req.params.id]);
    res.json({ message: 'Sender ID deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------------------------------------------
// SMS Templates
// ---------------------------------------------
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, sender_id, dlt_template_id, content, template_type, is_active, created_at, updated_at
       FROM sms_templates ORDER BY id DESC`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, sender_id, dlt_template_id, content, template_type } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Template name is required' });
    }
    if (!sender_id || !String(sender_id).trim()) {
      return res.status(400).json({ message: 'Please select a Sender ID' });
    }
    if (!dlt_template_id || !String(dlt_template_id).trim()) {
      return res.status(400).json({ message: 'DLT Template ID is required' });
    }
    const type = template_type === 'transactional' ? 'transactional' : 'otp';
    const [result] = await pool.query(
      'INSERT INTO sms_templates (name, sender_id, dlt_template_id, content, template_type, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [String(name).trim(), String(sender_id).trim(), String(dlt_template_id).trim(), content || null, type, 0]
    );
    res.status(201).json({ message: 'Template created', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const templateId = req.params.id;
    const { name, sender_id, dlt_template_id, content, template_type, is_active } = req.body;

    const [rows] = await pool.query('SELECT id FROM sms_templates WHERE id = ?', [templateId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const activeValue = is_active === undefined ? undefined : is_active ? 1 : 0;
    const type = template_type === 'transactional' ? 'transactional' : template_type === 'otp' ? 'otp' : undefined;

    if (activeValue === 1) {
      await pool.query('UPDATE sms_templates SET is_active = 0 WHERE id <> ?', [templateId]);
    }

    await pool.query(
      `UPDATE sms_templates SET
         name = COALESCE(?, name),
         sender_id = COALESCE(?, sender_id),
         dlt_template_id = COALESCE(?, dlt_template_id),
         content = COALESCE(?, content),
         template_type = COALESCE(?, template_type),
         is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        name ? String(name).trim() : null,
        sender_id ? String(sender_id).trim() : null,
        dlt_template_id ? String(dlt_template_id).trim() : null,
        content === undefined ? null : content,
        type || null,
        activeValue === undefined ? null : activeValue,
        templateId,
      ]
    );
    res.json({ message: 'Template updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM sms_templates WHERE id = ?', [req.params.id]);
    res.json({ message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;