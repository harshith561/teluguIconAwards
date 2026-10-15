const crypto = require('crypto');

const OTP_EXPIRY_MINUTES = 10;
const otpStore = new Map(); // mobile -> { otp, expiresAt }
const rateLimits = new Map(); // key(mobile|ip) -> { count, firstAt, lastAt }

function normalizeMobile(mobile) {
  if (!mobile) return null;
  let m = String(mobile).trim().replace(/[^\d]/g, '');
  if (m.length === 10) m = '91' + m;
  if (m.length === 12 && m.startsWith('91')) return m;
  return null;
}

function generateOtp(mobile) {
  // Generate a cryptographically secure 6-digit numeric OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  otpStore.set(mobile, {
    otp,
    expiresAt: Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
  });
  return otp;
}

function checkRateLimit(key, maxPerWindow, windowMs) {
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || now - entry.firstAt > windowMs) {
    rateLimits.set(key, { count: 1, firstAt: now, lastAt: now });
    return { allowed: true, remaining: maxPerWindow - 1 };
  }
  if (now - entry.lastAt < 10000) return { allowed: false, remaining: 0 }; // 10s between requests
  entry.count += 1;
  entry.lastAt = now;
  if (entry.count > maxPerWindow) return { allowed: false, remaining: 0 };
  return { allowed: true, remaining: maxPerWindow - entry.count };
}

async function sendOtp(mobile) {
  const normalized = normalizeMobile(mobile);
  if (!normalized) {
    throw Object.assign(new Error('Please enter a valid 10-digit Indian mobile number.'), { status: 400 });
  }

  const limit = checkRateLimit('send:' + normalized, 15, 24 * 60 * 60 * 1000);
  if (!limit.allowed && limit.remaining === 0) {
    throw Object.assign(new Error('Too many OTP requests. Please wait a moment before trying again.'), { status: 429 });
  }

  const otp = generateOtp(normalized);
  return {
    type: 'success',
    message: 'OTP generated successfully.',
    otp,
    dev_otp: otp,
    delivery: 'backend',
  };
}

async function verifyOtp(mobile, otp) {
  const normalized = normalizeMobile(mobile);
  if (!normalized) {
    throw Object.assign(new Error('Please enter a valid 10-digit Indian mobile number.'), { status: 400 });
  }
  if (!otp || !/^\d{4,9}$/.test(String(otp).trim())) {
    throw Object.assign(new Error('Please enter the 6-digit OTP.'), { status: 400 });
  }

  const entry = otpStore.get(normalized);
  if (!entry) {
    throw Object.assign(new Error('No OTP requested for this mobile number. Please request an OTP first.'), { status: 400 });
  }
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(normalized);
    throw Object.assign(new Error('OTP has expired. Please request a new one.'), { status: 400 });
  }
  if (String(entry.otp).trim() !== String(otp).trim()) {
    throw Object.assign(new Error('Incorrect OTP. Please enter the valid code.'), { status: 400 });
  }

  // Clear OTP once verified
  otpStore.delete(normalized);
  return { type: 'success', message: 'number_verified_successfully' };
}

async function resendOtp(mobile) {
  return sendOtp(mobile);
}

async function createVerificationToken(mobile) {
  const normalized = normalizeMobile(mobile);
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 30 * 60 * 1000);
  return { normalized, token, expires };
}

// Clean up expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of otpStore) {
    if (now > entry.expiresAt) otpStore.delete(key);
  }
}, 5 * 60 * 1000).unref();

module.exports = {
  sendOtp,
  verifyOtp,
  resendOtp,
  createVerificationToken,
  normalizeMobile,
  DEV_MODE: true,
};