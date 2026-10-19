import { API_BASE } from '../api';

// Canonical public origin.
//
// Order of preference:
//   1. VITE_SITE_URL           - set once the real domain is live
//   2. the origin the visitor  - so preview deploys and localhost always
//      actually loaded               produce correct, working links
//   3. the deployed Vercel URL - last-resort fallback
//
// Nothing here is hardcoded to a domain that does not resolve, so a share link
// or QR generated on any host still opens somewhere real.
const DEPLOYED_SITE_URL = 'https://awards-kab6.vercel.app';
const CANONICAL_SITE_URL = 'https://teluguiconawards.in';

export const getSiteUrl = () => {
  const configured = (import.meta.env.VITE_SITE_URL || '').trim().replace(/\/+$/, '');
  if (configured) return configured;
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    // When running locally in dev mode, use canonical domain so posters,
    // QR codes, and share links work properly when scanned on mobile devices
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return CANONICAL_SITE_URL;
    }
    return window.location.origin;
  }
  return CANONICAL_SITE_URL;
};

// One canonical public URL per nominee. The numeric id form is treated as an
// alias and redirected to the slug so a nominee never has two live URLs.
export const nomineePath = (nominee) => `/nominee/${nominee.slug || nominee.id}`;

export const nomineeUrl = (nominee) => `${getSiteUrl()}${nomineePath(nominee)}`;

// Direct voting URL (add-on req. 10).
export const voteUrl = (nominee) => `${nomineeUrl(nominee)}?vote=true`;

// The QR encodes src=qr so a physical scan is distinguishable from a tap.
export const qrUrl = (nominee) => `${nomineeUrl(nominee)}?vote=true&src=qr`;

export const EVENT = 'Telugu Icon Digital & Influencer Awards 2026';
export const EVENT_HASHTAGS = '#TeluguIconAwards2026 #TIA2026';

// ── Campaign analytics (add-on req. 14) ────────────────────────────────────
const trackedThisSession = new Set();

// Fire-and-forget. Never blocks or breaks the page for a visitor.
export const track = (nomineeId, eventType, extra = {}) => {
  if (!nomineeId || typeof fetch === 'undefined') return;

  // One event per type per page session: honest unique-visitor numbers, and it
  // stops a refresh loop from inflating the funnel.
  const dedupeKey = `${nomineeId}:${eventType}`;
  if (trackedThisSession.has(dedupeKey) && !extra.force) return;
  trackedThisSession.add(dedupeKey);

  const payload = JSON.stringify({
    nominee_id: Number(nomineeId),
    event_type: eventType,
    source: extra.source || document.referrer || null,
  });

  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(`${API_BASE}/analytics/track`, new Blob([payload], { type: 'application/json' }));
      return;
    }
  } catch (_) {
    // fall through to fetch
  }

  fetch(`${API_BASE}/analytics/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => { });
};

// ── Share copy (add-on req. 5) ─────────────────────────────────────────────
export const whatsappMessage = (nominee) =>
  `🏆 Hey friends and family! I'm nominated for *${nominee.category_name || 'Creator of the Year'}* at the *${EVENT}*!\n\n`
  + `Please take 30 seconds to cast your OTP-verified vote for *${nominee.full_name}*:\n\n`
  + `👉 ${voteUrl(nominee)}\n\n`
  + `Nominee Code: ${nominee.nominee_code || 'TIC26'}\n`
  + `Thank you for believing in me! 🙏✨ ${EVENT_HASHTAGS}`;

export const xMessage = (nominee) =>
  `I just voted for ${nominee.full_name} — Official Nominee for ${nominee.category_name} at the ${EVENT}! 🏆 Vote now:`;

export const facebookShareUrl = (nominee) =>
  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(voteUrl(nominee))}`;

export const xShareUrl = (nominee) =>
  `https://twitter.com/intent/tweet?text=${encodeURIComponent(xMessage(nominee))}&url=${encodeURIComponent(voteUrl(nominee))}`;

export const telegramShareUrl = (nominee) =>
  `https://t.me/share/url?url=${encodeURIComponent(voteUrl(nominee))}&text=${encodeURIComponent(xMessage(nominee))}`;

export const whatsappShareUrl = (nominee) =>
  `https://wa.me/?text=${encodeURIComponent(whatsappMessage(nominee))}`;

// Instagram has no web share intent. The nominee copies the caption, opens the
// app and pastes - the kit page and this button both drive that flow.
export const instagramCaption = (nominee) =>
  `Humbled and honoured to announce my nomination for ${nominee.category_name || 'an award'} at the ${EVENT}! 🏆✨\n\n`
  + `Voting is 100% public and OTP-verified. Vote for me here 👉 ${nomineeUrl(nominee)}\n\n`
  + `Nominee Code: ${nominee.nominee_code || 'TIC26'}\n\n`
  + `${EVENT_HASHTAGS} #TeluguCreators #TeluguInfluencers #VoteForMe`;

export const socialLinks = (nominee) => {
  const entries = [
    { key: 'instagram', label: 'Instagram', url: nominee.instagram_url },
    { key: 'youtube', label: 'YouTube', url: nominee.youtube_url },
    { key: 'facebook', label: 'Facebook', url: nominee.facebook_url },
    { key: 'website', label: 'Website', url: nominee.website_url },
    { key: 'other', label: 'Profile', url: nominee.other_profile_url },
  ];
  return entries.filter((entry) => entry.url && /^https?:\/\//i.test(entry.url));
};

// ── QR codes (add-on req. 6) ────────────────────────────────────────────────
// Generated locally so posters, downloads and offline printing never depend on
// a third-party image host.
export const downloadQrPng = async (value, filename, size = 1024) => {
  const QRCode = (await import('qrcode')).default;
  const dataUrl = await QRCode.toDataURL(value, {
    width: size,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#0a0a0a', light: '#ffffff' },
  });

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const qrDataUrl = async (value, size = 640) => {
  const QRCode = (await import('qrcode')).default;
  return QRCode.toDataURL(value, {
    width: size,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  });
};
