require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../config/database');

async function testAPIs() {
  console.log('Testing Database Operations via Application Pool...');

  try {
    // 1. Categories
    const [cats] = await pool.query('SELECT CAST(COUNT(*) AS SIGNED) as count FROM categories');
    console.log(`✓ Categories Table: ${cats[0].count} categories found.`);

    // 2. Tickets
    const [tickets] = await pool.query('SELECT session, tier, price_paisa, availability FROM tickets ORDER BY session, tier');
    console.log(`✓ Tickets Config: ${tickets.length} tier configurations loaded:`);
    tickets.forEach(t => console.log(`   • Session ${t.session} [${t.tier.toUpperCase()}]: ₹${t.price_paisa / 100} (${t.availability})`));

    // 3. Past Events
    const [events] = await pool.query('SELECT slug, name, year FROM past_events');
    console.log(`✓ Past Events: ${events.length} events loaded:`);
    events.forEach(e => console.log(`   • ${e.name} (${e.year}) [slug: ${e.slug}]`));

    // 4. Gallery Items
    const [gallery] = await pool.query('SELECT CAST(COUNT(*) AS SIGNED) as count FROM gallery_items');
    console.log(`✓ Gallery Items: ${gallery[0].count} items found.`);

    // 5. Settings
    const [settings] = await pool.query('SELECT setting_key, setting_value FROM settings WHERE setting_key IN (?, ?, ?)', ['event_date', 'event_venue', 'event_phase']);
    console.log('✓ Core Settings:');
    settings.forEach(s => console.log(`   • ${s.setting_key} = ${s.setting_value}`));

    // 6. Test insert & rollback for sponsor lead
    const [leadRes] = await pool.query(`
      INSERT INTO sponsor_leads (company, contact_person, mobile, email, industry, message)
      VALUES (?, ?, ?, ?, ?, ?)
    `, ['Test Brand Ltd', 'Test Lead', '9876543210', 'test@brand.com', 'Tech', 'Automated test enquiry']);
    console.log(`✓ Sponsor Leads Insert test passed (ID: ${leadRes.insertId})`);

    // Clean up test row
    await pool.query('DELETE FROM sponsor_leads WHERE email = ?', ['test@brand.com']);
    console.log('✓ Cleanup completed.');

    console.log('\n=================================================');
    console.log('✓ ALL BACKEND DATABASE WORKFLOWS OPERATIONAL!');
    console.log('=================================================\n');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('API test failed:', err);
    process.exit(1);
  }
}

testAPIs();
