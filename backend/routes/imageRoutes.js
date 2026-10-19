const express = require('express');
const router = express.Router();
const multer = require('multer');
const { pool } = require('../config/database');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

// In-memory storage: file buffer is held in memory so it can be directly saved to MySQL LONGBLOB
const memoryStorage = multer.memoryStorage();

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB strictly enforced

const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    if (ALLOWED_MIME_TYPES.includes(mime)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image format. Only JPEG, PNG, and WebP images are allowed.'));
    }
  },
});

// Middleware to handle multer upload errors cleanly with proper HTTP status codes
const handleUpload = (req, res, next) => {
  // Support both 'image' and 'file' field names
  upload.single('image')(req, res, (err) => {
    if (!err) {
      if (!req.file) {
        // Try fallback field name 'file'
        return upload.single('file')(req, res, (err2) => {
          if (err2) return handleMulterError(err2, res);
          next();
        });
      }
      return next();
    }
    return handleMulterError(err, res);
  });
};

function handleMulterError(err, res) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'Image is too large. Please upload an image smaller than or equal to 1 MB (1,048,576 bytes).',
        code: 'LIMIT_FILE_SIZE',
      });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}`, code: err.code });
  }
  return res.status(400).json({ message: err.message || 'Failed to process uploaded file' });
}

// =========================================================================
// PUBLIC: GET /api/images/:id/file — Stream binary image with caching headers
// =========================================================================
router.get('/:id/file', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Invalid image ID' });
    }

    const [rows] = await pool.query(
      'SELECT mime_type, file_size, image_data, updated_at FROM images WHERE id = ?',
      [id]
    );

    if (rows.length === 0 || !rows[0].image_data) {
      return res.status(404).json({ message: 'Image not found' });
    }

    const img = rows[0];
    const etag = `"img-${id}-${new Date(img.updated_at).getTime()}"`;

    // Set headers
    res.setHeader('Content-Type', img.mime_type || 'image/jpeg');
    res.setHeader('Content-Length', img.file_size || img.image_data.length);
    res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    res.setHeader('ETag', etag);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    return res.end(img.image_data);
  } catch (error) {
    console.error('Error serving image binary:', error);
    return res.status(500).json({ message: 'Internal server error retrieving image' });
  }
});

// =========================================================================
// PUBLIC: GET /api/images/:id — Metadata for a single image
// =========================================================================
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Invalid image ID' });
    }

    const [rows] = await pool.query(
      'SELECT id, original_filename, mime_type, file_size, section, entity_type, entity_id, created_at, updated_at FROM images WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Image not found' });
    }

    const item = rows[0];
    return res.json({
      ...item,
      url: `/api/images/${item.id}/file`,
    });
  } catch (error) {
    console.error('Error fetching image metadata:', error);
    return res.status(500).json({ message: 'Internal server error retrieving image metadata' });
  }
});

// =========================================================================
// PROTECTED ADMIN ROUTES: Authentication & Admin Authorization
// =========================================================================

// POST /api/images — Upload and store binary image into database
router.post('/', authenticate, authorizeAdmin, handleUpload, async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        message: 'Image is required. Please upload an image smaller than or equal to 1 MB.',
      });
    }

    // Additional strict size validation
    if (req.file.size > MAX_FILE_SIZE || req.file.buffer.length > MAX_FILE_SIZE) {
      return res.status(400).json({
        message: 'Image exceeds maximum allowed size of 1 MB (1,048,576 bytes).',
      });
    }

    const originalFilename = req.file.originalname || 'image.jpg';
    const mimeType = req.file.mimetype || 'image/jpeg';
    const fileSize = req.file.size || req.file.buffer.length;
    const section = (req.body.section || 'general').trim();
    const entityType = req.body.entity_type ? req.body.entity_type.trim() : null;
    const entityId = req.body.entity_id ? parseInt(req.body.entity_id, 10) : null;

    const [result] = await pool.query(
      `INSERT INTO images (original_filename, mime_type, file_size, image_data, section, entity_type, entity_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [originalFilename, mimeType, fileSize, req.file.buffer, section, entityType, entityId]
    );

    const insertedId = result.insertId;
    const fileUrl = `/api/images/${insertedId}/file`;

    return res.status(201).json({
      id: insertedId,
      url: fileUrl,
      original_filename: originalFilename,
      mime_type: mimeType,
      file_size: fileSize,
      section,
      entity_type: entityType,
      entity_id: entityId,
      message: 'Image uploaded and saved to database successfully',
    });
  } catch (error) {
    console.error('Error uploading image to database:', error);
    return res.status(500).json({ message: 'Failed to save image: ' + error.message });
  }
});

