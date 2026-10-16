import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams, Navigate, Link } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import OtpVote from '../components/OtpVote';
import QrBlock from '../components/QrBlock';
import { api, getAssetUrl } from '../api';
import {
  getSiteUrl,
  nomineePath,
  nomineeUrl,
  voteUrl,
  qrUrl,
  EVENT,
  EVENT_HASHTAGS,
  track,
  whatsappShareUrl,
  xShareUrl,
  facebookShareUrl,
  telegramShareUrl,
  instagramCaption,
  socialLinks,
  downloadQrPng,
} from '../lib/nomineeCampaign';

// ── Dynamic OG / meta tags ────────────────────────────────────────────────
// NOTE: social crawlers (WhatsApp, Facebook, X, Telegram) do not run
// JavaScript, so this alone is not enough. vercel middleware at the repo root
// injects the same tags into the served HTML. This keeps the tags correct for
// client-side navigation and for any host without the middleware.
function useNomineeMetaTags(nominee) {
  useEffect(() => {
    if (!nominee) return undefined;
    const siteUrl = getSiteUrl();
    const prev = {
      title: document.title,
      desc: document.querySelector('meta[name="description"]')?.content,
      ogTitle: document.querySelector('meta[property="og:title"]')?.content,
      ogDesc: document.querySelector('meta[property="og:description"]')?.content,
      ogImage: document.querySelector('meta[property="og:image"]')?.content,
      ogUrl: document.querySelector('meta[property="og:url"]')?.content,
    };

    const title = `${nominee.full_name} — ${nominee.category_name} | ${EVENT}`;
    const desc = `${nominee.full_name} is an Official Nominee for ${nominee.category_name} at the ${EVENT}. Vote now and support your favourite Telugu creator!`;
    const canonicalUrl = nomineeUrl(nominee);
    const photoUrl = nominee.photo_url ? getAssetUrl(nominee.photo_url) : `${siteUrl}/og-default.jpg`;

    document.title = title;
    setMeta('description', desc);
    setOgMeta('og:title', title);
    setOgMeta('og:description', desc);
    setOgMeta('og:image', photoUrl);
    setOgMeta('og:image:alt', `${nominee.full_name} — Official Nominee`);
    setOgMeta('og:url', canonicalUrl);
    setOgMeta('og:type', 'profile');
    setOgMeta('og:site_name', EVENT);
    setOgMeta('twitter:card', 'summary_large_image');
    setOgMeta('twitter:title', title);
    setOgMeta('twitter:description', desc);
    setOgMeta('twitter:image', photoUrl);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    // Structured data so nominee pages can surface in rich results.
    let ld = document.getElementById('tia-nominee-jsonld');
    if (!ld) {
      ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.id = 'tia-nominee-jsonld';
      document.head.appendChild(ld);
    }
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: nominee.full_name,
      description: nominee.bio || undefined,
      image: nominee.photo_url ? getAssetUrl(nominee.photo_url) : undefined,
      url: canonicalUrl,
      identifier: nominee.nominee_code || undefined,
      award: EVENT,
      sameAs: socialLinks(nominee).map((entry) => entry.url),
    });

    return () => {
      document.title = prev.title || EVENT;
      if (prev.desc) setMeta('description', prev.desc);
      if (prev.ogTitle) setOgMeta('og:title', prev.ogTitle);
      if (prev.ogDesc) setOgMeta('og:description', prev.ogDesc);
      if (prev.ogImage) setOgMeta('og:image', prev.ogImage);
      if (prev.ogUrl) setOgMeta('og:url', prev.ogUrl);
    };
  }, [nominee]);
}

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); }
  el.setAttribute('content', content);
}
function setOgMeta(property, content) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute('property', property); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

const shareTile = 'flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold transition-all';

