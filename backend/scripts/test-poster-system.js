const { pool } = require('../config/database');

async function runTests() {
  console.log('========================================================================');
  console.log('RUNNING AUTOMATED TEST SUITE: CATEGORY POSTER & SPONSOR GENERATION SYSTEM');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  const conn = await pool.getConnection();

  try {
    // -------------------------------------------------------------------------
    // Setup test categories
    // Category 1: Gold Prestige (No sponsors)
    // Category 2: Royal Amethyst (One sponsor)
    // Category 3: Emerald Grandeur (Multiple sponsors: 2 sponsors)
    // -------------------------------------------------------------------------
    console.log('Test 1: Setting up Test Categories with distinct Templates & Colors...');
    
    // Ensure test categories exist or use existing ones
    const [existingCats] = await conn.query('SELECT id, name FROM categories ORDER BY id ASC LIMIT 3');
    assert(existingCats.length >= 3, 'Found at least 3 categories in database for testing');

    const catA = existingCats[0];
    const catB = existingCats[1];
    const catC = existingCats[2];

    // Configure distinct templates
    await conn.query(
      "UPDATE categories SET poster_template = 'gold_prestige', poster_theme_color = '#D4AF37', poster_badge_text = 'OFFICIAL NOMINEE', poster_tagline = 'Excellence in Digital Awards' WHERE id = ?",
      [catA.id]
    );
    await conn.query(
      "UPDATE categories SET poster_template = 'royal_amethyst', poster_theme_color = '#C084FC', poster_badge_text = 'TOP INFLUENCER', poster_tagline = 'The Voice of Entertainment' WHERE id = ?",
      [catB.id]
    );
    await conn.query(
      "UPDATE categories SET poster_template = 'emerald_grandeur', poster_theme_color = '#10B981', poster_badge_text = 'FINALIST 2026', poster_tagline = 'Innovators & Pioneers' WHERE id = ?",
      [catC.id]
    );

    const [updatedCats] = await conn.query(
      'SELECT id, name, poster_template, poster_theme_color, poster_badge_text FROM categories WHERE id IN (?, ?, ?)',
      [catA.id, catB.id, catC.id]
    );
    assert(updatedCats.find(c => c.id === catA.id)?.poster_template === 'gold_prestige', `Category A (${catA.id}) has gold_prestige template`);
    assert(updatedCats.find(c => c.id === catB.id)?.poster_template === 'royal_amethyst', `Category B (${catB.id}) has royal_amethyst template`);
    assert(updatedCats.find(c => c.id === catC.id)?.poster_template === 'emerald_grandeur', `Category C (${catC.id}) has emerald_grandeur template`);

    // -------------------------------------------------------------------------
    // Setup test sponsors
    // Sponsor 1: has logo
    // Sponsor 2: has logo
    // Sponsor 3: missing logo (for missing logo test)
    // -------------------------------------------------------------------------
    console.log('\nTest 2: Setting up Test Sponsors (with and without logos)...');
    
    // Clear any previous test sponsors
    await conn.query("DELETE FROM sponsors WHERE name LIKE 'TEST_SPONSOR_%'");

    const [sp1Res] = await conn.query(
      "INSERT INTO sponsors (name, tier, logo_url, tagline, is_active) VALUES ('TEST_SPONSOR_ALPHA', 'title_partner', '/brand/logo-md.jpg', 'Empowering Creators', 1)"
    );
    const [sp2Res] = await conn.query(
      "INSERT INTO sponsors (name, tier, logo_url, tagline, is_active) VALUES ('TEST_SPONSOR_BETA', 'gold', '/brand/logo-sm.jpg', 'Digital Growth Partner', 1)"
    );
    const [sp3Res] = await conn.query(
      "INSERT INTO sponsors (name, tier, logo_url, tagline, is_active) VALUES ('TEST_SPONSOR_NOLOGO', 'silver', NULL, 'Typographic Partner', 1)"
    );

    const spAlphaId = sp1Res.insertId;
    const spBetaId = sp2Res.insertId;
    const spNoLogoId = sp3Res.insertId;

    assert(spAlphaId && spBetaId && spNoLogoId, 'Created test sponsors (Alpha with logo, Beta with logo, NoLogo with NULL logo)');

    // -------------------------------------------------------------------------
    // Test Category-Sponsor Associations
    // Cat A: 0 sponsors (clean/none)
    // Cat B: 1 sponsor (Alpha)
    // Cat C: 2 sponsors (Beta & NoLogo)
    // -------------------------------------------------------------------------
    console.log('\nTest 3: Configuring Category-Wise Sponsors (0, 1, and Multiple sponsors)...');

    // Clean existing links for test categories
    await conn.query('DELETE FROM category_sponsors WHERE category_id IN (?, ?, ?)', [catA.id, catB.id, catC.id]);

    // Link 1 sponsor to Cat B
    await conn.query(
      "INSERT INTO category_sponsors (category_id, sponsor_id, role, sort_order) VALUES (?, ?, 'Powered By', 1)",
      [catB.id, spAlphaId]
    );

    // Link 2 sponsors to Cat C (Multiple sponsors)
    await conn.query(
      "INSERT INTO category_sponsors (category_id, sponsor_id, role, sort_order) VALUES (?, ?, 'Category Partner', 1), (?, ?, 'Associate Partner', 2)",
      [catC.id, spBetaId, catC.id, spNoLogoId]
    );

    // Query Category A sponsors (0 sponsors)
    const [catASpons] = await conn.query('SELECT s.*, cs.role FROM category_sponsors cs JOIN sponsors s ON cs.sponsor_id = s.id WHERE cs.category_id = ?', [catA.id]);
    assert(catASpons.length === 0, `Category A (${catA.name}) has exactly 0 sponsors (no sponsors case)`);

    // Query Category B sponsors (1 sponsor)
    const [catBSpons] = await conn.query('SELECT s.*, cs.role FROM category_sponsors cs JOIN sponsors s ON cs.sponsor_id = s.id WHERE cs.category_id = ?', [catB.id]);
    assert(catBSpons.length === 1 && catBSpons[0].name === 'TEST_SPONSOR_ALPHA', `Category B (${catB.name}) has exactly 1 sponsor: ${catBSpons[0]?.name}`);

    // Query Category C sponsors (Multiple sponsors)
    const [catCSpons] = await conn.query('SELECT s.*, cs.role FROM category_sponsors cs JOIN sponsors s ON cs.sponsor_id = s.id WHERE cs.category_id = ? ORDER BY cs.sort_order ASC', [catC.id]);
    assert(catCSpons.length === 2, `Category C (${catC.name}) has exactly 2 sponsors (multiple sponsors case)`);
    assert(catCSpons[0].name === 'TEST_SPONSOR_BETA' && catCSpons[1].name === 'TEST_SPONSOR_NOLOGO', 'Category C sponsors have correct ordering and roles');

    // -------------------------------------------------------------------------
    // Test Category Isolation
    // Verify that Category B sponsors do NOT leak into Category A or Category C!
    // -------------------------------------------------------------------------
    console.log('\nTest 4: Verifying Strict Category Sponsor Isolation...');
    const catAHasAlpha = catASpons.some(s => s.id === spAlphaId);
    const catCHasAlpha = catCSpons.some(s => s.id === spAlphaId);
    assert(!catAHasAlpha && !catCHasAlpha, 'Sponsor Alpha (attached ONLY to Category B) does NOT appear in Category A or Category C');

    // -------------------------------------------------------------------------
    // Setup Test Nominees
    // Nominee 1 in Cat A: with photo
    // Nominee 2 in Cat A: missing photo
    // Nominee 3 in Cat B: with long name & Telugu / special characters
    // Nominee 4 in Cat C: multiple sponsors category
    // -------------------------------------------------------------------------
    console.log('\nTest 5: Testing Nominees across Categories, Photos, and Long Names...');
    
    // Clean old test nominees
    await conn.query("DELETE FROM nominees WHERE full_name LIKE 'TEST_NOMINEE_%'");

    const [n1] = await conn.query(
      `INSERT INTO nominees (category_id, full_name, slug, nominee_code, photo_url, status)
       VALUES (?, 'TEST_NOMINEE_PHOTO', 'test-nominee-photo', 'TIC26-T001', '/brand/logo-sm.jpg', 'approved')`,
      [catA.id]
    );

    const [n2] = await conn.query(
      `INSERT INTO nominees (category_id, full_name, slug, nominee_code, photo_url, status)
       VALUES (?, 'TEST_NOMINEE_NOPHOTO', 'test-nominee-nophoto', 'TIC26-T002', NULL, 'approved')`,
      [catA.id]
    );

    const [n3] = await conn.query(
      `INSERT INTO nominees (category_id, full_name, slug, nominee_code, photo_url, status)
       VALUES (?, 'TEST_NOMINEE_Sri Venkata Satyanarayana Murthy & Friends (తెలుగు ఐకాన్)', 'test-nominee-longname', 'TIC26-T003', '/brand/logo-md.jpg', 'approved')`,
      [catB.id]
    );

    const [n4] = await conn.query(
      `INSERT INTO nominees (category_id, full_name, slug, nominee_code, photo_url, status)
       VALUES (?, 'TEST_NOMINEE_CAT_C', 'test-nominee-cat-c', 'TIC26-T004', '/brand/logo-sm.jpg', 'approved')`,
      [catC.id]
    );

    // Verify Nominee 1: Cat A, with photo
    const [nom1Data] = await conn.query('SELECT * FROM nominees WHERE id = ?', [n1.insertId]);
    assert(nom1Data[0].photo_url !== null, 'Nominee 1 has photo URL verified');

    // Verify Nominee 2: Cat A, missing photo
    const [nom2Data] = await conn.query('SELECT * FROM nominees WHERE id = ?', [n2.insertId]);
    assert(nom2Data[0].photo_url === null, 'Nominee 2 has NULL photo (graceful monogram crest fallback)');

    // Verify Nominee 3: Cat B, long name & special characters
    const [nom3Data] = await conn.query('SELECT * FROM nominees WHERE id = ?', [n3.insertId]);
    assert(nom3Data[0].full_name.includes('తెలుగు ఐకాన్'), 'Nominee 3 preserves Telugu unicode characters and long name');

    // -------------------------------------------------------------------------
    // Test Nominee Poster Data Resolution
    // Verify each nominee receives their correct category template, sponsors,
    // and validation flags without mixing!
    // -------------------------------------------------------------------------
    console.log('\nTest 6: Validating Nominee Poster Data Resolution...');

    // Function to simulate /api/nominees/:id/poster-data logic
    async function resolvePosterData(nomineeId) {
      const [noms] = await conn.query(
        `SELECT n.id, n.full_name, n.slug, n.photo_url, n.nominee_code, n.category_id,
                c.name AS category_name, c.slug AS category_slug,
                c.poster_template, c.poster_theme_color, c.poster_badge_text, c.poster_tagline
           FROM nominees n
           JOIN categories c ON n.category_id = c.id
          WHERE n.id = ?`,
        [nomineeId]
      );
      if (!noms.length) return null;
      const nom = noms[0];

      const [spons] = await conn.query(
        `SELECT cs.role, s.id, s.name, s.logo_url
           FROM category_sponsors cs
           JOIN sponsors s ON cs.sponsor_id = s.id
          WHERE cs.category_id = ? AND s.is_active = 1
          ORDER BY cs.sort_order ASC`,
        [nom.category_id]
      );

      const warnings = [];
      if (!nom.photo_url) warnings.push('Missing photo');
      spons.forEach(s => {
        if (!s.logo_url) warnings.push(`Missing logo for ${s.name}`);
      });

      return { nominee: nom, sponsors: spons, warnings };
    }

    const res1 = await resolvePosterData(n1.insertId);
    assert(res1.nominee.poster_template === 'gold_prestige', 'Nominee 1 receives Category A Gold Prestige template');
    assert(res1.sponsors.length === 0, 'Nominee 1 has 0 sponsors (Category A)');
    assert(res1.warnings.length === 0, 'Nominee 1 has 0 warnings');

    const res2 = await resolvePosterData(n2.insertId);
    assert(res2.warnings.includes('Missing photo'), 'Nominee 2 correctly triggers "Missing photo" warning');

    const res3 = await resolvePosterData(n3.insertId);
    assert(res3.nominee.poster_template === 'royal_amethyst', 'Nominee 3 receives Category B Royal Amethyst template');
    assert(res3.sponsors.length === 1 && res3.sponsors[0].name === 'TEST_SPONSOR_ALPHA', 'Nominee 3 receives Category B sponsor Alpha');

    const res4 = await resolvePosterData(n4.insertId);
    assert(res4.nominee.poster_template === 'emerald_grandeur', 'Nominee 4 receives Category C Emerald Grandeur template');
    assert(res4.sponsors.length === 2, 'Nominee 4 receives Category C multiple sponsors (2)');
    assert(res4.warnings.some(w => w.includes('TEST_SPONSOR_NOLOGO')), 'Nominee 4 correctly triggers missing logo warning for TEST_SPONSOR_NOLOGO');

    // -------------------------------------------------------------------------
    // Test Dynamic Updates (Updated Nominee & Sponsor Information)
    // -------------------------------------------------------------------------
    console.log('\nTest 7: Testing Dynamic Updates (Updated Nominee & Sponsor Information)...');

    // Update Nominee 1 name
    await conn.query("UPDATE nominees SET full_name = 'TEST_NOMINEE_UPDATED_NAME' WHERE id = ?", [n1.insertId]);
    const res1Updated = await resolvePosterData(n1.insertId);
    assert(res1Updated.nominee.full_name === 'TEST_NOMINEE_UPDATED_NAME', 'Nominee name update immediately reflected in poster data');

    // Update Category A template to Crimson Star
    await conn.query("UPDATE categories SET poster_template = 'crimson_star', poster_theme_color = '#F43F5E' WHERE id = ?", [catA.id]);
    const res1NewTmpl = await resolvePosterData(n1.insertId);
    assert(res1NewTmpl.nominee.poster_template === 'crimson_star', 'Category template update dynamically reflected on nominee poster');

    // Revert Category A template back to gold_prestige
    await conn.query("UPDATE categories SET poster_template = 'gold_prestige', poster_theme_color = '#D4AF37' WHERE id = ?", [catA.id]);

    // -------------------------------------------------------------------------
    // Cleanup test records
    // -------------------------------------------------------------------------
    console.log('\nCleaning up temporary test records...');
    await conn.query("DELETE FROM nominees WHERE full_name LIKE 'TEST_NOMINEE_%'");
    await conn.query('DELETE FROM category_sponsors WHERE category_id IN (?, ?, ?)', [catA.id, catB.id, catC.id]);
    await conn.query("DELETE FROM sponsors WHERE name LIKE 'TEST_SPONSOR_%'");
    console.log('✓ Cleaned up test data.');

    console.log('\n========================================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    conn.release();
  }
}

runTests();
