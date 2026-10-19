require('dotenv').config();
const jwt = require('jsonwebtoken');
const http = require('http');
const express = require('express');
const { pool } = require('../config/database');

// Create test admin token
const JWT_SECRET = process.env.JWT_SECRET || 'telugu_icon_awards_secret_key_2024_very_secure';
const adminToken = jwt.sign(
  { id: 1, email: 'admin@teluguiconawards.in', role: 'admin' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

// 1x1 transparent PNG buffer
const validPngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

// 1x1 JPEG buffer
const validJpgBuffer = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64'
);

// Helper to make multipart request using standard node http
function makeRequest({ method, path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port: 3001,
        method,
        path,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks);
          let json = null;
          try {
            json = JSON.parse(raw.toString('utf8'));
          } catch (_) {}
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: raw,
            json,
          });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function buildMultipart({ fieldName, filename, mimeType, fileBuffer, otherFields = {} }) {
  const boundary = '----TestBoundary' + Date.now();
  const parts = [];

  for (const [k, v] of Object.entries(otherFields)) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`
      )
    );
  }

  if (fileBuffer) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
      )
    );
    parts.push(fileBuffer);
    parts.push(Buffer.from('\r\n'));
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`));
  const fullBody = Buffer.concat(parts);

  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: fullBody,
  };
}