export default function NomineeProfile() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const autoVote = searchParams.get('vote') === 'true';
  const isQrScan = searchParams.get('src') === 'qr';

  const [nominee, setNominee] = useState(null);
  const [categorySponsors, setCategorySponsors] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [voted, setVoted] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [qrDownloading, setQrDownloading] = useState(false);
  const voteRef = useRef(null);
  const formRef = useRef(null);

  const getSponsorBadgeRole = (sp) => {
    if (sp.tier === 'title_partner') return 'Title Partner';
    if (sp.tier === 'powered_by') return 'Powered By';
    if (sp.tier === 'co_powered_by') return 'Co-Powered By';
    if (sp.role && sp.role !== 'Category Partner') return sp.role;
    if (sp.tier) return sp.tier.replace(/_/g, ' ');
    return sp.role || 'Category Partner';
  };

  useNomineeMetaTags(nominee);

  useEffect(() => {
    setNominee(null);
    setCategorySponsors([]);
    setNotFound(false);
    api.get(`/nominees/${id}`).then(async (data) => {
      if (data && data.id) {
        setNominee(data);
        try {
          // 1. Fetch category-specific sponsors
          let catSpons = [];
          if (data.category_id) {
            try {
              const res = await api.get(`/categories/${data.category_id}/sponsors`);
              if (Array.isArray(res)) catSpons = res;
            } catch (_) {}
          }

          // 2. Fetch global brand partners (e.g. Title Partner, Co-Powered By)
          let globalSpons = [];
          try {
            const globalRes = await api.get('/sponsors');
            if (Array.isArray(globalRes)) globalSpons = globalRes;
          } catch (_) {}

          // Combine both without duplicates so every active sponsor is visible
          const combined = [...catSpons];
          for (const gs of globalSpons) {
            const alreadyExists = combined.some((s) => (s.sponsor_id || s.id) === gs.id);
            if (!alreadyExists) {
              combined.push({
                ...gs,
                role: gs.role || (
                  gs.tier === 'title_partner' ? 'Title Partner' :
                  gs.tier === 'powered_by' ? 'Powered By' :
                  gs.tier === 'co_powered_by' ? 'Co-Powered By' :
                  'Brand Partner'
                ),
              });
            }
          }

          // Sort by tier precedence: Title Partner > Powered By > Co-Powered By > Category Partner
          combined.sort((a, b) => {
            const rank = (tier, role) => {
              if (tier === 'title_partner' || role === 'Title Partner') return 1;
              if (tier === 'powered_by' || role === 'Powered By') return 2;
              if (tier === 'co_powered_by' || role === 'Co-Powered By') return 3;
              if (role === 'Category Partner') return 4;
              return 5;
            };
            return rank(a.tier, a.role) - rank(b.tier, b.role) || (a.sort_order || 0) - (b.sort_order || 0);
          });

          setCategorySponsors(combined);
        } catch (_) {}
      } else {
        setNotFound(true);
      }
    }).catch(() => setNotFound(true));
  }, [id]);

  // ── Campaign analytics (add-on req. 14) ────────────────────────────────
  useEffect(() => {
    if (!nominee) return;
    track(nominee.id, 'page_view');
    if (isQrScan) track(nominee.id, 'qr_scan', { source: 'qr' });
  }, [nominee, isQrScan]);

  // A direct voting URL (?vote=true) lands the voter straight on the form.
  useEffect(() => {
    if (autoVote && nominee && formRef.current) {
      const timer = setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 350);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoVote, nominee]);

  const copyToClipboard = useCallback(async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      // Clipboard blocked (insecure context / denied permission) - still give
      // visual feedback so the nominee knows to copy manually.
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }, []);

  if (notFound) {
    return (
      <PageTransition>
        <div className="min-h-[70vh] flex items-center justify-center bg-hero-gradient">
          <div className="text-center px-4">
            <div className="text-6xl mb-4">🔍</div>
            <h1 className="font-display text-3xl font-bold gold-text mb-3">Nominee Page Not Available</h1>
            <p className="text-white/50 mb-6">
              This page is only live once the nomination is approved. It may also have been moved.
            </p>
            <a href="/nominees" className="btn-gold">Browse All Nominees</a>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!nominee) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-champagne-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">Loading nominee...</p>
        </div>
      </div>
    );
  }

  // One canonical URL per nominee (add-on req. 1 + req. 18): the numeric-id
  // form redirects to the slug so links, posters and QR codes never fork.
  if (/^\d+$/.test(id) && nominee.slug && String(nominee.slug) !== String(id)) {
    return <Navigate to={nomineePath(nominee)} replace />;
  }

  const vote = voteUrl(nominee);
  const page = nomineeUrl(nominee);
  const links = socialLinks(nominee);

  const share = (channel, href) => {
    track(nominee.id, 'share_click', { source: channel });
    if (href) window.open(href, '_blank', 'noopener,noreferrer');
  };

  const onVoteNow = () => {
    track(nominee.id, 'vote_click');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleQrDownload = async () => {
    setQrDownloading(true);
    try {
      track(nominee.id, 'qr_download');
      await downloadQrPng(qrUrl(nominee), `TIA2026-QR-${nominee.slug || nominee.id}.png`, 1200);
    } finally {
      setQrDownloading(false);
    }
  };

  return (
    <PageTransition>
      {/* ── HERO / ABOVE THE FOLD ── mobile-first: name, category, photo, VOTE NOW */}
      <section className="relative min-h-[100svh] bg-hero-gradient overflow-hidden flex flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(180,120,30,0.12)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(120,10,30,0.10)_0%,transparent_60%)]" />

        {/* Event title */}
        <div className="relative z-10 text-center pt-4 pb-2 px-4">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-champagne-500/10 border border-champagne-500/30 text-champagne-300 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
            🏆 {EVENT}
          </span>
        </div>

        <div className="relative z-10 flex-1 max-w-lg mx-auto w-full px-4 pb-6 flex flex-col items-center justify-start pt-4 sm:pt-8">
          {/* Official Nominee */}
          <div className="mb-3 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/20 text-white/60 text-[10px] uppercase tracking-widest font-semibold">
              ⭐ Official Nominee &nbsp;·&nbsp; {nominee.nominee_code || 'TIC26'}
            </span>
          </div>

          {/* Photo with generous margin bottom */}
          <div className="relative mb-6 sm:mb-7">
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden border-2 border-champagne-500/60 shadow-2xl shadow-champagne-500/20 bg-gradient-to-br from-ink-700 to-burgundy-900 flex items-center justify-center mx-auto p-2">
              {nominee.photo_url ? (
                <img
                  src={getAssetUrl(nominee.photo_url)}
                  alt={nominee.full_name}
                  className="w-full h-full object-cover rounded-xl"
                  loading="eager"
                />
              ) : (
                <div className="w-full h-full rounded-xl bg-champagne-500/10 flex items-center justify-center text-3xl font-bold text-champagne-400 font-display">
                  {nominee.full_name ? nominee.full_name[0] : 'T'}
                </div>
              )}
            </div>
            <div className="absolute inset-0 rounded-2xl ring-2 ring-champagne-400/20 blur-sm pointer-events-none" />
          </div>

          {/* Name + Category */}
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white text-center mb-1 leading-tight">
            {nominee.full_name}
          </h1>
          <p className="text-champagne-400 text-sm sm:text-base font-semibold text-center mb-1">
            Nominated for: <span className="text-white">{nominee.category_name}</span>
          </p>

          {/* Category Sponsor Accreditation */}
          {categorySponsors.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 my-2.5">
              {categorySponsors.map((sp) => {
                const badgeRole = getSponsorBadgeRole(sp);
                return (
                  <div
                    key={sp.id || sp.association_id || sp.sponsor_id}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-champagne-500/30 text-xs shadow-sm backdrop-blur-sm"
                  >
                    {sp.logo_url && (
                      <img
                        src={getAssetUrl(sp.logo_url)}
                        alt={sp.name}
                        className="w-4 h-4 object-contain rounded"
                      />
                    )}
                    <span className="text-champagne-400/80 text-[10px] uppercase tracking-wider font-semibold">
                      {badgeRole}:
                    </span>
                    <span className="text-white font-bold text-xs">{sp.name}</span>
                  </div>
                );
              })}
            </div>
          )}

          {nominee.social_handle && (
            <p className="text-white/40 text-xs text-center mb-3">📱 {nominee.social_handle}</p>
          )}

          {/* ── PRIMARY CTA: VOTE FOR [NAME] + VOTE NOW ── */}
          <div ref={voteRef} className="w-full mt-1">
            {!voted ? (
              <div className="glass-card p-4 sm:p-5 border border-champagne-500/30">
                <h2 className="font-display text-base sm:text-xl font-bold text-white text-center mb-1 leading-tight">
                  VOTE FOR {nominee.full_name.toUpperCase()}
                </h2>
                <p className="text-center text-[10px] sm:text-xs text-white/50 mb-3 uppercase tracking-wider font-semibold">
                  {nominee.category_name}
                </p>
                <button type="button" onClick={onVoteNow} className="btn-gold w-full !py-4 !text-base sm:!text-lg font-display tracking-wide">
                  🗳️ VOTE NOW
                </button>
              </div>
            ) : (
              <div className="glass-card p-5 text-center border border-emerald-500/30 bg-emerald-900/10">
                <div className="text-5xl mb-2">✅</div>
                <p className="font-display text-lg font-bold text-emerald-300 mb-1">Vote Recorded!</p>
                <p className="text-white/50 text-xs mb-4">Thank you for supporting the Telugu creator community.</p>
                <a href={whatsappShareUrl(nominee)} target="_blank" rel="noreferrer" className="btn-gold w-full mb-2">
                  📲 Share on WhatsApp &amp; Rally More Votes
                </a>
                <button onClick={() => copyToClipboard(vote, 'done-copy')} className="btn-outline w-full text-xs">
                  {copiedKey === 'done-copy' ? '✓ Copied!' : '🔗 Copy Voting Link'}
                </button>
              </div>
            )}
          </div>

          {/* Direct voting form — nominee + category already pre-selected */}
          {!voted && (
            <div ref={formRef} className="w-full mt-3 scroll-mt-24">
              <div className="glass-card p-4 sm:p-6 border border-white/10">
                <p className="text-center text-xs text-white/50 mb-3 uppercase tracking-wider font-semibold">
                  Cast Your Official Vote
                </p>
                <OtpVote nominee={nominee} onVoted={() => setVoted(true)} />
              </div>
            </div>
          )}

          {!voted && (
            <p className="text-white/25 text-[10px] text-center mt-3">
              Scan the QR, share the link, and help {nominee.full_name} win.
            </p>
          )}

          <div className="mt-2 text-center">
            <Link
              to={`/nominee-kit?nominee=${nominee.slug || nominee.id}`}
              className="inline-flex items-center gap-1.5 text-xs text-champagne-300 hover:text-white font-semibold py-1.5 px-3.5 rounded-xl bg-champagne-500/10 hover:bg-champagne-500/20 border border-champagne-500/30 transition-all shadow-sm"
            >
              <span>🖼️</span> View &amp; Download Campaign Poster →
            </Link>
          </div>
        </div>
      </section>

      {/* ── SHARE YOUR VOTE ── */}
      <section className="bg-ink-900 py-6 px-4">
        <div className="max-w-lg mx-auto">
          <div className="glass-card p-5 border border-champagne-500/20">
            <h2 className="font-display text-lg font-bold text-white mb-1">📣 Share Your Vote</h2>
            <p className="text-white/40 text-xs mb-4">
              Help {nominee.full_name} win — share with friends and family! {EVENT_HASHTAGS}
            </p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button type="button" onClick={() => share('whatsapp', whatsappShareUrl(nominee))} className={`${shareTile} bg-[#25D366]/15 border border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/25`}>
                <span className="text-base">💬</span> WhatsApp
              </button>
              <button type="button" onClick={() => share('instagram')} onDoubleClick={() => copyToClipboard(instagramCaption(nominee), 'ig-copy')} className={`${shareTile} bg-[#E1306C]/15 border border-[#E1306C]/40 text-[#E1306C] hover:bg-[#E1306C]/25`}>
                <span className="text-base">📸</span> Instagram
              </button>
              <button type="button" onClick={() => share('facebook', facebookShareUrl(nominee))} className={`${shareTile} bg-[#1877F2]/15 border border-[#1877F2]/40 text-[#1877F2] hover:bg-[#1877F2]/25`}>
                <span className="text-base">📘</span> Facebook
              </button>
              <button type="button" onClick={() => share('x', xShareUrl(nominee))} className={`${shareTile} bg-white/5 border border-white/20 text-white/70 hover:bg-white/10`}>
                <span className="text-base">𝕏</span> X / Twitter
              </button>
              <button type="button" onClick={() => share('telegram', telegramShareUrl(nominee))} className={`${shareTile} bg-[#2AABEE]/15 border border-[#2AABEE]/40 text-[#2AABEE] hover:bg-[#2AABEE]/25`}>
                <span className="text-base">✈️</span> Telegram
              </button>
              <button type="button" onClick={() => { track(nominee.id, 'share_click', { source: 'copy' }); copyToClipboard(vote, 'share-url'); }} className={`${shareTile} bg-champagne-500/10 border border-champagne-500/30 text-champagne-400 hover:bg-champagne-500/20`}>
                <span className="text-base">🔗</span> {copiedKey === 'share-url' ? 'Copied!' : 'Copy Link'}
              </button>
            </div>

            {/* Instagram has no web share intent - give them the ready caption. */}
            <details className="mb-3 group">
              <summary className="cursor-pointer text-[11px] text-white/40 hover:text-champagne-400 transition-colors">
                📋 Instagram caption (tap to copy)
              </summary>
              <div className="mt-2 p-3 rounded-xl bg-ink-800 border border-white/8">
                <pre className="text-[11px] text-white/60 whitespace-pre-wrap font-sans leading-relaxed">{instagramCaption(nominee)}</pre>
                <button
                  type="button"
                  onClick={() => copyToClipboard(instagramCaption(nominee), 'ig-copy')}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-champagne-500/10 text-champagne-400 text-[10px] font-bold border border-champagne-500/30 hover:bg-champagne-500/20"
                >
                  {copiedKey === 'ig-copy' ? '✓ Copied!' : 'Copy caption'}
                </button>
              </div>
            </details>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-ink-800 border border-white/10">
              <span className="text-white/30 text-[10px] truncate flex-1 font-mono">{vote}</span>
              <span className="shrink-0 text-[10px] text-white/20 font-mono">30-sec OTP vote</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── QR CODE / SCAN TO VOTE ── */}
      <section className="bg-ink-900 py-6 px-4">
        <div className="max-w-lg mx-auto">
          <div className="glass-card p-5 flex flex-col sm:flex-row items-center gap-5 border border-champagne-500/20">
            <QrBlock value={qrUrl(nominee)} size={140} />
            <div className="flex-1 text-center sm:text-left">
              <h2 className="font-display text-lg font-bold text-white mb-1">📲 SCAN QR TO VOTE</h2>
              <p className="text-white/40 text-xs mb-3 leading-relaxed">
                This unique QR code opens {nominee.full_name}&apos;s voting page directly — no search, no menus.
                Print it on posters, stories, reels and prints.
              </p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <Link
                  to={`/nominee-kit?nominee=${nominee.slug || nominee.id}`}
                  className="btn-gold text-xs !py-2 !px-4 inline-flex items-center gap-1.5 shadow-gold"
                >
                  <span>🖼️</span> View &amp; Download Poster
                </Link>
                <button
                  onClick={handleQrDownload}
                  disabled={qrDownloading}
                  className="btn-outline text-xs !py-2 !px-4 disabled:opacity-50"
                >
                  {qrDownloading ? 'Preparing...' : '⬇ Download QR Code'}
                </button>
                <button
                  onClick={() => copyToClipboard(qrUrl(nominee), 'qr-url')}
                  className="btn-outline text-xs !py-2 !px-4"
                >
                  {copiedKey === 'qr-url' ? '✓ Copied!' : '🔗 Copy QR Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ABOUT THE NOMINEE ── */}
      {(nominee.bio || nominee.achievements) && (
        <section className="bg-ink-900 py-6 px-4">
          <div className="max-w-lg mx-auto glass-card p-5 border border-white/10">
            <h2 className="font-display text-lg font-bold text-white mb-3">About {nominee.full_name}</h2>
            {nominee.bio && (
              <p className="text-white/60 text-sm leading-relaxed mb-4 whitespace-pre-line">{nominee.bio}</p>
            )}
            {nominee.achievements && (
              <div className="mb-1">
                <h3 className="text-champagne-400 text-[10px] uppercase tracking-widest font-bold mb-2">Achievements</h3>
                <p className="text-white/60 text-sm leading-relaxed whitespace-pre-line">{nominee.achievements}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── SOCIAL PROFILES ── */}
      {(links.length > 0 || nominee.social_handle) && (
        <section className="bg-ink-900 py-6 px-4">
          <div className="max-w-lg mx-auto glass-card p-5 border border-white/10">
            <h2 className="font-display text-lg font-bold text-white mb-3">Social Profiles</h2>
            {links.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {links.map((entry) => (
                  <a
                    key={entry.key}
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="flex items-center justify-between gap-2 p-3 rounded-xl bg-ink-800 border border-white/8 hover:border-champagne-500/40 transition-all"
                  >
                    <span className="text-white/70 text-sm">{entry.label}</span>
                    <span className="text-champagne-400 text-xs truncate max-w-[60%]">{entry.url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-ink-800 border border-white/8">
                <span className="text-champagne-400 text-sm">📱</span>
                <span className="text-white/60 text-sm break-all">{nominee.social_handle}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── NOMINEE CAMPAIGN KIT ── */}
      <section className="bg-ink-900 py-6 px-4">
        <div className="max-w-lg mx-auto glass-card p-5 border border-white/10">
          <h2 className="font-display text-lg font-bold text-white mb-3">🎁 Nominee Campaign Kit</h2>
          <div className="grid grid-cols-1 gap-2">
            {[
              { label: '🔗 My Nominee Page', value: page, key: 'kit-page' },
              { label: '🗳️ My Direct Voting Link', value: vote, key: 'kit-vote' },
              { label: '#️⃣  Nominee Code', value: nominee.nominee_code || 'TIC26', key: 'kit-code' },
            ].map(({ label, value, key }) => (
              <div key={key} className="flex items-center gap-2 p-2.5 rounded-xl bg-ink-800 border border-white/8">
                <div className="flex-1 min-w-0">
                  <p className="text-white/40 text-[9px] uppercase tracking-wider font-bold mb-0.5">{label}</p>
                  <p className="text-white/70 text-[11px] font-mono truncate">{value}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(value, key)}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${copiedKey === key ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                >
                  {copiedKey === key ? '✓' : 'Copy'}
                </button>
              </div>
            ))}
            <a
              href={`/nominee-kit?nominee=${nominee.slug || nominee.id}`}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-champagne-500/10 border border-champagne-500/30 text-champagne-400 text-xs font-semibold hover:bg-champagne-500/15 transition-all mt-1"
            >
              🖼️ Download Campaign Material (Poster, QR, Social)
            </a>
          </div>
        </div>
      </section>

      {/* ── SPONSOR BRANDING SLOT ── */}
      <section className="bg-ink-900 pb-4 px-4">
        <div className="max-w-lg mx-auto">
          <div className="py-3 px-4 rounded-xl bg-white/[0.02] border border-white/8 flex items-center justify-center gap-2">
            <span className="text-white/20 text-[10px] uppercase tracking-widest font-bold">
              Voting Powered by
            </span>
            <span className="text-white/20 text-[10px] font-bold">Pracharam Media</span>
          </div>
        </div>
      </section>

      {/* ── MORE NOMINEES ── */}
      <section className="bg-ink-900 py-6 px-4 border-t border-white/5">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-white/30 text-xs mb-3">Explore more official nominees</p>
          <a href="/nominees" className="btn-outline text-xs">
            View All Nominees →
          </a>
        </div>
      </section>
    </PageTransition>
  );
}
