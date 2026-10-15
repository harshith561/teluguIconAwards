import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import QrBlock from '../components/QrBlock';
import { api, getAssetUrl } from '../api';
import {
  nomineeUrl,
  voteUrl,
  qrUrl,
  getSiteUrl,
  whatsappMessage,
  instagramCaption,
  downloadQrPng,
} from '../lib/nomineeCampaign';

// Add-on req. 19: the nominee's own door to their status and campaign kit.
// They prove they own the mobile number they nominated with, and immediately
// get their permanent URL, QR code and share copy - no email provider needed.

const STATUS_STYLES = {
  approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  pending: 'bg-champagne-500/15 text-champagne-300 border-champagne-500/40',
  rejected: 'bg-burgundy-900/40 text-burgundy-300 border-burgundy-500/40',
};

export default function NomineeStatus() {
  const [step, setStep] = useState('mobile'); // mobile -> otp -> done
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [onsiteCode, setOnsiteCode] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(null);

  const copy = useCallback((text, key) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const sendOtp = async (resend) => {
    setError(null);
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError('Please enter the 10-digit mobile number you nominated with.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/nomination-status/send', { mobile });
      if (res.type === 'success') {
        const code = res.dev_otp || res.otp || '';
        setOnsiteCode(code);
        setOtp(code);
        setMessage(resend ? 'A new code has been generated.' : 'Verification code generated.');
        setStep('otp');
      } else {
        setError(res.message || 'Could not generate a code.');
      }
    } catch (err) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    if (!/^\d{4,9}$/.test(otp.trim())) { setError('Enter the 6-digit code.'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/nomination-status/verify', { mobile, otp: otp.trim() });
      if (res.type === 'success') {
        setToken(res.verification_token);
        setOnsiteCode('');
        const lookup = await api.post('/nomination-status/lookup', { verification_token: res.verification_token });
        setResult(lookup);
        setStep('done');
      } else {
        setError(res.message || 'Verification failed');
      }
    } catch (err) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startOver = () => {
    setStep('mobile'); setOtp(''); setOnsiteCode(''); setToken('');
    setResult(null); setError(null); setMessage(null);
  };

  return (
    <PageTransition>
      <section className="relative py-12 sm:py-16 bg-hero-gradient overflow-hidden px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,#0a0a0a_100%)]" />
        <div className="relative max-w-2xl mx-auto text-center">
          <span className="section-subtitle">Nominations 2026</span>
          <h1 className="font-display text-2xl sm:text-4xl font-bold mb-3">
            Check Your <span className="gold-text">Nomination</span>
          </h1>
          <p className="text-white/60 text-xs sm:text-base leading-relaxed">
            Enter the mobile number you nominated with. Once verified you will see your status — and,
            the moment your nomination is approved, your official page, QR code and campaign kit.
          </p>
        </div>
      </section>

      <section className="py-10 sm:py-14 bg-ink-900 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 space-y-4">

          {error && (
            <div className="px-4 py-3 rounded-xl bg-burgundy-900/50 border border-burgundy-500/40 text-white/85 text-sm">
              {error}
            </div>
          )}

          {step === 'mobile' && (
            <form onSubmit={(e) => { e.preventDefault(); sendOtp(false); }} className="glass-card p-5 sm:p-7 border-champagne-500/30 space-y-4">
              <label className="block text-sm text-white/70">
                Mobile number used for nomination
              </label>
              <div className="flex gap-2 items-center">
                <span className="text-white/40 text-sm font-mono">+91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="98765 43210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  className="input-field"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-gold w-full disabled:opacity-40">
                {loading ? 'Generating code...' : 'Send Verification Code'}
              </button>
              <p className="text-white/30 text-xs text-center">
                We verify your number so nobody else can see your nomination.
              </p>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={verify} className="glass-card p-5 sm:p-7 border-champagne-500/30 space-y-4">
              {onsiteCode && (
                <div className="rounded-xl border border-champagne-500/40 bg-champagne-500/10 px-4 py-4 text-center">
                  <p className="text-white/60 text-xs mb-1 font-semibold uppercase tracking-wider">Your verification code:</p>
                  <p className="font-display text-3xl font-bold tracking-[0.4em] gold-text select-all">{onsiteCode}</p>
                  <p className="text-white/40 text-[11px] mt-2">Sent by the Telugu Icon secure verification engine.</p>
                </div>
              )}
              {message && <p className="text-white/50 text-xs text-center">{message}</p>}
              <label className="block text-sm text-white/70">Enter the 6-digit code sent to +91 {mobile}</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={9}
                placeholder="Enter code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="input-field text-center text-2xl tracking-[0.5em]"
              />
              <div className="flex gap-3">
                <button type="submit" disabled={loading || otp.length < 4} className="btn-gold flex-1 disabled:opacity-40">
                  {loading ? 'Verifying...' : 'Verify & View My Nomination'}
                </button>
                <button type="button" onClick={() => sendOtp(true)} disabled={loading} className="btn-outline disabled:opacity-40">
                  Resend
                </button>
              </div>
            </form>
          )}

          {step === 'done' && result && (
            <div className="space-y-4">
              {result.nominations.length === 0 && (
                <div className="glass-card p-6 text-center">
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="text-white/70 text-sm mb-2">{result.message}</p>
                  <p className="text-white/40 text-xs mb-4">
                    If you nominated from a different number, please use that one instead.
                  </p>
                  <button onClick={startOver} className="btn-outline text-xs">Try another number</button>
                </div>
              )}

              {result.nominations.map((nomination) => (
                <div key={nomination.nomination_code || nomination.applicant_name} className="glass-card p-5 sm:p-6 space-y-4 border-champagne-500/20">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-display text-lg font-bold text-white break-words">{nomination.applicant_name}</h2>
                      <p className="text-white/50 text-xs mt-0.5 break-words">{nomination.category_name}</p>
                      {nomination.nomination_code && (
                        <p className="text-white/30 text-[10px] font-mono mt-1 break-all">Nomination ID: {nomination.nomination_code}</p>
                      )}
                    </div>
                    <span className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_STYLES[nomination.status.tone] || STATUS_STYLES.pending}`}>
                      {nomination.status.label}
                    </span>
                  </div>

                  <p className="text-white/50 text-xs leading-relaxed">{nomination.status.note}</p>

                  {nomination.campaign ? (
                    <NomineeKitCard nomination={nomination} onCopy={copy} copied={copied} />
                  ) : (
                    <div className="p-4 rounded-xl bg-ink-800/60 border border-white/8 text-center">
                      <p className="text-white/40 text-xs">
                        Your campaign kit unlocks the moment your nomination is approved.
                      </p>
                    </div>
                  )}
                </div>
              ))}

              <div className="text-center pt-2">
                <button onClick={startOver} className="btn-outline text-xs">Check another number</button>
              </div>
            </div>
          )}

          <p className="text-center text-white/25 text-xs pt-4">
            Need help? <Link to="/contact" className="text-champagne-400 hover:underline">Contact the team</Link>
          </p>
        </div>
      </section>
    </PageTransition>
  );
}

function NomineeKitCard({ nomination, onCopy, copied }) {
  const campaign = nomination.campaign;
  const record = { slug: campaign.nominee_slug, nominee_code: campaign.nominee_code };
  const page = nomineeUrl(record);
  const vote = voteUrl(record);
  const qr = qrUrl(record);
  const wa = whatsappMessage({ ...record, full_name: campaign.nominee_name, category_name: nomination.category_name });
  const ig = instagramCaption({ ...record, full_name: campaign.nominee_name, category_name: nomination.category_name });

  return (
    <div className="space-y-4 pt-2 border-t border-white/8">
      <h3 className="font-display text-base font-bold text-champagne-400">🎁 Your Campaign Kit</h3>

      <div className="flex flex-col sm:flex-row gap-5 items-center">
        <div className="flex flex-col items-center gap-4 shrink-0">
          <QrBlock value={qr} size={140} />
        </div>
        <div className="flex-1 w-full space-y-2">
          <KitRow label="Nominee ID" value={campaign.nominee_code} onCopy={() => onCopy(campaign.nominee_code, 'code')} copied={copied === 'code'} />
          <KitRow label="My Nominee Page" value={page} onCopy={() => onCopy(page, 'page')} copied={copied === 'page'} />
          <KitRow label="My Voting Link" value={vote} onCopy={() => onCopy(vote, 'vote')} copied={copied === 'vote'} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <a href={campaign.kit_url} className="btn-gold !py-2 !px-3 !text-xs">⬇ Poster &amp; Full Kit</a>
        <button onClick={() => downloadQrPng(qr, `TIA2026-QR-${campaign.nominee_slug}.png`, 1200)} className="btn-outline !py-2 !px-3 !text-xs">⬇ Download QR</button>
        <a
          href={campaign.photo_url ? getAssetUrl(campaign.photo_url) : page}
          target="_blank"
          rel="noreferrer"
          className="btn-outline !py-2 !px-3 !text-xs"
        >
          ↗ View My Page
        </a>
        <button
          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(wa)}`, '_blank', 'noopener,noreferrer')}
          className="btn-outline !py-2 !px-3 !text-xs"
        >
          💬 Share on WhatsApp
        </button>
      </div>

      <details className="group">
        <summary className="cursor-pointer text-[11px] text-white/40 hover:text-champagne-400 transition-colors">
          📋 Ready-to-post Instagram caption
        </summary>
        <div className="mt-2 p-3 rounded-xl bg-ink-800 border border-white/8">
          <pre className="text-[11px] text-white/60 whitespace-pre-wrap font-sans leading-relaxed">{ig}</pre>
          <button
            onClick={() => onCopy(ig, 'ig')}
            className="mt-2 px-3 py-1.5 rounded-lg bg-champagne-500/10 text-champagne-400 text-[10px] font-bold border border-champagne-500/30 hover:bg-champagne-500/20"
          >
            {copied === 'ig' ? '✓ Copied!' : 'Copy caption'}
          </button>
        </div>
      </details>

      <p className="text-white/25 text-[10px] leading-relaxed">
        Hosted at {getSiteUrl().replace(/^https?:\/\//, '')} — always share the page or QR code rather
        than a screenshot, so your stats stay accurate. Bot voting is monitored and disqualifying.
      </p>
    </div>
  );
}

function KitRow({ label, value, onCopy, copied }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-ink-800 border border-white/8">
      <div className="flex-1 min-w-0">
        <p className="text-white/40 text-[9px] uppercase tracking-wider font-bold mb-0.5">{label}</p>
        <p className="text-white/70 text-[11px] font-mono truncate">{value}</p>
      </div>
      <button
        onClick={onCopy}
        className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
          copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/50 hover:bg-white/10'
        }`}
      >
        {copied ? '✓' : 'Copy'}
      </button>
    </div>
  );
}