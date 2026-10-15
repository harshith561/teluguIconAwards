const https = require('https');

const BASE_URL = 'https://awards-production-13eb.up.railway.app';

const endpoints = [
  // 1. Core Health & System
  { category: 'Health & System', method: 'GET', path: '/api/health', expected: [200] },
  { category: 'Health & System', method: 'GET', path: '/api/settings', expected: [200] },
  { category: 'Health & System', method: 'GET', path: '/api/unknown-catchall-probe', expected: [404] },

  // 2. Categories
  { category: 'Categories', method: 'GET', path: '/api/categories', expected: [200] },
  { category: 'Categories', method: 'GET', path: '/api/categories/jury', expected: [200] },
  { category: 'Categories', method: 'GET', path: '/api/categories/self-nomination', expected: [200] },
  { category: 'Categories', method: 'GET', path: '/api/categories/curated', expected: [200] },
  { category: 'Categories', method: 'GET', path: '/api/categories/peoples-choice', expected: [200] },
  { category: 'Categories', method: 'GET', path: '/api/categories/top-digital-creator-male', expected: [200, 404] },

  // 3. Nominees
  { category: 'Nominees', method: 'GET', path: '/api/nominees', expected: [200] },
  { category: 'Nominees', method: 'GET', path: '/api/nominees/featured', expected: [200] },

  // 4. Ticketing & Booking
  { category: 'Ticketing', method: 'GET', path: '/api/tickets/availability', expected: [200] },
  { category: 'Ticketing', method: 'POST', path: '/api/tickets/book', body: {}, expected: [400] },
  { category: 'Ticketing', method: 'GET', path: '/api/tickets/order/non-existent-qr-token', expected: [404] },
  { category: 'Ticketing', method: 'POST', path: '/api/tickets/verify-entry', body: {}, expected: [400] },

  // 5. Sponsors & Lead Generation
  { category: 'Sponsors', method: 'GET', path: '/api/sponsors', expected: [200] },
  { category: 'Sponsor Leads', method: 'POST', path: '/api/sponsor-leads', body: { company: 'Audit Partner Inc', contact_person: 'Tester', mobile: '9876543210', email: 'partner@testaudit.com' }, expected: [201] },
  { category: 'Sponsor Leads', method: 'POST', path: '/api/sponsor-leads', body: {}, expected: [400] },

  // 6. Events, Gallery, Media, Awardees
  { category: 'Past Events', method: 'GET', path: '/api/past-events', expected: [200] },
  { category: 'Gallery', method: 'GET', path: '/api/gallery', expected: [200] },
  { category: 'Media', method: 'GET', path: '/api/media', expected: [200] },
  { category: 'Awardees', method: 'GET', path: '/api/awardees', expected: [200] },

  // 7. Contact Form
  { category: 'Contact', method: 'POST', path: '/api/contact', body: { name: 'Audit Bot', email: 'audit@test.com', message: 'Automated health verification' }, expected: [201] },
  { category: 'Contact', method: 'POST', path: '/api/contact', body: {}, expected: [400] },

  // 8. OTP, Voting & Nomination Validation
  { category: 'OTP Service', method: 'POST', path: '/api/otp/send', body: {}, expected: [400] },
  { category: 'OTP Service', method: 'POST', path: '/api/otp/verify', body: {}, expected: [400] },
  { category: 'Public Voting', method: 'POST', path: '/api/votes', body: {}, expected: [400, 401] },
  { category: 'Nominations', method: 'POST', path: '/api/nominations', body: {}, expected: [400, 401] },

  // 9. Auth & Admin Security (Strict Middleware Verification)
  { category: 'Security (Auth)', method: 'GET', path: '/api/auth/me', expected: [401] },
  { category: 'Security (Admin)', method: 'GET', path: '/api/admin/overview', expected: [401] },
  { category: 'Security (Admin)', method: 'GET', path: '/api/admin/nominations', expected: [401] },
  { category: 'Security (Admin)', method: 'GET', path: '/api/admin/votes', expected: [401] },
  { category: 'Security (Admin)', method: 'GET', path: '/api/admin/tickets', expected: [401] },
  { category: 'Security (Admin)', method: 'GET', path: '/api/admin/sms-templates', expected: [401] },
];

function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const url = new URL(endpoint.path, BASE_URL);
    const postData = endpoint.body ? JSON.stringify(endpoint.body) : null;

    const options = {
      method: endpoint.method,
      headers: {
        'Accept': 'application/json',
        ...(postData ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        } : {})
      },
      timeout: 10000
    };

    const startTime = Date.now();
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const duration = Date.now() - startTime;
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data.substring(0, 80);
        }

        const isExpected = endpoint.expected.includes(res.statusCode);
        let summary = '';
        if (Array.isArray(parsed)) {
          summary = `Array(${parsed.length} items)`;
        } else if (parsed && typeof parsed === 'object') {
          summary = parsed.message || parsed.status || Object.keys(parsed).slice(0, 4).join(', ');
        } else {
          summary = String(parsed).slice(0, 40);
        }

        resolve({
          category: endpoint.category,
          path: endpoint.path,
          method: endpoint.method,
          status: res.statusCode,
          duration: `${duration}ms`,
          isExpected,
          summary,
          data: parsed
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        category: endpoint.category,
        path: endpoint.path,
        method: endpoint.method,
        status: 'TIMEOUT',
        duration: '>10000ms',
        isExpected: false,
        summary: 'Request timed out'
      });
    });

    req.on('error', (err) => {
      resolve({
        category: endpoint.category,
        path: endpoint.path,
        method: endpoint.method,
        status: 'ERROR',
        duration: `${Date.now() - startTime}ms`,
        isExpected: false,
        summary: err.message
      });
    });

    if (postData) req.write(postData);
    req.end();
  });
}

async function runAudit() {
  console.log(`\n======================================================`);
  console.log(`Live Railway Deployment Audit: ${BASE_URL}`);
  console.log(`======================================================\n`);

  const results = [];
  for (const ep of endpoints) {
    const res = await testEndpoint(ep);
    results.push(res);
    const icon = res.isExpected ? '✅' : '❌';
    console.log(`${icon} [${res.status}] [${res.method.padEnd(4)}] ${res.path.padEnd(40)} (${res.duration.padStart(6)}) -> ${res.summary}`);
  }

  console.log('\n======================================================');
  console.log('AUDIT SUMMARY');
  console.log('======================================================');
  const passed = results.filter(r => r.isExpected).length;
  console.log(`Total Endpoints Tested : ${results.length}`);
  console.log(`Operational & Verified : ${passed} / ${results.length} (${Math.round((passed / results.length) * 100)}%)`);
  console.log(`Unexpected / Failed    : ${results.length - passed}`);

  const byCategory = {};
  results.forEach(r => {
    byCategory[r.category] = byCategory[r.category] || [];
    byCategory[r.category].push(r);
  });

  console.log('\nModule Health Breakdown:');
  for (const [cat, items] of Object.entries(byCategory)) {
    const allPass = items.every(i => i.isExpected);
    console.log(`  ${allPass ? '✓' : '✗'} ${cat.padEnd(25)}: ${items.filter(i => i.isExpected).length}/${items.length} operational`);
  }
}

runAudit();
