require('dotenv').config();
const { pool } = require('../config/database');

async function migrate() {
  console.log('Running images migration on database...');

  // 1. Create images table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS images (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      original_filename VARCHAR(255) NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      file_size INT UNSIGNED NOT NULL,
      image_data LONGBLOB NOT NULL,
      section VARCHAR(100) NULL DEFAULT 'general',
      entity_type VARCHAR(100) NULL DEFAULT NULL,
      entity_id INT UNSIGNED NULL DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_images_entity (entity_type, entity_id),
      KEY idx_images_section (section),
      KEY idx_images_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✓ Created `images` table');

  // 2. Check and add image_id column to sponsors
  const [cols] = await pool.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sponsors'
      AND COLUMN_NAME = 'image_id'
  `);

  if (cols.length === 0) {
    await pool.query(`
      ALTER TABLE sponsors
      ADD COLUMN image_id INT UNSIGNED NULL DEFAULT NULL AFTER tier,
      ADD KEY idx_sponsors_image_id (image_id),
      ADD CONSTRAINT fk_sponsors_image FOREIGN KEY (image_id) REFERENCES images (id) ON DELETE SET NULL ON UPDATE CASCADE
    `);
    console.log('✓ Added `image_id` column and foreign key to `sponsors` table');
  } else {
    console.log('ℹ `image_id` column already exists on `sponsors`');
  }

  console.log('Migration completed successfully!');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
