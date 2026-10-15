const { pool } = require('../config/database');

async function migrate() {
  console.log('Running category poster templates and sponsors migration...');
  const conn = await pool.getConnection();
  try {
    // 1. Check categories table columns
    const [cols] = await conn.query('DESCRIBE categories');
    const fields = cols.map((c) => c.Field);

    if (!fields.includes('poster_template')) {
      await conn.query("ALTER TABLE categories ADD COLUMN poster_template VARCHAR(50) NOT NULL DEFAULT 'gold_prestige'");
      console.log('✓ Added poster_template column to categories');
    } else {
      console.log('• poster_template column already exists');
    }

    if (!fields.includes('poster_theme_color')) {
      await conn.query("ALTER TABLE categories ADD COLUMN poster_theme_color VARCHAR(30) NULL DEFAULT '#D4AF37'");
      console.log('✓ Added poster_theme_color column to categories');
    } else {
      console.log('• poster_theme_color column already exists');
    }

    if (!fields.includes('poster_badge_text')) {
      await conn.query("ALTER TABLE categories ADD COLUMN poster_badge_text VARCHAR(100) NULL DEFAULT 'OFFICIAL NOMINEE'");
      console.log('✓ Added poster_badge_text column to categories');
    } else {
      console.log('• poster_badge_text column already exists');
    }

    if (!fields.includes('poster_tagline')) {
      await conn.query("ALTER TABLE categories ADD COLUMN poster_tagline VARCHAR(255) NULL DEFAULT NULL");
      console.log('✓ Added poster_tagline column to categories');
    } else {
      console.log('• poster_tagline column already exists');
    }

    // 2. Ensure category_sponsors table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS category_sponsors (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        category_id INT UNSIGNED NOT NULL,
        sponsor_id INT UNSIGNED NOT NULL,
        role VARCHAR(100) NOT NULL DEFAULT 'Category Partner',
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_category_sponsor (category_id, sponsor_id),
        KEY idx_cat_sponsors_category (category_id),
        KEY idx_cat_sponsors_sponsor (sponsor_id),
        CONSTRAINT fk_cat_sponsors_category FOREIGN KEY (category_id)
          REFERENCES categories (id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_cat_sponsors_sponsor FOREIGN KEY (sponsor_id)
          REFERENCES sponsors (id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ category_sponsors table verified/created');

    console.log('✓ Migration completed successfully.');
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
