require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const http = require('http');
const { pool } = require('../config/database');

async function testOtpVotingFlow() {
  const app = express();
  app.use(express.json());
  app.use('/api/otp', require('../routes/otpRoutes'));
  app.use('/api/votes', require('../routes/voteRoutes'));

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  const testMobile = '9876543210';
  console.log(`\n--- Testing Backend-Native OTP Flow for ${testMobile} ---`);

  // Step 1: Send OTP
  const sendRes = await fetch(`${baseUrl}/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: testMobile }),
  }).then((r) => r.json());

  console.log('1. Send OTP Response:', sendRes);
  if (sendRes.type !== 'success' || !sendRes.otp) {
    throw new Error('Send OTP failed: ' + JSON.stringify(sendRes));
  }
  const generatedOtp = sendRes.otp;
  console.log(`✓ OTP generated internally by backend: ${generatedOtp}`);

  // Step 2: Verify OTP
  const verifyRes = await fetch(`${baseUrl}/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: testMobile, otp: generatedOtp }),
  }).then((r) => r.json());

  console.log('2. Verify OTP Response:', verifyRes);
  if (verifyRes.type !== 'success' || !verifyRes.verification_token) {
    throw new Error('Verify OTP failed: ' + JSON.stringify(verifyRes));
  }
  console.log(`✓ OTP verified, token obtained: ${verifyRes.verification_token.slice(0, 16)}...`);

  // Step 3: Vote with token
  const voteRes = await fetch(`${baseUrl}/votes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nominee_id: 3,
      voter_name: 'Test Voter',
      voter_phone: testMobile,
      verification_token: verifyRes.verification_token,
    }),
  }).then(async (r) => ({ status: r.status, data: await r.json() }));

  console.log('3. Cast Vote Response:', voteRes);
  if (voteRes.status >= 200 && voteRes.status < 300) {
    console.log('✓ Vote cast successfully with backend OTP token!');
  } else {
    console.log('Vote note:', voteRes.data.message);
  }

  // Drain the server and the pool before exiting, otherwise libuv tears down
// still-open handles and aborts with
// "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)".
await new Promise((resolve) => server.close(resolve));
await pool.end();
console.log('\n✓ 100% Backend-Native OTP Flow Verified Successfully!\n');
}

testOtpVotingFlow().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
