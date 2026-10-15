require('dotenv').config();
const { pool } = require('../config/database');

async function run() {
  const newCats = [
    ['Best Vlogger of the Year', 'sn-vlogger-year', 'self_nomination', 'Excellence in vlogging, daily life and documentation.', 'video', 51, 1],
    ['Best Meme Creator', 'sn-meme-creator', 'self_nomination', 'Humour, satire and viral meme culture.', 'laugh', 52, 1],
    ['Best Fitness Creator', 'sn-fitness-creator', 'self_nomination', 'Health, fitness, workout and wellness guidance.', 'heart', 53, 1],
    ['Best Parenting Creator', 'sn-parenting-creator', 'self_nomination', 'Parenting, family dynamics and child development.', 'family', 54, 1],
    ['Best Couple Creator', 'sn-couple-creator', 'self_nomination', 'Relatable couple content and digital storytelling.', 'heart', 55, 1],
    ['Best Dance Creator', 'sn-dance-creator', 'self_nomination', 'Dance performance, choreography and rhythm.', 'music', 56, 1],
    ['Best Telugu-Language Creator', 'sn-telugu-language-creator', 'self_nomination', 'Celebrating Telugu language, literature and culture.', 'book', 57, 1],
    ['Best Social Impact Creator', 'sn-social-impact-creator', 'self_nomination', 'Content driving positive social change and community support.', 'sparkle', 58, 1],
    ['Best Automobile Creator', 'sn-automobile-creator', 'self_nomination', 'Automotive reviews, motorbikes, cars and mobility.', 'rocket', 59, 1],
    ['Best Micro Creator', 'sn-micro-creator', 'self_nomination', 'High engagement and authentic connection in micro communities.', 'star', 60, 1]
  ];

  for (const cat of newCats) {
    try {
      await pool.query(
        "INSERT INTO categories (name, slug, type, description, icon, sort_order, voting_open) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)",
        cat
      );
    } catch (e) {
      console.error('Error inserting category:', cat[0], e.message);
    }
  }

  // Update settings
  const settingsToUpdate = [
    ['event_name', 'Telugu Icon Digital & Influencer Awards 2026'],
    ['event_date', '2026-11-16 10:00:00'],
    ['event_venue', 'Shilpakala Vedika, Hyderabad'],
    ['contact_address', 'Shilpakala Vedika, Hitec City, Hyderabad, Telangana'],
    ['hero_headline', 'Telugu Icon'],
    ['hero_subheadline', 'Celebrating the creators, communities and digital voices shaping Telugu culture, influence and impact.'],
    ['event_tagline', 'The Telugu Digital Creator Celebration'],
    ['announcement', 'Self-nominations are now open for the Telugu Icon Digital & Influencer Awards 2026!']
  ];

  for (const [key, val] of settingsToUpdate) {
    try {
      await pool.query(
        "INSERT INTO settings (setting_key, setting_value, group_name) VALUES (?, ?, 'general') ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
        [key, val]
      );
    } catch (e) {
      console.error('Error updating setting:', key, e.message);
    }
  }

  const [countRes] = await pool.query("SELECT type, CAST(COUNT(*) AS SIGNED) AS count FROM categories GROUP BY type");
  console.log('Category Counts:', countRes);
  console.log('Finished updating database!');
  await pool.end();
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
