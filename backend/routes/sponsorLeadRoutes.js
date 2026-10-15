const router = require('express').Router();
const { pool } = require('../config/database');

// POST /api/sponsor-leads — "Become a Partner" lead capture
router.post('/', async (req, res) => {
  try {
    const { company, contact_person, mobile, email, industry, package_interest, message } = req.body;
    if (!company || !contact_person || !mobile || !email) {
      return res.status(400).json({ message: 'Company, Contact Person, Mobile and Email are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    await pool.query(
      `INSERT INTO sponsor_leads (company, contact_person, mobile, email, industry, package_interest, message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [company.trim(), contact_person.trim(), mobile.trim(), email.trim().toLowerCase(),
       industry || null, package_interest || null, message || null]
    );
    res.status(201).json({ message: 'Partnership enquiry submitted! Our team will contact you shortly.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