// GET /api/images — Paginated list of image metadata records
router.get('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    if (req.query.section) {
      conditions.push('section = ?');
      params.push(req.query.section);
    }
    if (req.query.entity_type) {
      conditions.push('entity_type = ?');
      params.push(req.query.entity_type);
    }
    if (req.query.entity_id) {
      conditions.push('entity_id = ?');
      params.push(parseInt(req.query.entity_id, 10));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM images ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT id, original_filename, mime_type, file_size, section, entity_type, entity_id, created_at, updated_at
       FROM images
       ${whereClause}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const imagesWithUrls = rows.map((img) => ({
      ...img,
      url: `/api/images/${img.id}/file`,
    }));

    return res.json({
      images: imagesWithUrls,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error listing images:', error);
    return res.status(500).json({ message: 'Internal server error listing images' });
  }
});

// PUT /api/images/:id — Update metadata or replace image data
router.put('/:id', authenticate, authorizeAdmin, handleUpload, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Invalid image ID' });
    }

    const [existing] = await pool.query('SELECT id FROM images WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // If a new file was uploaded, replace image_data, size, mime, and filename
    if (req.file && req.file.buffer) {
      if (req.file.size > MAX_FILE_SIZE || req.file.buffer.length > MAX_FILE_SIZE) {
        return res.status(400).json({
          message: 'Image exceeds maximum allowed size of 1 MB (1,048,576 bytes).',
        });
      }

      const originalFilename = req.file.originalname || 'image.jpg';
      const mimeType = req.file.mimetype || 'image/jpeg';
      const fileSize = req.file.size || req.file.buffer.length;
      const section = req.body.section !== undefined ? req.body.section : null;
      const entityType = req.body.entity_type !== undefined ? req.body.entity_type : null;
      const entityId = req.body.entity_id !== undefined ? parseInt(req.body.entity_id, 10) : null;

      await pool.query(
        `UPDATE images SET
           original_filename = ?,
           mime_type = ?,
           file_size = ?,
           image_data = ?,
           section = COALESCE(?, section),
           entity_type = COALESCE(?, entity_type),
           entity_id = COALESCE(?, entity_id)
         WHERE id = ?`,
        [originalFilename, mimeType, fileSize, req.file.buffer, section, entityType, entityId, id]
      );
    } else {
      // Update only metadata
      const updates = [];
      const params = [];

      if (req.body.section !== undefined) {
        updates.push('section = ?');
        params.push(req.body.section);
      }
      if (req.body.entity_type !== undefined) {
        updates.push('entity_type = ?');
        params.push(req.body.entity_type);
      }
      if (req.body.entity_id !== undefined) {
        updates.push('entity_id = ?');
        params.push(req.body.entity_id ? parseInt(req.body.entity_id, 10) : null);
      }
      if (req.body.original_filename) {
        updates.push('original_filename = ?');
        params.push(req.body.original_filename);
      }

      if (updates.length > 0) {
        params.push(id);
        await pool.query(`UPDATE images SET ${updates.join(', ')} WHERE id = ?`, params);
      }
    }

    const [updatedRows] = await pool.query(
      'SELECT id, original_filename, mime_type, file_size, section, entity_type, entity_id, created_at, updated_at FROM images WHERE id = ?',
      [id]
    );

    return res.json({
      message: 'Image updated successfully',
      image: {
        ...updatedRows[0],
        url: `/api/images/${id}/file`,
      },
    });
  } catch (error) {
    console.error('Error updating image:', error);
    return res.status(500).json({ message: 'Failed to update image: ' + error.message });
  }
});

// DELETE /api/images/:id — Delete image and clean up references safely
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Invalid image ID' });
    }

    // Clean up references in sponsors (set image_id to NULL, clear logo_url if it pointed to this image)
    const fileUrl = `/api/images/${id}/file`;
    await pool.query(
      'UPDATE sponsors SET image_id = NULL, logo_url = CASE WHEN logo_url LIKE ? THEN NULL ELSE logo_url END WHERE image_id = ? OR logo_url LIKE ?',
      [`%${fileUrl}%`, id, `%${fileUrl}%`]
    );

    const [result] = await pool.query('DELETE FROM images WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Image not found' });
    }

    return res.json({ message: 'Image deleted successfully', id });
  } catch (error) {
    console.error('Error deleting image:', error);
    return res.status(500).json({ message: 'Failed to delete image: ' + error.message });
  }
});

module.exports = router;
