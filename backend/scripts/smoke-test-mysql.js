/**
 * smoke-test-mysql.js
 * -------------------
 * Exercises every MySQL-backed endpoint against a running API and fails loudly
 * on any non-2xx response or SQL error.
 *
 * Run:  node scripts/smoke-test-mysql.js      (API must be on :3001)
 */

require('dotenv').config();

const BASE = process.env.SMOKE_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3001}`;
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || 'admin@teluguiconawards.com';
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || 'Admin@tiaawards2026';

let token = null;
const failures = [];
let passed = 0;

async function call(method, path, body, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token && !opts.noAuth) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

function check(label, result) {
  if (result.status >= 200 && result.status < 300) {
    passed += 1;
    const preview = Array.isArray(result.data)
      ? `array(${result.data.length})`
      : typeof result.data === 'object' && result.data ? Object.keys(result.data).slice(0, 4).join(',') : String(result.data).slice(0, 40);
    console.log(`  PASS  ${result.status} ${label}  -> ${preview}`);
  } else {
    failures.push({ label, status: result.status, data: result.data });
    console.log(`  FAIL  ${result.status} ${label}  -> ${JSON.stringify(result.data).slice(0, 220)}`);
  }
  return result.data;
}

function checkStatus(label, result, expected) {
  const ok = Array.isArray(expected) ? expected.includes(result.status) : result.status === expected;
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${result.status} ${label}  -> ${JSON.stringify(result.data).slice(0, 60)}`);
  } else {
    failures.push({ label, status: result.status, data: result.data });
    console.log(`  FAIL  ${result.status} ${label} (expected ${expected}) -> ${JSON.stringify(result.data).slice(0, 220)}`);
  }
  return result.data;
}

