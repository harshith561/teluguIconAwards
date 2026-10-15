/**
 * fix-mock-data.js
 * ----------------
 * Removes ALL seeded/mock data from:
 *   - gallery_items  (4 Unsplash photos seeded by setup-database.js)
 *   - past_events    (2 seed events: Telugu Icon Awards 2026, Stree Shakti 2025)
 *
 * Safe: only deletes rows whose URLs are from unsplash.com or whose slugs
 * match the known seed slugs. Real data entered by the admin is left intact.
 *
 * Run:  node scripts/fix-mock-data.js
 */

require('dotenv').config();
const { pool } = require('../config/database');

async function main() {
  const conn = await pool.getConnection();
  console.log('Connected to MySQL.\n');

  // ── 1. Gallery: delete all Unsplash mock images ──────────────────────────────
  const [galleryBefore] = await conn.query('SELECT id, title, url FROM gallery_items ORDER BY id');
  console.log(`Gallery items BEFORE: ${galleryBefore.length}`);
  galleryBefore.forEach((r) => console.log(`  [${r.id}] ${r.title} | ${String(r.url).substring(0, 60)}...`));

  const [galDel] = await conn.query("SELECT id, title FROM gallery_items WHERE url LIKE '%unsplash.com%'");
  if (galDel.length > 0) {
    await conn.query("DELETE FROM gallery_items WHERE url LIKE '%unsplash.com%'");
  }
  console.log(`\nDeleted ${galDel.length} mock gallery item(s):`);
  galDel.forEach((r) => console.log(`  - [${r.id}] ${r.title}`));

  // ── 2. Past Events: delete known seed slugs ────────────────────────────────
  const [eventsBefore] = await conn.query('SELECT id, slug, name FROM past_events ORDER BY id');
  console.log(`\nPast events BEFORE: ${eventsBefore.length}`);
  eventsBefore.forEach((r) => console.log(`  [${r.id}] ${r.slug} | ${r.name}`));

  const seedSlugs = ['telugu-icon-awards-2026', 'stree-shakti-pratibha-awards-2025'];
  const [evDel] = await conn.query(
    `SELECT id, slug, name FROM past_events WHERE slug IN (${seedSlugs.map(() => '?').join(',')})`,
    seedSlugs
  );
  if (evDel.length > 0) {
    await conn.query(
      `DELETE FROM past_events WHERE slug IN (${seedSlugs.map(() => '?').join(',')})`,
      seedSlugs
    );
  }
  console.log(`\nDeleted ${evDel.length} mock past event(s):`);
  evDel.forEach((r) => console.log(`  - [${r.id}] ${r.slug} | ${r.name}`));

  // ── 3. Summary ─────────────────────────────────────────────────────────────
  const [galAfter] = await conn.query('SELECT CAST(COUNT(*) AS SIGNED) AS c FROM gallery_items');
  const [evAfter] = await conn.query('SELECT CAST(COUNT(*) AS SIGNED) AS c FROM past_events');
  console.log(`\nGallery items remaining : ${galAfter[0].c}`);
  console.log(`Past events remaining   : ${evAfter[0].c}`);
  console.log('\nDone. All mock/seed data removed from database.');

  conn.release();
  await pool.end();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});