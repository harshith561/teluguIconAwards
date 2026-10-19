const path = require('path');
const fs = require('fs');
const http = require('http');
const app = require('../server');
const { pool } = require('../config/database');

const TEST_PORT = 3099;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

function createTestPngBuffer() {
  // Minimal valid 1x1 PNG with PNG magic header
  return Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2d040000000049454e44ae426082',
    'hex'
  );
}

function createFakeTextBuffer() {
  return Buffer.from('This is not an image file. It is plain text content.', 'utf-8');
}

function createOversizedBuffer() {
  return Buffer.alloc(1.2 * 1024 * 1024, 0xff);
}

async function request(method, urlPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let data = null;
          try {
            data = JSON.parse(raw);
          } catch (_) {
            data = raw;
          }
          resolve({ status: res.statusCode, headers: res.headers, data });
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

function buildMultipart(fields, fileField) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const CRLF = '\r\n';
  const chunks = [];

  for (const [key, val] of Object.entries(fields)) {
    chunks.push(Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="${key}"${CRLF}${CRLF}${val}${CRLF}`));
  }

  if (fileField && fileField.buffer) {
    chunks.push(
      Buffer.from(
        `--${boundary}${CRLF}Content-Disposition: form-data; name="${fileField.name}"; filename="${fileField.filename}"${CRLF}Content-Type: ${fileField.contentType}${CRLF}${CRLF}`
      )
    );
    chunks.push(fileField.buffer);
    chunks.push(Buffer.from(CRLF));
  }

  chunks.push(Buffer.from(`--${boundary}--${CRLF}`));
  const body = Buffer.concat(chunks);
  const contentType = `multipart/form-data; boundary=${boundary}`;

  return { body, contentType };
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('🚀 SPONSOR MANAGEMENT & ONE-PER-TYPE TEST SUITE');
  console.log('====================================================\n');

  let server;
  await new Promise((resolve, reject) => {
    server = app.listen(TEST_PORT, '127.0.0.1', () => {
      console.log(`✓ Test Express server listening on ${BASE_URL}\n`);
      resolve();
    });
    server.on('error', reject);
  });

  let passed = 0;
  let failed = 0;
  const createdSponsorIds = [];

  function assert(condition, message, detail = '') {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message} ${detail ? '(' + detail + ')' : ''}`);
      failed++;
    }
  }

  try {
    // Clean up any lingering test sponsors from prior runs
    await pool.query("DELETE FROM sponsors WHERE name LIKE 'Test Partner %' OR name LIKE 'Sponsor %'");

    // 1. Fetch valid category
    const [cats] = await pool.query('SELECT id, name FROM categories LIMIT 1');
    if (cats.length === 0) throw new Error('No categories found in database to test with');
    const testCategory = cats[0];
    console.log(`Using Category: [ID: ${testCategory.id}] "${testCategory.name}"\n`);

    // 2. Unauthorized access checks
    console.log('--- 1. Testing Unauthorized Access ---');
    const unauthGet = await request('GET', '/api/admin/sponsors');
    assert(unauthGet.status === 401, 'GET /api/admin/sponsors rejects unauthorized request with 401');

    const unauthPost = await request('POST', '/api/admin/sponsors');
    assert(unauthPost.status === 401, 'POST /api/admin/sponsors rejects unauthorized request with 401');

    const unauthDel = await request('DELETE', '/api/admin/sponsors/1');
    assert(unauthDel.status === 401, 'DELETE /api/admin/sponsors/:id rejects unauthorized request with 401');

    // 3. Admin Authentication
    console.log('\n--- 2. Admin Authentication ---');
    const loginRes = await request(
      'POST',
      '/api/auth/login',
      { 'Content-Type': 'application/json' },
      JSON.stringify({ email: 'admin@teluguiconawards.com', password: 'Admin@tiaawards2026' })
    );
    assert(loginRes.status === 200 && loginRes.data.token, 'Admin login succeeded and returned JWT');
    const token = loginRes.data.token;
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 4. GET /api/admin/sponsors with Auth
    console.log('\n--- 3. GET /api/admin/sponsors ---');
    const getRes = await request('GET', '/api/admin/sponsors', authHeaders);
    assert(getRes.status === 200, 'GET /api/admin/sponsors returns 200 OK');
    assert(getRes.data.success === true, 'Response contains success: true');
    assert(Array.isArray(getRes.data.data), 'Response data is an array');

    // 5. Validations
    console.log('\n--- 4. POST Validations ---');
    const validPng = createTestPngBuffer();

    // No logo
    const noLogoMp = buildMultipart(
      { name: 'Sponsor No Logo', sponsor_type: 'Title Sponsor', category_id: String(testCategory.id) },
      null
    );
    const noLogoRes = await request('POST', '/api/admin/sponsors', {
      ...authHeaders,
      'Content-Type': noLogoMp.contentType,
    }, noLogoMp.body);
    assert(noLogoRes.status === 400, 'POST without logo returns 400 Bad Request', noLogoRes.data?.message);

    // No name
    const noNameMp = buildMultipart(
      { name: '   ', sponsor_type: 'Title Sponsor', category_id: String(testCategory.id) },
      { name: 'logo', filename: 'logo.png', contentType: 'image/png', buffer: validPng }
    );
    const noNameRes = await request('POST', '/api/admin/sponsors', {
      ...authHeaders,
      'Content-Type': noNameMp.contentType,
    }, noNameMp.body);
    assert(noNameRes.status === 400, 'POST with empty name returns 400 Bad Request', noNameRes.data?.message);

    // No sponsor_type
    const noTypeMp = buildMultipart(
      { name: 'Sponsor No Type', category_id: String(testCategory.id) },
      { name: 'logo', filename: 'logo.png', contentType: 'image/png', buffer: validPng }
    );
    const noTypeRes = await request('POST', '/api/admin/sponsors', {
      ...authHeaders,
      'Content-Type': noTypeMp.contentType,
    }, noTypeMp.body);
    assert(noTypeRes.status === 400, 'POST without sponsor_type returns 400 Bad Request', noTypeRes.data?.message);

    // Invalid sponsor_type
    const badTypeMp = buildMultipart(
      { name: 'Sponsor Bad Type', sponsor_type: 'Mega Invisible Partner', category_id: String(testCategory.id) },
      { name: 'logo', filename: 'logo.png', contentType: 'image/png', buffer: validPng }
    );
    const badTypeRes = await request('POST', '/api/admin/sponsors', {
      ...authHeaders,
      'Content-Type': badTypeMp.contentType,
    }, badTypeMp.body);
    assert(badTypeRes.status === 400, 'POST with invalid sponsor_type returns 400 Bad Request', badTypeRes.data?.message);

    // Nonexistent category
    const badCatMp = buildMultipart(
      { name: 'Sponsor Bad Cat', sponsor_type: 'Title Sponsor', category_id: '999999' },
      { name: 'logo', filename: 'logo.png', contentType: 'image/png', buffer: validPng }
    );
    const badCatRes = await request('POST', '/api/admin/sponsors', {
      ...authHeaders,
      'Content-Type': badCatMp.contentType,
    }, badCatMp.body);
    assert(badCatRes.status === 400, 'POST with invalid category_id returns 400 Bad Request', badCatRes.data?.message);

    // Fake image content
    const fakeBuffer = createFakeTextBuffer();
    const fakeImgMp = buildMultipart(
      { name: 'Sponsor Fake Img', sponsor_type: 'Title Sponsor', category_id: String(testCategory.id) },
      { name: 'logo', filename: 'fake.png', contentType: 'image/png', buffer: fakeBuffer }
    );
    const fakeImgRes = await request('POST', '/api/admin/sponsors', {
      ...authHeaders,
      'Content-Type': fakeImgMp.contentType,
    }, fakeImgMp.body);
    assert(fakeImgRes.status === 400, 'POST with fake image content rejected via magic byte validation', fakeImgRes.data?.message);

    // Oversized image (> 1 MB)
    const hugeBuffer = createOversizedBuffer();
    const hugeImgMp = buildMultipart(
      { name: 'Sponsor Huge Img', sponsor_type: 'Title Sponsor', category_id: String(testCategory.id) },
      { name: 'logo', filename: 'huge.png', contentType: 'image/png', buffer: hugeBuffer }
    );
    const hugeImgRes = await request('POST', '/api/admin/sponsors', {
      ...authHeaders,
      'Content-Type': hugeImgMp.contentType,
    }, hugeImgMp.body);
    assert(hugeImgRes.status === 400, 'POST with oversized image (> 1 MB) returns 400 Bad Request', hugeImgRes.data?.message);

    // 6. Successful creation of first sponsor (without category)
    console.log('\n--- 5. Create Sponsor (Title Sponsor, No Category) ---');
    const sponsor1Name = `Test Partner Alpha ${Date.now()}`;
    const sponsor1Mp = buildMultipart(
      { name: sponsor1Name, sponsor_type: 'Title Sponsor', link: 'https://alpha.example.com' },
      { name: 'logo', filename: 'alpha.png', contentType: 'image/png', buffer: validPng }
    );
    const create1Res = await request('POST', '/api/admin/sponsors', {
      ...authHeaders,
      'Content-Type': sponsor1Mp.contentType,
    }, sponsor1Mp.body);

    assert(create1Res.status === 201, 'POST /api/admin/sponsors returns 201 Created');
    assert(create1Res.data.success === true, 'Response has success: true');
    assert(create1Res.data.data.sponsor_type === 'Title Sponsor', 'Created sponsor assigned "Title Sponsor" type');
    assert(create1Res.data.data.category_id === null, 'Sponsor created without category has category_id: null');
    assert(create1Res.data.data.logo.startsWith('/uploads/sponsors/'), 'Logo saved in /uploads/sponsors/');

    const sponsor1Id = create1Res.data.data.id;
    createdSponsorIds.push(sponsor1Id);

    // Verify logo file exists on disk
    const uploadDir = path.resolve(__dirname, '..', 'uploads');
    const diskFile1 = path.resolve(uploadDir, create1Res.data.data.logo.replace(/^\/?uploads\/?/, ''));
    assert(fs.existsSync(diskFile1), 'Uploaded logo file exists on server disk');

    // 7. Duplicate sponsor_type rejection (One Sponsor Per Type)
    console.log('\n--- 6. Enforcing One Sponsor Per Type (409 Conflict) ---');
    const dupTypeMp = buildMultipart(
      { name: 'Test Partner Beta', sponsor_type: 'Title Sponsor', category_id: String(testCategory.id) },
      { name: 'logo', filename: 'beta.png', contentType: 'image/png', buffer: validPng }
    );
    const dupTypeRes = await request('POST', '/api/admin/sponsors', {
      ...authHeaders,
      'Content-Type': dupTypeMp.contentType,
    }, dupTypeMp.body);

    assert(dupTypeRes.status === 409, 'Duplicate sponsor_type rejected with HTTP 409 Conflict');
    assert(
      dupTypeRes.data.message === 'This sponsor type has already been assigned to another sponsor.',
      'Conflict response includes required clear error message',
      dupTypeRes.data.message
    );

    // 8. Test Concurrent Requests with Same Sponsor Type
    console.log('\n--- 7. Testing Concurrency Protection ---');
    const concurrent1 = buildMultipart(
      { name: 'Concurrent Sponsor A', sponsor_type: 'Powered By Sponsor', category_id: String(testCategory.id) },
      { name: 'logo', filename: 'ca.png', contentType: 'image/png', buffer: validPng }
    );
    const concurrent2 = buildMultipart(
      { name: 'Concurrent Sponsor B', sponsor_type: 'Powered By Sponsor', category_id: String(testCategory.id) },
      { name: 'logo', filename: 'cb.png', contentType: 'image/png', buffer: validPng }
    );

    const [resA, resB] = await Promise.all([
      request('POST', '/api/admin/sponsors', { ...authHeaders, 'Content-Type': concurrent1.contentType }, concurrent1.body),
      request('POST', '/api/admin/sponsors', { ...authHeaders, 'Content-Type': concurrent2.contentType }, concurrent2.body),
    ]);

    const oneSucceeded = (resA.status === 201 && resB.status === 409) || (resA.status === 409 && resB.status === 201);
    assert(oneSucceeded, 'Concurrent requests for same type: exactly one succeeded (201) and the other rejected (409)');
    if (resA.status === 201) createdSponsorIds.push(resA.data.data.id);
    if (resB.status === 201) createdSponsorIds.push(resB.data.data.id);

    // 9. Assign Different Sponsor Type to Another Sponsor
    console.log('\n--- 8. Assigning Different Sponsor Type ---');
    const diffTypeMp = buildMultipart(
      { name: 'Test Partner Gamma', sponsor_type: 'Gold Sponsor', category_id: String(testCategory.id) },
      { name: 'logo', filename: 'gamma.png', contentType: 'image/png', buffer: validPng }
    );
    const diffTypeRes = await request('POST', '/api/admin/sponsors', {
      ...authHeaders,
      'Content-Type': diffTypeMp.contentType,
    }, diffTypeMp.body);
    assert(diffTypeRes.status === 201, 'Different sponsor type ("Gold Sponsor") successfully created with 201');
    if (diffTypeRes.status === 201) createdSponsorIds.push(diffTypeRes.data.data.id);

    // 10. GET /api/admin/sponsors returns all saved sponsors with types
    console.log('\n--- 9. Verifying GET /api/admin/sponsors with Types ---');
    const listRes = await request('GET', '/api/admin/sponsors', authHeaders);
    assert(listRes.status === 200, 'GET /api/admin/sponsors returns 200');
    const titleSponsorItem = listRes.data.data.find((s) => s.id === sponsor1Id);
    assert(!!titleSponsorItem, 'First created sponsor is present in GET list');
    assert(titleSponsorItem?.sponsor_type === 'Title Sponsor', 'GET item includes sponsor_type = "Title Sponsor"');
    // 10. Edit Sponsor (POST & PUT /api/admin/sponsors)
    console.log('\n--- 10. Testing Edit Sponsor (POST again & PUT) ---');
    // Update name and link via POST /api/admin/sponsors with id (sending POST api again)
    const editPostMp = buildMultipart(
      { id: String(sponsor1Id), name: 'Updated Alpha via POST again', sponsor_type: 'Title Sponsor', link: 'https://post-updated.example.com' }
    );
    const editPostRes = await request('POST', '/api/admin/sponsors', {
      ...authHeaders,
      'Content-Type': editPostMp.contentType,
    }, editPostMp.body);
    assert(editPostRes.status === 200, 'POST /api/admin/sponsors with id updates sponsor details with 200 OK');
    assert(editPostRes.data?.data?.name === 'Updated Alpha via POST again', 'Sponsor name successfully updated via POST');
    assert(editPostRes.data?.data?.link === 'https://post-updated.example.com', 'Sponsor link successfully updated via POST');

    // Attempt to update sponsor1's type to 'Gold Sponsor' (which is held by sponsor2) -> must reject with 409
    const editDupRes = await request('POST', '/api/admin/sponsors', {
      ...authHeaders,
      'Content-Type': 'application/json',
    }, JSON.stringify({ id: sponsor1Id, sponsor_type: 'Gold Sponsor' }));
    assert(editDupRes.status === 409, 'POST rejecting duplicate sponsor_type returns 409 Conflict');

    // Update with replacement logo via multipart POST /api/admin/sponsors
    const editMp = buildMultipart(
      { id: String(sponsor1Id), name: 'Alpha Brand Replaced Logo', sponsor_type: 'Title Sponsor' },
      { name: 'logo', filename: 'replacement.png', contentType: 'image/png', buffer: validPng }
    );
    const editMpRes = await request('POST', '/api/admin/sponsors', {
      ...authHeaders,
      'Content-Type': editMp.contentType,
    }, editMp.body);
    assert(editMpRes.status === 200, 'POST with replacement logo and id returns 200 OK');
    assert(editMpRes.data?.data?.logo?.startsWith('/uploads/sponsors/'), 'Replacement logo saved in /uploads/sponsors/');

    // 11. Deletion and Freeing of Sponsor Type
    console.log('\n--- 11. Deleting Sponsor Frees Sponsor Type ---');
    const delRes = await request('DELETE', `/api/admin/sponsors/${sponsor1Id}`, authHeaders);
    assert(delRes.status === 200, 'DELETE /api/admin/sponsors/:id returns 200 OK');
    assert(delRes.data.success === true, 'DELETE response contains success: true');

    // Verify record removed from DB
    const [checkDb] = await pool.query('SELECT id FROM sponsors WHERE id = ?', [sponsor1Id]);
    assert(checkDb.length === 0, 'Sponsor record permanently removed from database');

    // Verify logo file removed from disk
    const fileStillPresent = fs.existsSync(diskFile1);
    assert(!fileStillPresent, 'Sponsor logo file safely deleted from disk');

    // 12. Verify "Title Sponsor" is now available again!
    console.log('\n--- 11. Re-assigning Newly Available Sponsor Type ---');
    const reassignMp = buildMultipart(
      { name: 'New Title Sponsor', sponsor_type: 'Title Sponsor', category_id: String(testCategory.id) },
      { name: 'logo', filename: 'new_title.png', contentType: 'image/png', buffer: validPng }
    );
    const reassignRes = await request('POST', '/api/admin/sponsors', {
      ...authHeaders,
      'Content-Type': reassignMp.contentType,
    }, reassignMp.body);
    assert(
      reassignRes.status === 201,
      'Deleted sponsor type ("Title Sponsor") is available again and can be assigned to a new sponsor',
      reassignRes.data?.message
    );
    if (reassignRes.status === 201) createdSponsorIds.push(reassignRes.data.data.id);

  } finally {
    // Cleanup created test records
    console.log('\n--- Cleaning up test records ---');
    for (const id of createdSponsorIds) {
      await pool.query('DELETE FROM sponsors WHERE id = ?', [id]).catch(() => {});
      await pool.query('DELETE FROM category_sponsors WHERE sponsor_id = ?', [id]).catch(() => {});
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
      console.log('✓ Test Express server closed');
    }
  }

  console.log('\n====================================================');
  console.log(`📊 FINAL TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