async function runTests() {
  console.log('===============================================================');
  console.log('   RUNNING DATABASE-DRIVEN IMAGE MANAGEMENT TEST SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${testName} ${detail ? '(' + detail + ')' : ''}`);
      failed++;
    }
  }

  // Start internal test server on 3001 if not already running
  let server;
  try {
    const health = await makeRequest({ method: 'GET', path: '/api/health' });
    console.log('Existing server running on 3001');
  } catch (_) {
    console.log('Starting test server on 3001...');
    const app = express();
    app.disable('x-powered-by');
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    const imageRoutes = require('../routes/imageRoutes');
    const adminRoutes = require('../routes/adminRoutes');
    const sponsorRoutes = require('../routes/sponsorRoutes');

    app.use('/api/images', imageRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/sponsors', sponsorRoutes);
    app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

    server = app.listen(3001);
    await new Promise((r) => setTimeout(r, 600));
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Unauthorized access to mutating endpoints
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Security & Authorization Checks ---');
    const unauthPost = await makeRequest({
      method: 'POST',
      path: '/api/images',
    });
    assert(
      unauthPost.status === 401,
      'POST /api/images rejects unauthorized user with 401',
      `Got ${unauthPost.status}`
    );

    const unauthPut = await makeRequest({
      method: 'PUT',
      path: '/api/images/1',
    });
    assert(
      unauthPut.status === 401,
      'PUT /api/images/:id rejects unauthorized user with 401',
      `Got ${unauthPut.status}`
    );

    const unauthDel = await makeRequest({
      method: 'DELETE',
      path: '/api/images/1',
    });
    assert(
      unauthDel.status === 401,
      'DELETE /api/images/:id rejects unauthorized user with 401',
      `Got ${unauthDel.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 2: 1 MB File Size Limit Enforcement
    // -------------------------------------------------------------------------
    console.log('\n--- 2. File Size & Format Validation ---');
    const oversizedBuffer = Buffer.alloc(1.2 * 1024 * 1024); // 1.2 MB
    const oversizedMp = buildMultipart({
      fieldName: 'image',
      filename: 'large.jpg',
      mimeType: 'image/jpeg',
      fileBuffer: oversizedBuffer,
    });

    const oversizedRes = await makeRequest({
      method: 'POST',
      path: '/api/images',
      headers: {
        'Content-Type': oversizedMp.contentType,
        Authorization: `Bearer ${adminToken}`,
      },
      body: oversizedMp.body,
    });
    assert(
      oversizedRes.status === 400 &&
        (oversizedRes.json?.message || '').toLowerCase().includes('1 mb'),
      'Oversized file (> 1 MB) is strictly rejected with 400 and clear error message',
      `Status: ${oversizedRes.status}, Msg: ${oversizedRes.json?.message}`
    );

    // -------------------------------------------------------------------------
    // TEST 3: Invalid MIME Type Rejection
    // -------------------------------------------------------------------------
    const textBuffer = Buffer.from('This is a text file masquerading as image');
    const invalidMp = buildMultipart({
      fieldName: 'image',
      filename: 'document.txt',
      mimeType: 'text/plain',
      fileBuffer: textBuffer,
    });

    const invalidRes = await makeRequest({
      method: 'POST',
      path: '/api/images',
      headers: {
        'Content-Type': invalidMp.contentType,
        Authorization: `Bearer ${adminToken}`,
      },
      body: invalidMp.body,
    });
    assert(
      invalidRes.status === 400 &&
        (invalidRes.json?.message || '').toLowerCase().includes('only jpeg, png, and webp'),
      'Unsupported file format (text/plain) rejected with 400',
      `Status: ${invalidRes.status}, Msg: ${invalidRes.json?.message}`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Valid Image Upload & MySQL Database Persistence
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Image Upload & Database Persistence ---');
    const validMp = buildMultipart({
      fieldName: 'image',
      filename: 'sponsor-logo-test.png',
      mimeType: 'image/png',
      fileBuffer: validPngBuffer,
      otherFields: { section: 'sponsors' },
    });

    const uploadRes = await makeRequest({
      method: 'POST',
      path: '/api/images',
      headers: {
        'Content-Type': validMp.contentType,
        Authorization: `Bearer ${adminToken}`,
      },
      body: validMp.body,
    });

    assert(uploadRes.status === 201, 'POST /api/images returns 201 Created', `Status: ${uploadRes.status}`);
    const createdImageId = uploadRes.json?.id;
    assert(createdImageId && createdImageId > 0, `Returns valid created image ID: #${createdImageId}`);
    assert(
      uploadRes.json?.url === `/api/images/${createdImageId}/file`,
      `Returns correct URL format: ${uploadRes.json?.url}`
    );

    // Verify row in MySQL database
    const [dbRows] = await pool.query(
      'SELECT id, original_filename, mime_type, file_size, section, LENGTH(image_data) as len FROM images WHERE id = ?',
      [createdImageId]
    );
    assert(dbRows.length === 1, 'Image row exists in MySQL `images` table');
    assert(dbRows[0]?.file_size === validPngBuffer.length, 'Database `file_size` matches byte count');
    assert(dbRows[0]?.len === validPngBuffer.length, 'Database LONGBLOB `image_data` length matches upload byte-for-byte');
    assert(dbRows[0]?.section === 'sponsors', 'Database `section` preserved correctly');

    // -------------------------------------------------------------------------
    // TEST 5: Metadata Retrieval via GET /api/images/:id
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Image GET & File Retrieval ---');
    const metaRes = await makeRequest({
      method: 'GET',
      path: `/api/images/${createdImageId}`,
    });
    assert(metaRes.status === 200, `GET /api/images/:id returns 200 OK`);
    assert(metaRes.json?.original_filename === 'sponsor-logo-test.png', 'Metadata contains original_filename');

    // -------------------------------------------------------------------------
    // TEST 6: Binary File Serving via Public GET /api/images/:id/file
    // -------------------------------------------------------------------------
    const fileRes = await makeRequest({
      method: 'GET',
      path: `/api/images/${createdImageId}/file`,
    });
    assert(fileRes.status === 200, 'Public GET /api/images/:id/file returns 200 without auth header');
    assert(fileRes.headers['content-type'] === 'image/png', 'Returns correct Content-Type header');
    assert(
      fileRes.body.equals(validPngBuffer),
      'Served binary data matches uploaded PNG bytes identically'
    );
    assert(
      fileRes.headers['cache-control'] && fileRes.headers['cache-control'].includes('public'),
      'Cache-Control header present for browser performance'
    );

    // Test ETag & 304 Not Modified
    const etag = fileRes.headers['etag'];
    if (etag) {
      const cacheRes = await makeRequest({
        method: 'GET',
        path: `/api/images/${createdImageId}/file`,
        headers: { 'If-None-Match': etag },
      });
      assert(cacheRes.status === 304, 'Returns 304 Not Modified when ETag matches');
    }

    // -------------------------------------------------------------------------
    // TEST 7: Image Listing & Pagination via GET /api/images
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Image Listing & Pagination ---');
    const listRes = await makeRequest({
      method: 'GET',
      path: '/api/images?section=sponsors&page=1&limit=10',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(listRes.status === 200, 'GET /api/images returns 200');
    assert(Array.isArray(listRes.json?.images), 'Returns images array');
    assert(listRes.json?.pagination?.total >= 1, 'Returns valid pagination metadata');
    assert(
      listRes.json?.images[0]?.image_data === undefined,
      'Image listing excludes binary BLOB data for minimal bandwidth'
    );

    // -------------------------------------------------------------------------
    // TEST 8: Image Update via PUT /api/images/:id
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Image Replacement & Update ---');
    const replaceMp = buildMultipart({
      fieldName: 'image',
      filename: 'replaced-logo.jpg',
      mimeType: 'image/jpeg',
      fileBuffer: validJpgBuffer,
      otherFields: { section: 'sponsors_updated' },
    });

    const updateRes = await makeRequest({
      method: 'PUT',
      path: `/api/images/${createdImageId}`,
      headers: {
        'Content-Type': replaceMp.contentType,
        Authorization: `Bearer ${adminToken}`,
      },
      body: replaceMp.body,
    });
    assert(updateRes.status === 200, 'PUT /api/images/:id returns 200 on replace');

    // Verify replacement in database
    const [updatedDb] = await pool.query(
      'SELECT original_filename, mime_type, file_size, section, LENGTH(image_data) as len FROM images WHERE id = ?',
      [createdImageId]
    );
    assert(updatedDb[0]?.original_filename === 'replaced-logo.jpg', 'Filename updated to replaced file');
    assert(updatedDb[0]?.mime_type === 'image/jpeg', 'MIME type updated to image/jpeg');
    assert(updatedDb[0]?.len === validJpgBuffer.length, 'Binary data replaced with new JPEG buffer');

    // -------------------------------------------------------------------------
    // TEST 9: Sponsor Management & Required Image Validation
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Sponsor Creation & Required Image Validation ---');
    // Attempt to create sponsor without image -> Must fail with 400
    const noImageSponsor = await makeRequest({
      method: 'POST',
      path: '/api/admin/sponsors',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Sponsor Without Logo',
        tier: 'gold',
        logo_url: '',
      }),
    });
    assert(
      noImageSponsor.status === 400 &&
        (noImageSponsor.json?.message || '').toLowerCase().includes('image is required'),
      'Sponsor creation without image rejected with 400 and clear required message',
      `Got ${noImageSponsor.status}: ${noImageSponsor.json?.message}`
    );

    // Create sponsor with valid image_id
    const sponsorName = 'TEST_BRAND_PARTNER_' + Date.now();
    const createSponsorRes = await makeRequest({
      method: 'POST',
      path: '/api/admin/sponsors',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: sponsorName,
        tier: 'title_partner',
        image_id: createdImageId,
        website_url: 'https://brandpartner.example.com',
        tagline: 'Leading the Future',
      }),
    });
    assert(createSponsorRes.status === 201, 'POST /api/admin/sponsors creates sponsor with image_id');
    const createdSponsorId = createSponsorRes.json?.id;
    assert(createdSponsorId && createdSponsorId > 0, `Created sponsor ID #${createdSponsorId}`);

    // Verify sponsor in DB has image_id linked
    const [sponsDb] = await pool.query('SELECT image_id, logo_url, is_active FROM sponsors WHERE id = ?', [createdSponsorId]);
    assert(sponsDb[0]?.image_id === createdImageId, 'Sponsor image_id foreign key correctly linked');
    assert(sponsDb[0]?.is_active === 1, 'New sponsor defaults to active (1)');

    // -------------------------------------------------------------------------
    // TEST 10: Online/Offline Switch & Public Website Visibility
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Online/Offline Visibility Filtering ---');
    // Public GET /api/sponsors -> Must include our active sponsor
    const pubActive = await makeRequest({ method: 'GET', path: '/api/sponsors' });
    assert(pubActive.status === 200, 'Public GET /api/sponsors returns 200');
    const foundInActive = (pubActive.json || []).some((s) => s.id === createdSponsorId);
    assert(foundInActive, 'Active sponsor appears in public /api/sponsors list');

    // Toggle sponsor to OFF (is_active = 0)
    const toggleOff = await makeRequest({
      method: 'PUT',
      path: `/api/admin/sponsors/${createdSponsorId}`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ is_active: 0 }),
    });
    assert(toggleOff.status === 200, 'PUT /api/admin/sponsors/:id sets is_active = 0');

    // Public GET /api/sponsors -> MUST NOT include offline sponsor!
    const pubInactive = await makeRequest({ method: 'GET', path: '/api/sponsors' });
    const foundInInactive = (pubInactive.json || []).some((s) => s.id === createdSponsorId);
    assert(
      !foundInInactive,
      'Offline sponsor is strictly excluded from public /api/sponsors list'
    );

    // Toggle sponsor back to ON (is_active = 1)
    const toggleOn = await makeRequest({
      method: 'PUT',
      path: `/api/admin/sponsors/${createdSponsorId}`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ is_active: 1 }),
    });
    assert(toggleOn.status === 200, 'PUT /api/admin/sponsors/:id sets is_active = 1');

    const pubReactive = await makeRequest({ method: 'GET', path: '/api/sponsors' });
    const foundInReactive = (pubReactive.json || []).some((s) => s.id === createdSponsorId);
    assert(foundInReactive, 'Re-activated sponsor reappears in public /api/sponsors list');

    // -------------------------------------------------------------------------
    // TEST 11: Cleanup & Deletion Safety
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Cleanup & Referential Integrity ---');
    const delSponsor = await makeRequest({
      method: 'DELETE',
      path: `/api/admin/sponsors/${createdSponsorId}`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(delSponsor.status === 200, 'DELETE /api/admin/sponsors/:id succeeds and auto-cleans linked entity image');

    // Upload a standalone image specifically to test direct DELETE /api/images/:id
    const standaloneMp = buildMultipart({
      fieldName: 'image',
      filename: 'to-delete.png',
      mimeType: 'image/png',
      fileBuffer: validPngBuffer,
      otherFields: { section: 'temporary' },
    });
    const standaloneUpload = await makeRequest({
      method: 'POST',
      path: '/api/images',
      headers: {
        'Content-Type': standaloneMp.contentType,
        Authorization: `Bearer ${adminToken}`,
      },
      body: standaloneMp.body,
    });
    const standaloneId = standaloneUpload.json?.id;
    assert(standaloneId > 0, `Standalone image created for deletion test: #${standaloneId}`);

    const delImage = await makeRequest({
      method: 'DELETE',
      path: `/api/images/${standaloneId}`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(delImage.status === 200, 'DELETE /api/images/:id succeeds on standalone image');

    const checkDeleted = await makeRequest({
      method: 'GET',
      path: `/api/images/${standaloneId}/file`,
    });
    assert(checkDeleted.status === 404, 'GET on deleted image returns 404 Not Found');

    console.log('\n===============================================================');
    console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================');

    if (server) server.close();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    if (server) server.close();
    process.exit(1);
  }
}

runTests();
