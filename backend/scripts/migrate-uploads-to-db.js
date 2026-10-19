require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const MIME_MAP = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

async function migrateUploads() {
  console.log('--- Starting Migration of Local Uploads to Database ---');
  const uploadDir = path.join(__dirname, '..', 'uploads');

  if (!fs.existsSync(uploadDir)) {
    console.log('No uploads directory found at', uploadDir);
    process.exit(0);
  }

  const files = fs.readdirSync(uploadDir);
  console.log(`Found ${files.length} file(s) in ${uploadDir}`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const filename of files) {
    const filePath = path.join(uploadDir, filename);
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;

    const ext = path.extname(filename).toLowerCase();
    const mimeType = MIME_MAP[ext] || 'application/octet-stream';
    const fileSize = stat.size;
    const buffer = fs.readFileSync(filePath);

    // Check if this file was already imported into `images`
    const [existing] = await pool.query(
      'SELECT id FROM images WHERE original_filename = ? AND file_size = ?',
      [filename, fileSize]
    );

    let imageId;
    if (existing.length > 0) {
      imageId = existing[0].id;
      console.log(`ℹ File "${filename}" already in DB as image #${imageId}`);
      skippedCount++;
    } else {
      const section = filename.startsWith('nomination-') ? 'nominations' : (filename.startsWith('admin-') ? 'admin' : 'general');
      const [insertRes] = await pool.query(
        'INSERT INTO images (original_filename, mime_type, file_size, image_data, section) VALUES (?, ?, ?, ?, ?)',
        [filename, mimeType, fileSize, buffer, section]
      );
      imageId = insertRes.insertId;
      console.log(`✓ Imported "${filename}" into DB as image #${imageId} (${(fileSize / 1024).toFixed(1)} KB)`);
      migratedCount++;
    }

    const newUrl = `/api/images/${imageId}/file`;
    const oldPathPattern = `%${filename}%`;

    // 1. Update nominations
    const [nomRes] = await pool.query(
      'UPDATE nominations SET photo_url = ? WHERE photo_url LIKE ?',
      [newUrl, oldPathPattern]
    );
    if (nomRes.affectedRows > 0) {
      console.log(`  → Updated ${nomRes.affectedRows} nomination(s) to ${newUrl}`);
    }

    // 2. Update nominees
    const [nomineeRes] = await pool.query(
      'UPDATE nominees SET photo_url = ? WHERE photo_url LIKE ?',
      [newUrl, oldPathPattern]
    );
    if (nomineeRes.affectedRows > 0) {
      console.log(`  → Updated ${nomineeRes.affectedRows} nominee(s) to ${newUrl}`);
    }

    // 3. Update sponsors
    const [sponsRes] = await pool.query(
      'UPDATE sponsors SET logo_url = ?, image_id = ? WHERE logo_url LIKE ?',
      [newUrl, imageId, oldPathPattern]
    );
    if (sponsRes.affectedRows > 0) {
      console.log(`  → Updated ${sponsRes.affectedRows} sponsor(s) to ${newUrl} with image_id #${imageId}`);
    }
  }

  console.log(`\nMigration completed: ${migratedCount} imported, ${skippedCount} previously existing.`);
  process.exit(0);
}

migrateUploads().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
