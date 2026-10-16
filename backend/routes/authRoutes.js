const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'telugu_icon_awards_secret_key_2024_very_secure';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    // Record login in audit_logs with client IP and user_name
    let auditId = null;
    try {
      const forwarded = req.headers['x-forwarded-for'];
      let ip = forwarded ? forwarded.split(',')[0].trim() : (req.socket?.remoteAddress || req.ip || '127.0.0.1');
      if (ip === '::1' || ip === '::ffff:127.0.0.1') ip = '127.0.0.1';
      else if (ip && ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');

      const userName = user.name || user.email;
      const [auditRes] = await pool.query(
        `INSERT INTO audit_logs (admin_id, admin_email, user_name, action, entity_type, details, ip_address, created_at, logout_at)
         VALUES (?, ?, ?, 'LOGIN', 'Portal Access', 'Active portal session', ?, NOW(), NULL)`,
        [user.id, user.email, userName, ip]
      );
      auditId = auditRes.insertId;
    } catch (auditErr) {
      console.error('Failed to log login audit:', auditErr.message);
    }

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      audit_id: auditId,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message || 'Server error during login' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const { audit_id } = req.body || {};
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
    let userId = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (_) {}
    }

    if (audit_id && !isNaN(Number(audit_id))) {
      await pool.query(
        'UPDATE audit_logs SET logout_at = NOW(), details = "User logged out" WHERE id = ?',
        [Number(audit_id)]
      );
    } else if (userId) {
      await pool.query(
        `UPDATE audit_logs 
         SET logout_at = NOW(), details = "User logged out" 
         WHERE admin_id = ? AND logout_at IS NULL AND action = 'LOGIN'
         ORDER BY id DESC LIMIT 1`,
        [userId]
      );
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/me', async (req, res) => {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [rows] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [decoded.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user: rows[0] });
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
});

router.put('/change-password', async (req, res) => {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, user.id]);

    try {
      const forwarded = req.headers['x-forwarded-for'];
      let ip = forwarded ? forwarded.split(',')[0].trim() : (req.socket?.remoteAddress || req.ip || '127.0.0.1');
      if (ip === '::1' || ip === '::ffff:127.0.0.1') ip = '127.0.0.1';
      else if (ip && ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');

      await pool.query(
        `INSERT INTO audit_logs (admin_id, admin_email, user_name, action, entity_type, details, ip_address, created_at)
         VALUES (?, ?, ?, 'UPDATE_PASSWORD', 'Admin Security', 'Admin password changed', ?, NOW())`,
        [user.id, user.email, user.name || user.email, ip]
      );
    } catch (_) {}

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: error.message || 'Server error during password update' });
  }
});

module.exports = router;