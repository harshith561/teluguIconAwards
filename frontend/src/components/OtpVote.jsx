import { useState, useEffect } from 'react';
import { api } from '../api';

function getDeviceFingerprint() {
  try {
    let fp = localStorage.getItem('tia_device_id');
    if (!fp) {
      fp = (crypto.randomUUID ? crypto.randomUUID() : `fp-${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/-/g, '').slice(0, 40);
      localStorage.setItem('tia_device_id', fp);
    }
    return fp.slice(0, 64);
  } catch (e) {
    return null;
  }
}

const DUPLICATE_HINTS = [
  'already voted in this category',
  'already voted',
];

const isDuplicateError = (message) =>
  DUPLICATE_HINTS.some((hint) => String(message || '').toLowerCase().includes(hint));

// The backend is unreachable when fetch itself rejects (API down, wrong port,
// CORS). That is very different from a rejected vote, so say which it is
// instead of the old "Network error. Please try again." that told the user
// nothing about what to actually check.
const UNREACHABLE =
  'Cannot reach the voting server. Please check that the backend is running on port 3001, then try again.';

export default function OtpVote({ nominee, onVoted, compact }) {
  const [mode, setMode] = useState('otp'); // 'otp' | 'device'
  const [step, setStep] = useState('details');
  const [voter, setVoter] = useState({ name: '', email: '', phone: '' });
  const [otp, setOtp] = useState('');
  const [onsiteCode, setOnsiteCode] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [duplicateInfo, setDuplicateInfo] = useState(null);

  const { phone } = voter;

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    api.get('/otp/mode').then((data) => {
      if (data && data.mode === 'device') setMode('device');
    }).catch(() => {});
  }, []);

  const sendOtp = async (resend) => {
    setError(null);
    setMessage(null);
    if (!resend && !/^[6-9]\d{9}$/.test(voter.phone.replace(/[^\d]/g, ''))) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    setLoading(true);
    try {
      // Ask the server whether this number has already voted in this category
      // BEFORE spending an SMS on it. Otherwise a repeat voter receives a real
      // OTP, types it, waits for verification, and only then gets told the vote
      // was going to be rejected.
      if (!resend) {
        const prior = await api.get(`/votes/check?phone=${encodeURIComponent(voter.phone)}&nominee_id=${nominee.id}`, { force: true });
        if (prior && prior.already_voted) {
          setDuplicateInfo(prior);
          setStep('duplicate');
          return;
        }
      }

      const res = await api.post('/otp/send', { mobile: voter.phone });
      if (res.type === 'success') {
        const code = res.dev_otp || res.otp || '';
        setOnsiteCode(code);
        setOtp(code);
        setMessage(`Verification code generated: ${code}`);
        setStep('otp');
      } else if (res.httpStatus === 429) {
        // The server enforces a 10s cooldown per mobile number. Start our own
        // countdown so the button explains itself instead of looking broken.
        setCooldown(10);
        setError(res.message || 'Please wait a few seconds before requesting another code.');
      } else {
        setError(res.message || 'Failed to generate OTP');
      }
    } catch (err) {
      setError(UNREACHABLE);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    if (!/^\d{4,9}$/.test(otp.trim())) { setError('Enter the OTP you received.'); return; }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.post('/otp/verify', { mobile: voter.phone, otp: otp.trim() });
      if (res.type === 'success') {
        setVerificationToken(res.verification_token);
        setOnsiteCode('');
        setMessage('Mobile verified. You can now cast your vote.');
        setStep('ready');
      } else {
        setError(res.message || 'Verification failed');
      }
    } catch (err) {
      setError(UNREACHABLE);
    } finally {
      setLoading(false);
    }
  };

  const castVote = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.post('/votes', {
        nominee_id: nominee.id,
        voter_name: voter.name,
        voter_email: voter.email,
        voter_phone: voter.phone,
        verification_token: mode === 'otp' ? verificationToken : undefined,
        device_fingerprint: getDeviceFingerprint(),
      });
      if (res.httpStatus && res.httpStatus >= 200 && res.httpStatus < 300) {
        setMessage(res.message);
        setError(null);
        setStep('done');
        if (onVoted) onVoted(res);
      } else {
        const why = res.message || 'Failed to record vote';
        setError(why);
        if (isDuplicateError(why)) {
          // Keep the verified session. Resetting to 'details' used to throw away
          // the OTP token and every field, so the only way back was a fresh OTP
          // request - which the server then rejected with "Too many OTP
          // requests" for 10 seconds. The voter just saw a broken form.
          // One verified mobile = one vote per category is the rule, so the
          // honest state is "already voted", not "start over".
          setDuplicateInfo({ nominee_name: nominee.full_name, category_name: nominee.category_name });
          setStep('duplicate');
        } else {
          setStep(verificationToken ? 'ready' : 'details');
        }
      }
    } catch (err) {
      setError(UNREACHABLE);
    } finally {
      setLoading(false);
    }
  };

  const shareText = 'I just voted for my favourite creator at the Telugu Icon Digital & Influencer Awards 2026. Support your favourite Telugu Digital Icon!';
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div>
      {message && !(step === 'done') && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-900/30 border border-emerald-500/40 text-emerald-200 text-sm">
          {message}
        </div>
      )}
      {error && step !== 'duplicate' && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-burgundy-900/50 border border-burgundy-500/40 text-white/80 text-sm">
          {error}
        </div>
      )}

      {step === 'done' ? (
        <div className="space-y-4">
          <div className="text-center py-4">
            <div className="text-5xl mb-3">✅</div>
            <h3 className="font-display text-2xl font-bold gold-text mb-2">Your Vote Has Been Recorded</h3>
            <p className="text-white/60 text-sm">
              Thank you for supporting the Telugu digital creator community.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-ink-800 p-4">
            <p className="text-sm text-white/40 mb-3">Support your icon — share this page:</p>
            <div className="grid grid-cols-2 gap-2">
              <a href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`} target="_blank" rel="noreferrer" className="btn-outline text-xs">WhatsApp</a>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer" className="btn-outline text-xs">Facebook</a>
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer" className="btn-outline text-xs">X</a>
              <button
                onClick={() => navigator.clipboard?.writeText(shareUrl) && setMessage('Link copied!')}
                className="btn-outline text-xs"
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      ) : step === 'duplicate' ? (
        <div className="space-y-4 text-center">
          <div className="text-4xl mb-1">🗳️</div>
          <h3 className="font-display text-xl font-bold text-white">Vote Already Recorded</h3>
          <p className="text-white/60 text-sm">
            Your number has already voted in
            {' '}<span className="text-champagne-400 font-semibold">
              {(duplicateInfo && duplicateInfo.category_name) || nominee.category_name || 'this category'}
            </span>.
          </p>
          <div className="rounded-xl border border-white/10 bg-ink-800 px-4 py-3 text-left text-[13px] text-white/70 space-y-1">
            <p><span className="text-white/40">Number used:</span> +91 {phone}</p>
            <p><span className="text-white/40">Already voted for:</span> {(duplicateInfo && duplicateInfo.nominee_name) || nominee.full_name}</p>
            {duplicateInfo && duplicateInfo.voted_at && (
              <p><span className="text-white/40">Recorded on:</span> {new Date(duplicateInfo.voted_at).toLocaleString('en-IN')}</p>
            )}
            {voter.email && <p><span className="text-white/40">Email entered:</span> {voter.email}</p>}
          </div>
          <p className="text-white/40 text-xs">
            No OTP was sent, because this number has already voted in this category.
            We block repeats by mobile number, email and device, so a second vote here would
            be rejected by the server too. You can still vote in other categories.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href="/vote" className="btn-gold flex-1 text-center">Vote in another category</a>
            <button
              type="button"
              onClick={() => { setStep('details'); setError(null); setVerificationToken(''); setDuplicateInfo(null); }}
              className="btn-outline flex-1"
            >
              Use a different number
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 'details' && mode === 'device') castVote();
            else if (step === 'details') sendOtp(false);
            else verifyOtp(e);
          }}
          className="space-y-3"
        >
          {step === 'details' && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={voter.name}
                  onChange={(e) => setVoter({ ...voter, name: e.target.value })}
                  className="input-field"
                />
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={voter.email}
                  onChange={(e) => setVoter({ ...voter, email: e.target.value })}
                  className="input-field"
                />
              </div>
              <input
                type="tel"
                placeholder={mode === 'device' ? 'Your 10-digit mobile number (optional)' : 'Your 10-digit mobile number *'}
                maxLength={10}
                value={voter.phone}
                onChange={(e) => setVoter({ ...voter, phone: e.target.value.replace(/[^\d]/g, '') })}
                className="input-field"
              />
              {mode === 'device' ? (
                <button type="submit" disabled={loading} className="btn-gold w-full disabled:opacity-40 disabled:cursor-not-allowed">
                  {loading ? 'Casting vote...' : `Vote for ${nominee.full_name}`}
                </button>
              ) : (
                <button type="submit" disabled={loading || cooldown > 0} className="btn-gold w-full disabled:opacity-40 disabled:cursor-not-allowed">
                  {loading ? 'Sending...' : cooldown > 0 ? `Please wait ${cooldown}s...` : 'Send OTP to Verify'}
                </button>
              )}
              <p className="text-white/30 text-xs text-center">
                {mode === 'device'
                  ? 'One vote per device & category. Repeat votes from the same device or number are blocked automatically.'
                  : 'OTP verification. One verified mobile = one vote per category. Fraudulent voting is monitored.'}
              </p>
            </>
          )}

          {step === 'otp' && (
            <>
              {onsiteCode && (
                <div className="rounded-xl border border-champagne-500/40 bg-champagne-500/10 px-4 py-4 text-center">
                  <p className="text-white/60 text-xs mb-1 font-semibold uppercase tracking-wider">Official Verification Code:</p>
                  <p className="font-display text-3xl font-bold tracking-[0.4em] gold-text select-all">{onsiteCode}</p>
                  <p className="text-white/40 text-[11px] mt-2">Code verified by Telugu Icon secure voting engine.</p>
                </div>
              )}
              <p className="text-sm text-white/60">
                Enter the 6-digit OTP sent to <span className="text-champagne-400 font-semibold">{voter.phone}</span>
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={9}
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, ''))}
                className="input-field text-center text-2xl tracking-[0.5em]"
              />
              <div className="flex gap-3">
                <button type="submit" disabled={loading || otp.length < 4} className="btn-gold flex-1 disabled:opacity-40 disabled:cursor-not-allowed">
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </button>
                <button type="button" onClick={() => sendOtp(true)} className="btn-outline disabled:opacity-40 disabled:cursor-not-allowed" disabled={loading || cooldown > 0}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend'}
                </button>
              </div>
            </>
          )}

          {step === 'ready' && (
            <>
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-200">
                ✅ Mobile verified. Ready to vote.
              </div>
              <button type="button" onClick={castVote} disabled={loading} className="btn-gold w-full disabled:opacity-40 disabled:cursor-not-allowed">
                {loading ? 'Casting vote...' : `Vote for ${nominee.full_name}`}
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}