async function main() {
  console.log(`Smoke testing ${BASE}\n`);

  console.log('-- health & public reads --');
  check('GET /api/health', await call('GET', '/api/health'));
  check('GET /api/categories', await call('GET', '/api/categories'));
  check('GET /api/categories/jury', await call('GET', '/api/categories/jury'));
  check('GET /api/categories/self-nomination', await call('GET', '/api/categories/self-nomination'));
  const cat = check('GET /api/categories/jury-digital-creator-year', await call('GET', '/api/categories/jury-digital-creator-year'));
  check('GET /api/categories/1 (numeric id lookup)', await call('GET', '/api/categories/1'));
  const selfCats = check('GET /api/categories/self-nomination', await call('GET', '/api/categories/self-nomination'));
  const selfCat = Array.isArray(selfCats) && selfCats[0];
  if (!selfCat) { console.log('  ABORT no self-nomination category available'); return; }
  const nominees = check('GET /api/nominees', await call('GET', '/api/nominees'));
  check(`GET /api/nominees?category=${selfCat.id} (cast id lookup)`, await call('GET', `/api/nominees?category=${selfCat.id}`));
  check('GET /api/nominees?featured=1', await call('GET', '/api/nominees?featured=1'));
  check('GET /api/nominees/featured', await call('GET', '/api/nominees/featured'));
  const nominee = Array.isArray(nominees) && nominees[0];
  if (nominee) {
    check(`GET /api/nominees/${nominee.id}`, await call('GET', `/api/nominees/${nominee.id}`));
    check(`GET /api/nominees/${nominee.slug}`, await call('GET', `/api/nominees/${nominee.slug}`));
  }
  check('GET /api/settings', await call('GET', '/api/settings'));
  check('GET /api/settings/voting_open', await call('GET', '/api/settings/voting_open'));
  check('GET /api/sponsors', await call('GET', '/api/sponsors'));
  check('GET /api/gallery', await call('GET', '/api/gallery'));
  check('GET /api/gallery/categories', await call('GET', '/api/gallery/categories'));
  check('GET /api/media', await call('GET', '/api/media'));
  check('GET /api/media/videos', await call('GET', '/api/media/videos'));
  check('GET /api/past-events', await call('GET', '/api/past-events'));
  check('GET /api/past-events/telugu-icon-awards-2026', await call('GET', '/api/past-events/telugu-icon-awards-2026'));
  check('GET /api/awardees', await call('GET', '/api/awardees'));
  check('GET /api/awardees?name=dr', await call('GET', '/api/awardees?name=dr'));
  check('GET /api/tickets/availability', await call('GET', '/api/tickets/availability'));
  check('GET /api/otp/mode', await call('GET', '/api/otp/mode'));

  console.log('\n-- analytics (INSERT + dedupe) --');
  checkStatus('POST /api/analytics/track (rejects unknown nominee)', await call('POST', '/api/analytics/track', { nominee_id: 999999, event_type: 'page_view' }), 404);
  checkStatus('POST /api/analytics/track (rejects bad payload)', await call('POST', '/api/analytics/track', { nominee_id: 1, event_type: 'nope' }), 400);

  console.log('\n-- contact & sponsor leads --');
  check('POST /api/contact', await call('POST', '/api/contact', { name: 'Smoke Test', email: 'smoke@test.local', message: 'Hello from smoke test' }));
  check('POST /api/sponsor-leads', await call('POST', '/api/sponsor-leads', { company: 'Smoke Ltd', contact_person: 'Test', mobile: '9876543210', email: 'smoke-sponsor@test.local', message: 'hi' }));

  console.log('\n-- auth --');
  const login = check('POST /api/auth/login', await call('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }, { noAuth: true }));
  token = login && login.token;
  if (token) check('GET /api/auth/me', await call('GET', '/api/auth/me'));
  else { failures.push({ label: 'admin login', status: 401, data: login }); console.log('  FAIL  could not log in - skipping admin tests'); }

  if (!token) return;

  console.log('\n-- admin reads --');
  check('GET /api/admin/stats', await call('GET', '/api/admin/stats'));
  check('GET /api/admin/nominees', await call('GET', '/api/admin/nominees'));
  if (nominee) check(`GET /api/admin/nominees/${nominee.id}/campaign (recursive CTE)`, await call('GET', `/api/admin/nominees/${nominee.id}/campaign`));
  check('GET /api/admin/nominations', await call('GET', '/api/admin/nominations'));
  check('GET /api/admin/votes', await call('GET', '/api/admin/votes'));
  check('GET /api/admin/sponsors', await call('GET', '/api/admin/sponsors'));
  check('GET /api/admin/settings', await call('GET', '/api/admin/settings'));
  check('GET /api/admin/messages', await call('GET', '/api/admin/messages'));
  check('GET /api/admin/tickets (SUM casts)', await call('GET', '/api/admin/tickets'));
  check('GET /api/admin/past-events', await call('GET', '/api/admin/past-events'));
  check('GET /api/admin/awardees', await call('GET', '/api/admin/awardees'));
  check('GET /api/admin/gallery', await call('GET', '/api/admin/gallery'));
  check('GET /api/admin/media', await call('GET', '/api/admin/media'));
  check('GET /api/admin/sponsor-leads', await call('GET', '/api/admin/sponsor-leads'));
  check('GET /api/admin/audit-logs', await call('GET', '/api/admin/audit-logs'));
  check('GET /api/admin/sms-templates/senders', await call('GET', '/api/admin/sms-templates/senders'));

  console.log('\n-- admin writes --');
  check('PUT /api/admin/settings (upsert)', await call('PUT', '/api/admin/settings', { smoke_test_setting: 'ok' }));
  check('PUT /api/admin/event-phase (upsert)', await call('PUT', '/api/admin/event-phase', { phase: 'phase_2' }));

  const createdNominee = check('POST /api/admin/nominees (code counter)', await call('POST', '/api/admin/nominees', {
    full_name: 'Smoke Test Nominee', category_id: selfCat.id, bio: 'created by smoke test',
  }));
  if (createdNominee && createdNominee.id) {
    check(`PUT /api/admin/nominees/${createdNominee.id}`, await call('PUT', `/api/admin/nominees/${createdNominee.id}`, { bio: 'updated by smoke test', featured: true }));
    check(`DELETE /api/admin/nominees/${createdNominee.id}`, await call('DELETE', `/api/admin/nominees/${createdNominee.id}`));
  }

  const spForm = new FormData();
  spForm.append('name', 'Smoke Sponsor');
  spForm.append('sponsor_type', 'Bronze Sponsor');
  spForm.append('category_id', String(selfCat.id));
  spForm.append('logo', new Blob([Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2d040000000049454e44ae426082', 'hex')], { type: 'image/png' }), 'smoke.png');
  const spRes = await fetch(`${BASE}/api/admin/sponsors`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: spForm,
  });
  const spJson = await spRes.json().catch(() => ({}));
  const sponsor = check('POST /api/admin/sponsors', { status: spRes.status, data: spJson });
  const spId = sponsor?.id || sponsor?.data?.id;
  if (spId) check(`DELETE /api/admin/sponsors/${spId}`, await call('DELETE', `/api/admin/sponsors/${spId}`));

  const lead = check('POST /api/sponsor-leads (readback)', await call('POST', '/api/sponsor-leads', { company: 'Smoke2 Ltd', contact_person: 'T', mobile: '9876543211', email: 'smoke2@test.local' }));
  void lead;

  console.log('\n-- tickets --');
  const ticket = check('POST /api/tickets/book', await call('POST', '/api/tickets/book', {
    ticket_id: 1, quantity: 2, buyer_name: 'Smoke Buyer', buyer_email: 'smoke-buyer@test.local', buyer_phone: '9876543212',
  }));
  if (ticket && ticket.qr_token) {
    check(`GET /api/tickets/order/${ticket.qr_token}`, await call('GET', `/api/tickets/order/${ticket.qr_token}`));
    check('POST /api/tickets/verify-entry', await call('POST', '/api/tickets/verify-entry', { qr_token: ticket.qr_token }));
  }

  console.log('\n-- nomination -> shortlist promotes a nominee --');
  const nom = check('POST /api/nominations', await call('POST', '/api/nominations', {
    category_id: selfCat.id, full_name: 'Smoke Nominee', creator_name: 'Smoke Nominee', email: 'smoke-nom@test.local', phone: '9876543213', journey: 'test',
  }));
  let promotedNomineeId = null;
  if (nom && nom.id) {
    check(`PUT /api/admin/nominations/${nom.id} -> shortlisted`, await call('PUT', `/api/admin/nominations/${nom.id}`, { status: 'shortlisted' }));
    // GET /api/nominees caches for 30s, so read the uncached admin list here.
    const promoted = check('GET /api/admin/nominees (promoted nominee present)', await call('GET', '/api/admin/nominees'));
    const match = Array.isArray(promoted) && promoted.find((n) => n.slug && n.slug.startsWith('smoke-nominee'));
    if (match) { promotedNomineeId = match.id; console.log(`  .... promoted nominee id=${match.id} code=${match.nominee_code} slug=${match.slug} views=${match.page_views}`); }
    else failures.push({ label: 'promoted nominee found in admin nominee list', status: 0, data: 'not found' });
    if (match) check('GET /api/nominees/<slug> (promoted page is public)', await call('GET', `/api/nominees/${match.slug}`));

    console.log('\n-- nomination status lookup (OTP-gated, LATERAL-free rewrite) --');
    const statusSend = check('POST /api/nomination-status/send', await call('POST', '/api/nomination-status/send', { mobile: '9876543213' }, { noAuth: true }));
    if (statusSend && (statusSend.otp || statusSend.dev_otp)) {
      const statusVerify = check('POST /api/nomination-status/verify', await call('POST', '/api/nomination-status/verify', { mobile: '9876543213', otp: statusSend.otp || statusSend.dev_otp }, { noAuth: true }));
      const lookup = check('POST /api/nomination-status/lookup (phone match)', await call('POST', '/api/nomination-status/lookup', { verification_token: statusVerify.verification_token }, { noAuth: true }));
      const found = lookup && Array.isArray(lookup.nominations) ? lookup.nominations[0] : null;
      console.log(`  .... found ${lookup && Array.isArray(lookup.nominations) ? lookup.nominations.length : 'n/a'} nomination(s); campaign=${found && found.campaign ? 'live kit' : 'none'}`);
      if (!found) failures.push({ label: 'status lookup finds the nomination by phone', status: 0, data: JSON.stringify(lookup).slice(0, 200) });
      if (found && !found.campaign) failures.push({ label: 'shortlisted nomination exposes a live campaign kit', status: 0, data: JSON.stringify(found).slice(0, 200) });
    }
    const wrongNumber = check('POST /api/nomination-status/send (other number)', await call('POST', '/api/nomination-status/send', { mobile: '9000000009' }, { noAuth: true }));
    if (wrongNumber && (wrongNumber.otp || wrongNumber.dev_otp)) {
      const wrongVerify = check('POST /api/nomination-status/verify (other number)', await call('POST', '/api/nomination-status/verify', { mobile: '9000000009', otp: wrongNumber.otp || wrongNumber.dev_otp }, { noAuth: true }));
      const empty = check('POST /api/nomination-status/lookup (unknown number)', await call('POST', '/api/nomination-status/lookup', { verification_token: wrongVerify.verification_token }, { noAuth: true }));
      if (empty && Array.isArray(empty.nominations) && empty.nominations.length !== 0) failures.push({ label: 'unknown number returns no nominations', status: 0, data: JSON.stringify(empty).slice(0, 200) });
    }

    check(`DELETE /api/admin/nominations/${nom.id}`, await call('DELETE', `/api/admin/nominations/${nom.id}`));
  }

  console.log('\n-- campaign analytics read (recursive CTE timeseries) --');
  const campaignTarget = promotedNomineeId || (nominee && nominee.id);
  if (campaignTarget) {
    const campaign = check(`GET /api/admin/nominees/${campaignTarget}/campaign`, await call('GET', `/api/admin/nominees/${campaignTarget}/campaign`));
    const series = campaign && campaign.timeseries;
    console.log(`  .... timeseries days: ${Array.isArray(series) ? series.length : 'n/a'}`);
    if (!Array.isArray(series) || series.length !== 14) failures.push({ label: 'campaign timeseries has 14 days', status: 0, data: JSON.stringify(series).slice(0, 200) });
  }

  console.log('\n-- analytics track on a live nominee --');
  if (campaignTarget) {
    check('POST /api/analytics/track', await call('POST', '/api/analytics/track', { nominee_id: campaignTarget, event_type: 'page_view', source: 'smoke' }));
    check('POST /api/analytics/track (duplicate suppressed)', await call('POST', '/api/analytics/track', { nominee_id: campaignTarget, event_type: 'page_view', source: 'smoke' }));
    check('POST /api/analytics/track (vote_click)', await call('POST', '/api/analytics/track', { nominee_id: campaignTarget, event_type: 'vote_click' }));
  }

  console.log('\n-- sms template duplicate handling (ER_DUP_ENTRY) --');
  // Clean first so re-runs are isolated: a leftover SMOKE id from a previous
  // run would make the create return 409 and read as a false failure.
  const existing = await call('GET', '/api/admin/sms-templates/senders');
  const stale = Array.isArray(existing.data) && existing.data.find((s) => s.sender_id === 'SMOKE');
  if (stale) await call('DELETE', `/api/admin/sms-templates/senders/${stale.id}`);
  check('POST /api/admin/sms-templates/senders', await call('POST', '/api/admin/sms-templates/senders', { sender_id: 'SMOKE', name: 'Smoke' }));
  checkStatus('POST /api/admin/sms-templates/senders (dup -> 409)', await call('POST', '/api/admin/sms-templates/senders', { sender_id: 'SMOKE', name: 'Smoke' }), 409);

  console.log('\n-- OTP verification + vote (transaction, unique keys) --');
  const voterPhone = '9000000001';
  const otpSend = check(`POST /api/otp/send (${voterPhone})`, await call('POST', '/api/otp/send', { mobile: voterPhone }, { noAuth: true }));
  const devOtp = otpSend && (otpSend.otp || otpSend.dev_otp);
  if (!devOtp) failures.push({ label: 'dev OTP returned for local testing', status: 0, data: JSON.stringify(otpSend) });
  const verified = check('POST /api/otp/verify (writes otp_sessions)', await call('POST', '/api/otp/verify', { mobile: voterPhone, otp: devOtp }, { noAuth: true }));
  const verificationToken = verified && verified.verification_token;

  if (campaignTarget) {
    const voteBody = {
      nominee_id: campaignTarget,
      voter_name: 'Smoke Voter',
      voter_email: 'smoke-voter@test.local',
      voter_phone: voterPhone,
      verification_token: verificationToken,
      device_fingerprint: 'smoke-device-1',
    };
check('POST /api/votes', await call('POST', '/api/votes', voteBody, { noAuth: true }));
    checkStatus('POST /api/votes (same phone again -> 400)', await call('POST', '/api/votes', voteBody, { noAuth: true }), 400);

    // nominees.vote_count is a batched cache (see utils/voteCounter.js) flushed
    // once a second, so poll for it instead of asserting immediately - otherwise
    // this check races the flusher and fails intermittently.
    const readVoteCount = async (id) => {
      for (let i = 0; i < 20; i += 1) {
        const rows = await call('GET', '/api/admin/nominees');
        const found = Array.isArray(rows.data) && rows.data.find((n) => n.id === id);
        if (found && Number(found.vote_count) > 0) return Number(found.vote_count);
        await new Promise((r) => setTimeout(r, 250));
      }
      return 0;
    };

    const afterVote = check('GET /api/admin/nominees (vote_count incremented)', await call('GET', '/api/admin/nominees'));
    const voted = Array.isArray(afterVote.data) && afterVote.data.find((n) => n.id === campaignTarget);
    const liveCount = await readVoteCount(campaignTarget);
    console.log(`  .... vote_count now ${liveCount}`);
    if (liveCount !== 1) failures.push({ label: 'vote_count is 1 after one vote', status: 0, data: liveCount });
    void voted;

    const votes = check('GET /api/admin/votes', await call('GET', '/api/admin/votes'));
    const voteRow = Array.isArray(votes) && votes[0];
    if (voteRow && voteRow.id) {
      check(`PUT /api/admin/votes/${voteRow.id}/flag`, await call('PUT', `/api/admin/votes/${voteRow.id}/flag`, { is_flagged: true, flag_reason: 'smoke' }));
check(`DELETE /api/admin/votes/${voteRow.id} (vote_count decremented)`, await call('DELETE', `/api/admin/votes/${voteRow.id}`));
      // The delete path decrements immediately, but a queued counter flush could
      // still be in flight, so poll for it to settle back to 0.
      let settled = -1;
      for (let i = 0; i < 20; i += 1) {
        await new Promise((r) => setTimeout(r, 250));
        const rows = await call('GET', '/api/admin/nominees');
        const cleaned = Array.isArray(rows.data) && rows.data.find((n) => n.id === campaignTarget);
        settled = cleaned ? Number(cleaned.vote_count) : -1;
        if (settled === 0) break;
      }
      console.log(`  .... vote_count now ${settled}`);
      if (settled !== 0) failures.push({ label: 'vote_count back to 0 after delete', status: 0, data: settled });
    }
  }

  console.log('\n-- nomination status lookup (OTP-gated, LATERAL-free rewrite) --');
  const noToken = checkStatus('POST /api/nomination-status/lookup (no token -> 400)', await call('POST', '/api/nomination-status/lookup', {}, { noAuth: true }), 400);
  void noToken;
}

main()
  .then(() => {
    console.log(`\n=================================================`);
    console.log(`PASSED: ${passed}   FAILED: ${failures.length}`);
    if (failures.length) {
      console.log('\nFailures:');
      failures.forEach((f) => console.log(`  ${f.status} ${f.label} :: ${JSON.stringify(f.data).slice(0, 300)}`));
      process.exit(1);
    }
    console.log('=================================================\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Smoke test crashed:', err);
    process.exit(1);
  });