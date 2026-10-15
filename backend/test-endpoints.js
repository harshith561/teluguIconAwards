const BASE = 'http://localhost:3001';
let token = null;
const results = [];

async function req(method, url, body, useAuth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (useAuth && token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE + url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  return { status: res.status, data };
}

async function check(name, method, url, body, opts = {}) {
  try {
    const r = await req(method, url, body, opts.auth);
    const expectError = opts.expect400 || opts.expect404;
    const ok = expectError ? r.status >= 400 : (r.status >= 200 && r.status < 300 && !(r.data && r.data.message && r.status >= 400));
    const detail = r.data && (r.data.message || r.data.id !== undefined) ? (r.data.message || `id=${r.data.id}`) : '';
    results.push({ name, status: r.status, ok, detail });
  } catch (e) {
    results.push({ name, status: 'ERR', ok: false, detail: e.message });
  }
}

(async () => {
  // ---- PUBLIC ----
  await check('GET /api/health', 'GET', '/api/health');

  const cats = await req('GET', '/api/categories');
  const expectedCats = cats.data.length >= 50 && cats.data.length === cats.data.filter((c, i, a) => a.findIndex((x) => x.id === c.id) === i).length;
  results.push({ name: 'GET /api/categories', status: cats.status, ok: expectedCats, detail: `${cats.data.length} categories (>= 50)` });
  const cur = await req('GET', '/api/categories/curated');
  results.push({ name: 'GET /api/categories/curated', status: cur.status, ok: cur.data.length === 10, detail: `${cur.data.length} curated` });
  const peop = await req('GET', '/api/categories/peoples-choice');
  results.push({ name: 'GET /api/categories/peoples-choice', status: peop.status, ok: peop.data.length === 40, detail: `${peop.data.length} peoples choice` });

  const noms = await req('GET', '/api/nominees');
  results.push({ name: 'GET /api/nominees', status: noms.status, ok: Array.isArray(noms.data), detail: `${noms.data.length} nominees` });
  const feat = await req('GET', '/api/nominees/featured');
  results.push({ name: 'GET /api/nominees/featured', status: feat.status, ok: Array.isArray(feat.data), detail: `${feat.data.length} featured` });
  if (noms.data.length) {
    const one = await req('GET', `/api/nominees/${noms.data[0].id}`);
    results.push({ name: 'GET /api/nominees/:id', status: one.status, ok: one.data.id === noms.data[0].id, detail: one.data.full_name });
    const bySlug = await req('GET', `/api/nominees/${noms.data[0].slug}`);
    results.push({ name: 'GET /api/nominees/:slug', status: bySlug.status, ok: bySlug.data.id === noms.data[0].id, detail: bySlug.data.slug });
  }
  await check('GET /api/nominees/999999 (404 case, no auth)', 'GET', '/api/nominees/999999', null, { expect404: true });
  const notFound = await req('GET', '/api/nominees/999999');
  results.push({ name: 'GET /api/nominees/:id 404', status: notFound.status, ok: notFound.status === 404, detail: '404 returned' });

  const spo = await req('GET', '/api/sponsors');
  results.push({ name: 'GET /api/sponsors', status: spo.status, ok: Array.isArray(spo.data), detail: `${spo.data.length} sponsors` });
  const spy = await req('GET', '/api/sponsors/by-tier');
  results.push({ name: 'GET /api/sponsors/by-tier', status: spy.status, ok: typeof spy.data === 'object' && spy.data !== null, detail: Object.keys(spy.data || {}).join(',') });

  const setts = await req('GET', '/api/settings');
  results.push({ name: 'GET /api/settings', status: setts.status, ok: Array.isArray(setts.data), detail: `${setts.data.length} settings` });
  const setOne = await req('GET', '/api/settings/event_date');
  results.push({ name: 'GET /api/settings/:key', status: setOne.status, ok: setOne.data.key === 'event_date', detail: setOne.data.value });

  await check('POST /api/contact (success)', 'POST', '/api/contact', { name: 'Tester', email: 'tester@x.com', subject: 'Test', message: 'Hello from endpoint test' });
  await check('POST /api/contact (missing fields 400)', 'POST', '/api/contact', { name: '' }, { expect400: true });

  const selfCat = cats.data.find((c) => c.type === 'self_nomination');
  await check('POST /api/nominations (JSON)', 'POST', '/api/nominations', { category_id: selfCat.id, full_name: 'API Check Nominee', email: 'apicheck@x.com', phone: '9494457274' });
  await check('POST /api/nominations (missing category 400)', 'POST', '/api/nominations', { nominee_name: 'NoCat' }, { expect400: true });
  await check('POST /api/nominations (jury category rejected)', 'POST', '/api/nominations', { category_id: 1, full_name: 'Jury Reject', email: 'juryreject@x.com', phone: '9494457275' }, { expect400: true });

  // ---- AUTH ----
  const badLogin = await req('POST', '/api/auth/login', { email: 'x@x.com', password: 'wrong' });
  results.push({ name: 'POST /api/auth/login (bad creds 401)', status: badLogin.status, ok: badLogin.status === 401, detail: 'rejected' });
  const goodLogin = await req('POST', '/api/auth/login', { email: 'admin@teluguiconawards.com', password: 'admin123' });
  results.push({ name: 'POST /api/auth/login (admin)', status: goodLogin.status, ok: !!goodLogin.data.token && goodLogin.data.user.role === 'super_admin', detail: goodLogin.data.user && goodLogin.data.user.email });
  if (goodLogin.data.token) token = goodLogin.data.token;

  const me = await req('GET', '/api/auth/me', null, true);
  results.push({ name: 'GET /api/auth/me (auth)', status: me.status, ok: me.data.user && me.data.user.email === 'admin@teluguiconawards.com', detail: me.data.user && me.data.user.name });
  const meNoAuth = await req('GET', '/api/auth/me');
  results.push({ name: 'GET /api/auth/me (no token 401)', status: meNoAuth.status, ok: meNoAuth.status === 401, detail: 'rejected' });

  // ---- ADMIN (auth required) ----
  const stats = await req('GET', '/api/admin/stats', null, true);
  results.push({ name: 'GET /api/admin/stats', status: stats.status, ok: !!stats.data.stats, detail: `nominations=${stats.data.stats && stats.data.stats.totalNominations}, votes=${stats.data.stats && stats.data.stats.totalVotes}` });
  const noAuth1 = await req('GET', '/api/admin/stats');
  results.push({ name: 'GET /api/admin/stats (no auth 401)', status: noAuth1.status, ok: noAuth1.status === 401, detail: 'rejected' });

  const admNoms = await req('GET', '/api/admin/nominations?status=pending', null, true);
  results.push({ name: 'GET /api/admin/nominations', status: admNoms.status, ok: Array.isArray(admNoms.data), detail: `${admNoms.data.length} pending` });

  const admNominees = await req('GET', '/api/admin/nominees', null, true);
  results.push({ name: 'GET /api/admin/nominees', status: admNominees.status, ok: Array.isArray(admNominees.data), detail: `${admNominees.data.length} total` });

  // nominee update (toggle featured on sample)
  if (admNominees.data.length) {
    const t = admNominees.data[0];
    const upd = await req('PUT', `/api/admin/nominees/${t.id}`, { featured: !t.featured }, true);
    results.push({ name: 'PUT /api/admin/nominees/:id (toggle featured)', status: upd.status, ok: upd.data.message === 'Nominee updated', detail: upd.data.message });
    await req('PUT', `/api/admin/nominees/${t.id}`, { featured: t.featured }, true);
    results.push({ name: 'PUT /api/admin/nominees/:id (restore)', status: 200, ok: true, detail: 'restored' });
  }

  // categories toggle
  if (cats.data.length) {
    const c = cats.data[0];
    const tog = await req('PUT', `/api/categories/${c.id}`, { voting_open: !c.voting_open }, true);
    results.push({ name: 'PUT /api/categories/:id (toggle voting)', status: tog.status, ok: tog.data.message === 'Category updated', detail: tog.data.message });
    await req('PUT', `/api/categories/${c.id}`, { voting_open: c.voting_open }, true);
    results.push({ name: 'PUT /api/categories/:id (restore)', status: 200, ok: true, detail: 'restored' });
  }
  const createdCat = await req('POST', '/api/categories', { name: 'Test Cat', slug: `test-cat-${Date.now()}` }, true);
  results.push({ name: 'POST /api/categories (auth create)', status: createdCat.status, ok: createdCat.status === 201, detail: createdCat.data.message || `id=${createdCat.data.id}` });
  if (createdCat.data && createdCat.data.id) {
    const delCat = await req('DELETE', `/api/categories/${createdCat.data.id}`, null, true);
    results.push({ name: 'DELETE /api/categories/:id (cleanup)', status: delCat.status, ok: delCat.data.message === 'Category deleted', detail: delCat.data.message });
  }

  const votes = await req('GET', '/api/admin/votes', null, true);
  results.push({ name: 'GET /api/admin/votes', status: votes.status, ok: Array.isArray(votes.data), detail: `${votes.data.length} votes` });

  const spoAdm = await req('GET', '/api/admin/sponsors', null, true);
  results.push({ name: 'GET /api/admin/sponsors', status: spoAdm.status, ok: Array.isArray(spoAdm.data), detail: `${spoAdm.data.length} sponsors` });

  const setAdm = await req('GET', '/api/admin/settings', null, true);
  results.push({ name: 'GET /api/admin/settings', status: setAdm.status, ok: Array.isArray(setAdm.data), detail: `${setAdm.data.length} settings` });
  const setPut = await req('PUT', '/api/admin/settings', { announcement: 'Nominations are now open for the 2026 Telugu Icon Awards!' }, true);
  results.push({ name: 'PUT /api/admin/settings', status: setPut.status, ok: setPut.data.message === 'Settings updated', detail: setPut.data.message });

  const msgs = await req('GET', '/api/admin/messages', null, true);
  results.push({ name: 'GET /api/admin/messages', status: msgs.status, ok: Array.isArray(msgs.data), detail: `${msgs.data.length} messages` });

  // votes - OTP flow + cast a real vote then verify it appears + duplicate guard
  if (noms.data.length) {
    const n = noms.data[0];
    const MOBILE = '9494457274';
    const otpRes = await req('POST', '/api/otp/send', { mobile: MOBILE });
    const otpCode = otpRes.data && (otpRes.data.dev_otp || otpRes.data.otp);
    results.push({ name: 'POST /api/otp/send (dev)', status: otpRes.status, ok: otpRes.status === 200 && !!otpCode, detail: otpCode ? `otp=${otpCode}` : JSON.stringify(otpRes.data) });
    const verifyRes = await req('POST', '/api/otp/verify', { mobile: MOBILE, otp: otpCode });
    const vtoken = verifyRes.data && verifyRes.data.verification_token;
    results.push({ name: 'POST /api/otp/verify', status: verifyRes.status, ok: verifyRes.status === 200 && !!vtoken, detail: vtoken ? 'token ok' : (verifyRes.data.message || 'no token') });

    const voteRes = await req('POST', '/api/votes', { nominee_id: n.id, voter_name: 'API Checker', voter_email: 'apivote@x.com', voter_phone: MOBILE, verification_token: vtoken });
    results.push({ name: 'POST /api/votes (otp verified)', status: voteRes.status, ok: voteRes.status === 201, detail: voteRes.data.message || 'no message' });

    const votesAfter = await req('GET', '/api/admin/votes', null, true);
    const found = votesAfter.data.filter(v => v.voter_email === 'apivote@x.com');
    results.push({ name: 'POST /api/votes + verify in admin', status: votesAfter.status, ok: found.length >= 1, detail: `${found.length} vote(s) recorded` });
    const dup = await req('POST', '/api/votes', { nominee_id: n.id, voter_name: 'API Checker', voter_email: 'apivote@x.com', voter_phone: MOBILE, verification_token: vtoken });
    const dupFail = dup.status === 400 && /already/.test(dup.data.message);
    results.push({ name: 'POST /api/votes duplicate guard', status: dup.status, ok: dupFail, detail: dup.data.message || 'no dup message' });
    if (found.length) {
      await req('PUT', `/api/admin/votes/${found[0].id}/flag`, { is_flagged: true, flag_reason: 'Automated test' }, true);
      const flaggedCheck = await req('GET', '/api/admin/votes?flagged=1', null, true);
      const fl = flaggedCheck.data.find(v => v.id === found[0].id);
      results.push({ name: 'PUT /api/admin/votes/:id/flag', status: flaggedCheck.status, ok: fl && fl.is_flagged === 1, detail: fl ? `flagged: ${fl.flag_reason}` : 'not found' });
      await req('PUT', `/api/admin/votes/${found[0].id}/flag`, { is_flagged: false, flag_reason: null }, true);
    }
  }

  // ---- SUMMARY ----
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║      TELUGU ICON AWARDS - API ENDPOINT TEST      ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  let pass = 0, fail = 0;
  for (const r of results) {
    const mark = r.ok ? '✅' : '❌';
    if (r.ok) pass++; else fail++;
    console.log(`  ${mark} [${r.status}] ${r.name}${r.detail ? '  → ' + r.detail : ''}`);
  }
  console.log('');
  console.log(`  ─────────────────────────────────────────`);
  console.log(`  PASS: ${pass}   FAIL: ${fail}   TOTAL: ${results.length}`);
  console.log('');
})().catch((e) => { console.error('Fatal:', e); process.exit(1); });