const router = require('express').Router();
const { pool } = require('../config/database');
const crypto = require('crypto');

// GET /api/tickets/availability — public, never reveals inventory numbers
router.get('/availability', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, session, tier, price_paisa, availability, is_active FROM tickets ORDER BY session ASC, tier ASC`
    );
    // Map to public-safe shape: no inventory, no sold counts
    const publicRows = rows.map((r) => ({
      id: r.id,
      session: r.session,
      tier: r.tier,
      price_paisa: r.price_paisa,
      price_display: `₹${Math.round(r.price_paisa / 100).toLocaleString('en-IN')}`,
      availability: r.availability,  // 'available' | 'filling_fast' | 'almost_sold_out' | 'sold_out'
      is_active: r.is_active,
    }));
    res.json(publicRows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/tickets/book — create an order (mock payment for now)
router.post('/book', async (req, res) => {
  try {
    const { ticket_id, quantity, buyer_name, buyer_email, buyer_phone } = req.body;
    if (!ticket_id || !buyer_name || !buyer_email || !buyer_phone) {
      return res.status(400).json({ message: 'Missing required fields: ticket_id, buyer_name, buyer_email, buyer_phone' });
    }
    if (!/^[6-9]\d{9}$/.test(String(buyer_phone).replace(/\D/g, ''))) {
      return res.status(400).json({ message: 'Enter a valid 10-digit Indian mobile number.' });
    }

    const [ticketRows] = await pool.query('SELECT * FROM tickets WHERE id = ?', [ticket_id]);
    if (!ticketRows.length || !ticketRows[0].is_active) {
      return res.status(404).json({ message: 'Ticket type not found or not active.' });
    }
    const ticket = ticketRows[0];
    if (ticket.availability === 'sold_out') {
      return res.status(409).json({ message: 'This ticket type is sold out.' });
    }

    const qty = Math.min(Number(quantity) || 1, 5); // max 5 per booking
    const orderCode = 'TIA-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 9999);
    const qrToken = crypto.randomBytes(32).toString('hex');
    const foodEntitlement = ticket.session === 1 ? 'lunch' : 'dinner';

    const [result] = await pool.query(
      `INSERT INTO ticket_orders (order_code, ticket_id, session, tier, quantity, price_paisa, buyer_name, buyer_email, buyer_phone, payment_status, qr_token, food_entitlement)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?)`,
      [orderCode, ticket.id, ticket.session, ticket.tier, qty, ticket.price_paisa * qty, buyer_name.trim(), buyer_email.trim().toLowerCase(), buyer_phone.replace(/\D/g,''), qrToken, foodEntitlement]
    );

    // Update sold count
    await pool.query('UPDATE tickets SET sold = sold + ? WHERE id = ?', [qty, ticket_id]);

    // Update availability status based on ratio
    const newSold = ticket.sold + qty;
    let newAvail = 'available';
    const ratio = newSold / ticket.inventory;
    if (ratio >= 1) newAvail = 'sold_out';
    else if (ratio >= 0.85) newAvail = 'almost_sold_out';
    else if (ratio >= 0.60) newAvail = 'filling_fast';
    await pool.query("UPDATE tickets SET availability = ? WHERE id = ?", [newAvail, ticket_id]);

    res.status(201).json({
      message: 'Booking confirmed!',
      order_code: orderCode,
      qr_token: qrToken,
      session: ticket.session,
      tier: ticket.tier,
      quantity: qty,
      food_entitlement: foodEntitlement,
      buyer_name,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tickets/order/:qr_token — retrieve ticket by QR token (for digital ticket view & gate scanner)
router.get('/order/:qr_token', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, order_code, session, tier, quantity, price_paisa, buyer_name, buyer_email,
              buyer_phone, payment_status, qr_token, is_checked_in, checked_in_at, food_entitlement, created_at
       FROM ticket_orders WHERE qr_token = ?`,
      [req.params.qr_token]
    );
    if (!rows.length) return res.status(404).json({ message: 'Ticket not found' });
    // Never expose buyer_email/phone fully on public ticket — mask them
    const t = rows[0];
    res.json({
      ...t,
      buyer_email: t.buyer_email.replace(/(.{2}).+(@.+)/, '$1****$2'),
      buyer_phone: t.buyer_phone.replace(/^(\d{2})\d{6}(\d{2})$/, '$1******$2'),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/tickets/verify-entry — gate scanner endpoint (protected by basic secret header)
router.post('/verify-entry', async (req, res) => {
  try {
    const { qr_token } = req.body;
    if (!qr_token) return res.status(400).json({ message: 'qr_token is required' });

    // The QR encodes the bare token today. Be tolerant if a scanner hands back
    // a whole URL (or a token with whitespace / tracking appended) instead of
    // failing an attendee at the gate: pull the 64-hex token out of the string.
    const scanned = String(qr_token).trim();
    const token = /^[0-9a-f]{64}$/i.test(scanned)
      ? scanned
      : (scanned.match(/[0-9a-f]{64}/i) || [scanned])[0];

    const [rows] = await pool.query('SELECT * FROM ticket_orders WHERE qr_token = ?', [token]);
    if (!rows.length) return res.status(404).json({ valid: false, message: 'Invalid ticket' });
    const order = rows[0];
    if (order.payment_status !== 'paid') return res.json({ valid: false, message: 'Payment not confirmed' });
    if (order.is_checked_in) {
      return res.json({ valid: false, already_used: true, message: 'Ticket already checked in', buyer_name: order.buyer_name, checked_in_at: order.checked_in_at });
    }
    await pool.query("UPDATE ticket_orders SET is_checked_in = 1, checked_in_at = NOW() WHERE id = ?", [order.id]);
    res.json({
      valid: true,
      message: 'Entry granted',
      buyer_name: order.buyer_name,
      session: order.session,
      tier: order.tier,
      food_entitlement: order.food_entitlement,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
