/**
 * setup-database.js
 * -----------------
 * Creates the MySQL database and applies backend/database/schema.sql.
 *
 * Connects WITHOUT selecting a database (so it can create one), runs the
 * schema file, then reports every table with its row count.
 *
 * Run:  npm run db:setup
 * Safe: the schema is idempotent, so re-running it will not wipe data.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'telugu_icon_awards';

async function run() {
  console.log(`Connecting to MySQL at ${DB_HOST}:${DB_PORT} as ${DB_USER}...`);

  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
    charset: 'utf8mb4_unicode_ci',
  });

  try {
    console.log('--- Step 1: Applying schema.sql ---');
    const schemaSql = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf-8');
    await conn.query(schemaSql);
    console.log(`✓ Schema applied to \`${DB_NAME}\`\n`);

    console.log('--- Step 2: Seeding demo content (only where tables are empty) ---');
    await seedDemoContent(conn);
    console.log('✓ Demo content ensured\n');

    console.log('--- Step 3: Verification ---');
    const [tables] = await conn.query(
      `SELECT table_name AS name
         FROM information_schema.tables
        WHERE table_schema = ?
        ORDER BY table_name ASC`,
      [DB_NAME]
    );

    const report = [];
    for (const { name } of tables) {
      try {
        const [rows] = await conn.query(`SELECT CAST(COUNT(*) AS SIGNED) AS count FROM \`${name}\``);
        report.push({ table: name, rows: rows[0].count, status: 'OK' });
      } catch (err) {
        report.push({ table: name, rows: 'N/A', status: 'ERROR: ' + err.message });
      }
    }
    console.table(report);

    console.log('\n======================================================');
    console.log(`✓ DATABASE READY: ${DB_NAME} @ ${DB_HOST}:${DB_PORT}`);
    console.log('======================================================\n');
  } finally {
    await conn.end();
  }
}

async function seedDemoContent(conn) {
  const isEmpty = async (table) => {
    const [rows] = await conn.query(`SELECT 1 AS present FROM \`${table}\` LIMIT 1`);
    return rows.length === 0;
  };

  const [cats] = await conn.query("SELECT id FROM categories WHERE type = 'self_nomination' ORDER BY sort_order ASC LIMIT 5");
  const catIds = cats.map((c) => c.id);

  if (catIds.length > 0 && await isEmpty('nominees')) {
    const sampleNominees = [
      { name: 'Prasad Tech in Telugu', handle: '@prasadtechintelugu', followers: 4200000, bio: 'Pioneering Telugu tech creator unboxing and reviewing modern gadgets.', code: 'TIA2026-001001', votes: 12450 },
      { name: 'Village Cooking Channel (Telugu)', handle: '@teluguvillagecooking', followers: 2800000, bio: 'Authentic traditional Andhra and Rayalaseema culinary journey.', code: 'TIA2026-001002', votes: 11200 },
      { name: 'Uma Telugu Traveller', handle: '@umatravels', followers: 1500000, bio: 'Exploring hidden global wonders and cultural heritage in Telugu.', code: 'TIA2026-001003', votes: 9840 },
      { name: 'Telugu Comedy Factory', handle: '@telugucomedyfactory', followers: 3100000, bio: 'Everyday relatable Telugu humor and family sketches.', code: 'TIA2026-001004', votes: 8900 },
      { name: 'FinWise Telugu', handle: '@finwisetelugu', followers: 1200000, bio: 'Simplifying stock markets, investments, and personal finance for youth.', code: 'TIA2026-001005', votes: 7600 },
    ];
    for (let i = 0; i < sampleNominees.length; i += 1) {
      const sn = sampleNominees[i];
      const slug = sn.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + (i + 1);
      await conn.query(
        `INSERT INTO nominees (category_id, full_name, slug, bio, social_handle, followers_count, featured, status, nominee_code, vote_count)
         VALUES (?, ?, ?, ?, ?, ?, 1, 'approved', ?, ?)
         ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)`,
        [catIds[i % catIds.length], sn.name, slug, sn.bio, sn.handle, sn.followers, sn.code, sn.votes]
      );
    }
    console.log('  - approved nominees');
  }

  if (await isEmpty('gallery_items')) {
    const samplePhotos = [
      { cat: 'telugu_icon_2026', url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1000&q=80', title: 'Grand Stage Preview', desc: 'Main stage setup at the venue' },
      { cat: 'telugu_icon_2026', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80', title: 'Lighting & Atmosphere', desc: 'World-class cinematic lighting and stage production' },
      { cat: 'stree_shakti_2025', url: 'https://images.unsplash.com/photo-1542744094-24638eff58bb?auto=format&fit=crop&w=1000&q=80', title: 'Stree Shakti Pratibha Gala', desc: 'Moments honoring women leaders and trailblazers' },
      { cat: 'press_events', url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1000&q=80', title: 'Press Meet Hyderabad', desc: 'Organizing committee announcement meet' },
    ];
    for (const p of samplePhotos) {
      await conn.query(
        "INSERT INTO gallery_items (category, item_type, url, title, description) VALUES (?, 'image', ?, ?, ?)",
        [p.cat, p.url, p.title, p.desc]
      );
    }
    console.log('  - gallery items');
  }

  if (await isEmpty('video_items')) {
    const sampleVideos = [
      { cat: 'event_highlights', title: 'Telugu Icon Awards 2026 Official Anthem & Teaser', duration: '2:45' },
      { cat: 'creator_stories', title: 'From Village Streets to 1M Subscribers: Creator Journey', duration: '5:12' },
      { cat: 'previous_events', title: 'Stree Shakti Pratibha Awards 2025 Grand Recap', duration: '8:30' },
    ];
    for (const v of sampleVideos) {
      await conn.query(
        'INSERT INTO video_items (category, title, youtube_id, duration) VALUES (?, ?, ?, ?)',
        [v.cat, v.title, 'dQw4w9WgXcQ', v.duration]
      );
    }
    console.log('  - video items');
  }

  if (await isEmpty('awardees')) {
    const [events] = await conn.query("SELECT id FROM past_events WHERE slug = 'stree-shakti-pratibha-awards-2025' LIMIT 1");
    if (events.length > 0) {
      const pastWinners = [
        { name: 'Dr. Sudha Rani', cat: 'Excellence in Healthcare & Rural Service', type: 'Pratibha Icon Award', year: 2025 },
        { name: 'Kavitha Reddy', cat: 'Women Entrepreneur of the Year', type: 'Winner', year: 2025 },
        { name: 'Shailaja V', cat: 'Social Impact in Education', type: 'Winner', year: 2025 },
      ];
      for (const pw of pastWinners) {
        await conn.query(
          'INSERT INTO awardees (past_event_id, name, category, award_type, year) VALUES (?, ?, ?, ?, ?)',
          [events[0].id, pw.name, pw.cat, pw.type, pw.year]
        );
      }
      console.log('  - past awardees');
    }
  }
}

run().catch((err) => {
  console.error('\nDatabase setup failed:', err.message);
  console.error('Check DB_HOST / DB_PORT / DB_USER / DB_PASSWORD in backend/.env');
  process.exit(1);
});