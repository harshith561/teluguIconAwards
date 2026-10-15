import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import QrBlock from '../components/QrBlock';
import { api, getAssetUrl } from '../api';
import {
  nomineeUrl,
  voteUrl,
  qrUrl,
  getSiteUrl,
  EVENT,
  track,
  instagramCaption,
  qrDataUrl,
  downloadQrPng,
} from '../lib/nomineeCampaign';

const POSTER_WIDTH = 1080;
const POSTER_HEIGHT = 1350; // 4:5 Instagram portrait
const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920; // 9:16 Story / Reel cover

const gold = '#D4AF37';
const ink = '#0a0a0a';

const wrapText = (ctx, text, maxWidth, maxLines) => {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = candidate;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last.trimEnd()}…`;
  }
  return lines;
};

const drawLines = (ctx, lines, centerX, startY, lineHeight) => {
  lines.forEach((line, index) => {
    ctx.fillText(line, centerX, startY + index * lineHeight);
  });
};

const loadImage = (src) =>
  new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    // Required, otherwise drawing a cross-origin photo taints the canvas and
    // toDataURL() throws - the poster would silently export blank.
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

// Builds the nominee poster. Shared by the 4:5 poster and the 9:16 story so
// the two never drift apart.
const buildPoster = async (nominee, size, qrImage) => {
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  const S = size.width / 1080; // scale factor vs the 1080px design
  const cx = size.width / 2;

  const photo = await loadImage(nominee.photo_url ? getAssetUrl(nominee.photo_url) : null);

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, size.height);
  bg.addColorStop(0, '#0a0a0a');
  bg.addColorStop(0.5, '#160d1b');
  bg.addColorStop(1, '#080808');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size.width, size.height);

  // Gold borders
  ctx.strokeStyle = gold;
  ctx.lineWidth = 14 * S;
  ctx.strokeRect(40 * S, 40 * S, size.width - 80 * S, size.height - 80 * S);
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
  ctx.lineWidth = 2 * S;
  ctx.strokeRect(55 * S, 55 * S, size.width - 110 * S, size.height - 110 * S);

  ctx.textAlign = 'center';

  // Header
  ctx.fillStyle = gold;
  ctx.font = `bold ${30 * S}px "Cinzel", Georgia, serif`;
  drawLines(ctx, wrapText(ctx, EVENT.toUpperCase(), size.width - 160 * S, 2), cx, 128 * S, 36 * S);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `500 ${22 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText('O F F I C I A L   N O M I N E E', cx, 186 * S);

  // Photo in a gold ring
  const ringRadius = 240 * S;
  const ringY = 480 * S;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, ringY, ringRadius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#1c1c1c';
  ctx.fillRect(cx - ringRadius, ringY - ringRadius, ringRadius * 2, ringRadius * 2);
  if (photo) {
    const side = Math.min(photo.width, photo.height);
    ctx.drawImage(photo, (photo.width - side) / 2, (photo.height - side) / 2, side, side, cx - ringRadius, ringY - ringRadius, ringRadius * 2, ringRadius * 2);
  } else {
    ctx.fillStyle = gold;
    ctx.font = `${120 * S}px serif`;
    ctx.fillText('🏆', cx, ringY + 40 * S);
  }
  ctx.restore();

  ctx.strokeStyle = gold;
  ctx.lineWidth = 8 * S;
  ctx.beginPath();
  ctx.arc(cx, ringY, ringRadius + 4 * S, 0, Math.PI * 2);
  ctx.stroke();

  // Name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${58 * S}px "Cinzel", Georgia, serif`;
  drawLines(ctx, wrapText(ctx, nominee.full_name || 'Creator Name', size.width - 200 * S, 2), cx, 800 * S, 66 * S);

  if (nominee.social_handle) {
    ctx.fillStyle = gold;
    ctx.font = `600 ${26 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
    drawLines(ctx, wrapText(ctx, nominee.social_handle, size.width - 240 * S, 1), cx, 862 * S, 30 * S);
  }

  // Category
  ctx.fillStyle = 'rgba(212, 175, 55, 0.15)';
  ctx.strokeStyle = gold;
  ctx.lineWidth = 2 * S;
  const boxY = 900 * S;
  const boxH = 92 * S;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(140 * S, boxY, size.width - 280 * S, boxH, 20 * S);
  else ctx.rect(140 * S, boxY, size.width - 280 * S, boxH);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${28 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
  drawLines(ctx, wrapText(ctx, `NOMINATED FOR: ${(nominee.category_name || 'CREATOR').toUpperCase()}`, size.width - 330 * S, 1), cx, boxY + 56 * S, 34 * S);

  // Nominee code + unique URL - both per-nominee, never generic
  ctx.fillStyle = gold;
  ctx.font = `600 ${23 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText(`Nominee Code: ${nominee.nominee_code || 'TIC26'}`, cx, 1035 * S);

  // CTA
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${40 * S}px "Cinzel", Georgia, serif`;
  ctx.fillText('V O T E   N O W', cx, 1105 * S);

  // QR (unique per nominee, links straight to their page)
  const qrSize = 220 * S;
  if (qrImage) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - qrSize / 2 - 12 * S, 1140 * S, qrSize + 24 * S, qrSize + 24 * S);
    ctx.drawImage(qrImage, cx - qrSize / 2, 1140 * S + 12 * S, qrSize, qrSize);
  }
  ctx.fillStyle = gold;
  ctx.font = `bold ${26 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText('SCAN QR TO VOTE', cx, 1140 * S + qrSize + 52 * S);

  // The nominee's own URL
  const shortUrl = nomineeUrl(nominee).replace(/^https?:\/\//, '');
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = `600 ${26 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
  drawLines(ctx, wrapText(ctx, shortUrl, size.width - 200 * S, 1), cx, 1140 * S + qrSize + 100 * S, 32 * S);

  // Footer
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = `${19 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText('100% Verified OTP Public Voting • Presented by Pracharam Media', cx, size.height - 62 * S);
  ctx.fillText(`${EVENT} • 16 November 2026, Shilpakala Vedika, Hyderabad`, cx, size.height - 30 * S);

  return canvas;
};

export default function NomineeKit() {
  const [searchParams] = useSearchParams();
  const [nominees, setNominees] = useState([]);
  const [selectedNominee, setSelectedNominee] = useState(null);
  const [search, setSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);
  const [posterWarning, setPosterWarning] = useState(null);
  const posterRef = useRef(null);
  const storyRef = useRef(null);

  useEffect(() => {
    api.get('/nominees').then((data) => {
      if (Array.isArray(data)) setNominees(data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!nominees.length) return;
    const requested = searchParams.get('nominee');
    const match = requested
      ? nominees.find((n) => String(n.slug) === requested || String(n.id) === requested)
      : null;
    setSelectedNominee(match || nominees[0]);
  }, [nominees, searchParams]);

  const copyToClipboard = useCallback((text, key) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }, []);

  const downloadDataUrl = (dataUrl, filename) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Render both canvases whenever the selected nominee changes.
  useEffect(() => {
    if (!selectedNominee) return undefined;
    let cancelled = false;

    (async () => {
      try {
        track(selectedNominee.id, 'kit_view');
        const qrValue = qrUrl(selectedNominee);
        // Local generation first; if the module or canvas fails, fall back to a
        // remote image. The poster must never silently ship without a QR.
        let qrSource;
        try {
          qrSource = await qrDataUrl(qrValue, 640);
        } catch (_) {
          qrSource = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrValue)}&size=640x640&margin=8&format=png`;
        }
        const qrImage = await loadImage(qrSource);
        const poster = await buildPoster(selectedNominee, { width: POSTER_WIDTH, height: POSTER_HEIGHT }, qrImage);
        const story = await buildPoster(selectedNominee, { width: STORY_WIDTH, height: STORY_HEIGHT }, qrImage);
        if (cancelled) return;
        const copy = (from, to) => {
          if (!to) return;
          to.width = from.width;
          to.height = from.height;
          to.getContext('2d').drawImage(from, 0, 0);
        };
        copy(poster, posterRef.current);
        copy(story, storyRef.current);
        setPosterWarning(qrImage ? null : 'The QR code could not be generated. Do not print this poster without reloading — the printed URL is still correct.');
      } catch (error) {
        console.error('Poster generation failed:', error);
        setPosterWarning('Poster generation failed. Please reload this page.');
      }
    })();

    return () => { cancelled = true; };
  }, [selectedNominee]);

  if (!selectedNominee) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-ink-900 flex items-center justify-center">
          <p className="text-white/40 text-sm">Loading campaign kit...</p>
        </div>
      </PageTransition>
    );
  }

  const page = nomineeUrl(selectedNominee);
  const vote = voteUrl(selectedNominee);
  const kitUrl = getSiteUrl().replace(/^https?:\/\//, '');
  const waMessage = `🏆 Hey friends and family! I'm nominated for *${selectedNominee.category_name || 'Creator of the Year'}* at the *${EVENT}*!\n\nPlease take 30 seconds to cast your OTP-verified vote for *${selectedNominee.full_name}*:\n\n👉 ${vote}\n\nNominee Code: ${selectedNominee.nominee_code || 'TIC26'}\nThank you for believing in me! 🙏✨ #TeluguIconAwards2026 #TIA2026`;

  const assets = [
    { key: 'page', icon: '🔗', label: 'My Nominee Page', value: page, kind: 'copy' },
    { key: 'vote', icon: '🗳️', label: 'My Voting Link', value: vote, kind: 'copy' },
    { key: 'code', icon: '#️⃣', label: 'Nominee Code', value: selectedNominee.nominee_code || 'TIC26', kind: 'copy' },
    { key: 'qr', icon: '📲', label: 'My QR Code', value: qrUrl(selectedNominee), kind: 'qr' },
    { key: 'poster', icon: '🖼️', label: 'Nominee Poster (4:5)', kind: 'poster' },
    { key: 'story', icon: '📱', label: 'Instagram Story (9:16)', kind: 'story' },
    { key: 'igpost', icon: '📸', label: 'Instagram Post Caption', kind: 'caption', value: instagramCaption(selectedNominee) },
    { key: 'igstory', icon: '⚡', label: 'Instagram Story Caption', kind: 'caption', value: instagramCaption(selectedNominee) },
    { key: 'whatsapp', icon: '💬', label: 'WhatsApp Poster + Message', kind: 'poster+copy', value: waMessage },
    { key: 'video', icon: '🎬', label: 'Voting Video / Byte Script', kind: 'caption', value: VIDEO_SCRIPT(selectedNominee) },
  ];

  return (
    <PageTransition>
      <section className="relative py-12 sm:py-20 bg-hero-gradient overflow-hidden px-3 sm:px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,#0a0a0a_100%)]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <span className="section-subtitle">Creator Campaign Suite</span>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4">
            Nominee <span className="gold-text">Campaign Kit</span>
          </h1>
          <p className="text-white/60 text-xs sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Everything you need to campaign: your page, your voting link, your QR code, posters for
            Instagram and WhatsApp, and ready-to-post copy.
          </p>
        </div>
      </section>

      <section className="py-10 sm:py-14 bg-ink-900 min-h-screen">
        <div className="max-w-7xl mx-auto px-4">
          {posterWarning && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-champagne-900/30 border border-champagne-500/40 text-champagne-200 text-xs">
              {posterWarning}
            </div>
          )}
          {/* Nominee selector */}
          <div className="mb-8 sm:mb-10 max-w-xl mx-auto">
            <label className="block text-xs font-bold text-champagne-400 uppercase tracking-wider mb-2 text-center">
              Select or Search Nominee Profile
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  const q = e.target.value.trim().toLowerCase();
                  if (!q) return;
                  const found = nominees.find((n) => n.full_name.toLowerCase().includes(q));
                  if (found) setSelectedNominee(found);
                }}
                placeholder="Type creator name..."
                className="flex-1 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-ink-800 border border-white/10 text-white placeholder-white/30 text-xs sm:text-sm focus:border-champagne-500 focus:outline-none"
              />
              <select
                value={selectedNominee?.id || ''}
                onChange={(e) => {
                  const nom = nominees.find((n) => String(n.id) === e.target.value);
                  if (nom) setSelectedNominee(nom);
                }}
                className="px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-ink-800 border border-white/10 text-white text-xs sm:text-sm focus:border-champagne-500 focus:outline-none w-full sm:max-w-[220px]"
              >
                {nominees.map((n) => (
                  <option key={n.id} value={n.id}>{n.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            {/* Poster previews */}
            <div className="space-y-6">
              <div className="card-gold p-6 text-center">
                <h3 className="text-lg font-bold font-display text-white mb-4">Official Nominee Poster (4:5)</h3>
                <div className="relative mx-auto max-w-[380px] rounded-2xl overflow-hidden shadow-2xl border border-champagne-500/40">
                  <canvas ref={posterRef} className="w-full h-auto block" />
                </div>
                <button
                  onClick={() => {
                    track(selectedNominee.id, 'poster_download', { source: 'poster' });
                    downloadDataUrl(posterRef.current.toDataURL('image/png'), `Telugu-Icon-Poster-${selectedNominee.slug || selectedNominee.id}.png`);
                  }}
                  className="mt-6 w-full max-w-[380px] py-3.5 rounded-xl bg-champagne-500 text-ink-900 font-bold text-sm hover:bg-champagne-400 transition-all shadow-gold"
                >
                  Download Nominee Poster (PNG) ↓
                </button>
              </div>

              <div className="card-gold p-6 text-center">
                <h3 className="text-lg font-bold font-display text-white mb-4">Instagram Story (9:16)</h3>
                <div className="relative mx-auto max-w-[240px] rounded-2xl overflow-hidden shadow-2xl border border-champagne-500/40">
                  <canvas ref={storyRef} className="w-full h-auto block" />
                </div>
                <button
                  onClick={() => {
                    track(selectedNominee.id, 'poster_download', { source: 'story' });
                    downloadDataUrl(storyRef.current.toDataURL('image/png'), `Telugu-Icon-Story-${selectedNominee.slug || selectedNominee.id}.png`);
                  }}
                  className="mt-6 w-full max-w-[240px] py-3.5 rounded-xl bg-champagne-500 text-ink-900 font-bold text-sm hover:bg-champagne-400 transition-all shadow-gold"
                >
                  Download Story (PNG) ↓
                </button>
              </div>
            </div>

            {/* Asset list */}
            <div className="space-y-4">
              <div className="card-gold p-6">
                <h3 className="text-lg font-bold font-display text-white mb-1">📦 My Campaign Material</h3>
                <p className="text-white/40 text-xs mb-4">
                  Approved for {selectedNominee.full_name} · {selectedNominee.category_name} · {kitUrl}
                </p>

                {/* Live QR preview with the URL it encodes, so it can be verified
                    before anything is printed or shared. */}
                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 mb-4 rounded-2xl bg-ink-900/60 border border-champagne-500/20">
                  <QrBlock value={qrUrl(selectedNominee)} size={150} />
                  <div className="flex-1 text-center sm:text-left">
                    <h4 className="font-bold text-white text-sm mb-1">My QR Code</h4>
                    <p className="text-white/40 text-xs mb-2">
                      Printed on the poster above. Scans open this nominee&apos;s page with voting
                      pre-selected. Click the code to check the link.
                    </p>
                    <button
                      onClick={async () => {
                        track(selectedNominee.id, 'qr_download');
                        await downloadQrPng(qrUrl(selectedNominee), `TIA2026-QR-${selectedNominee.slug || selectedNominee.id}.png`, 1200);
                      }}
                      className="btn-gold !py-2 !px-3 !text-xs"
                    >
                      ⬇ Download QR (PNG)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {assets.map((asset) => (
                    <div key={asset.key} className="flex items-center gap-3 p-3 rounded-xl bg-ink-900/60 border border-white/8">
                      <span className="text-lg shrink-0">{asset.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/70 text-xs font-semibold">{asset.label}</p>
                        {asset.value && asset.kind !== 'caption' && (
                          <p className="text-white/35 text-[10px] font-mono truncate">{asset.value}</p>
                        )}
                      </div>
                      {asset.kind === 'copy' && (
                        <button
                          onClick={() => copyToClipboard(asset.value, asset.key)}
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-champagne-500/10 text-champagne-400 text-[10px] font-bold border border-champagne-500/30 hover:bg-champagne-500/20"
                        >
                          {copiedKey === asset.key ? '✓ Copied' : 'Copy'}
                        </button>
                      )}
                      {(asset.kind === 'poster' || asset.kind === 'poster+copy' || asset.kind === 'story') && (
                        <button
                          onClick={() => {
                            track(selectedNominee.id, 'poster_download', { source: asset.key });
                            downloadDataUrl(posterRef.current.toDataURL('image/png'), `Telugu-Icon-Poster-${selectedNominee.slug || selectedNominee.id}.png`);
                          }}
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-champagne-500/10 text-champagne-400 text-[10px] font-bold border border-champagne-500/30 hover:bg-champagne-500/20"
                        >
                          ↓ PNG
                        </button>
                      )}
                      {asset.kind === 'qr' && (
                        <button
                          onClick={async () => {
                            track(selectedNominee.id, 'qr_download');
                            await downloadQrPng(qrUrl(selectedNominee), `TIA2026-QR-${selectedNominee.slug || selectedNominee.id}.png`, 1200);
                          }}
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-champagne-500/10 text-champagne-400 text-[10px] font-bold border border-champagne-500/30 hover:bg-champagne-500/20"
                        >
                          ↓ PNG
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Ready-to-post copy */}
              <CopyBlock
                title="💬 WhatsApp Poster + Broadcast Message"
                body={waMessage}
                copiedKey={copiedKey}
                copyKey="wa"
                onCopy={copyToClipboard}
              />
              <CopyBlock
                title="📸 Instagram Post Caption"
                body={instagramCaption(selectedNominee)}
                copiedKey={copiedKey}
                copyKey="igpost"
                onCopy={copyToClipboard}
              />
              <CopyBlock
                title="⚡ Instagram Story Caption"
                body={`${selectedNominee.full_name} — ${selectedNominee.category_name}\n\nSwipe up and scan to vote!\n\n${qrUrl(selectedNominee)}\n\n#TeluguIconAwards2026 #TIA2026`}
                copiedKey={copiedKey}
                copyKey="igstory"
                onCopy={copyToClipboard}
              />
              <CopyBlock
                title="🎬 Voting Video / Byte Script"
                body={VIDEO_SCRIPT(selectedNominee)}
                copiedKey={copiedKey}
                copyKey="video"
                onCopy={copyToClipboard}
              />

              <div className="p-5 rounded-2xl bg-ink-800/40 border border-white/5 text-xs text-white/50 leading-relaxed">
                <strong className="text-champagne-400 block mb-1">Creator Guidelines:</strong>
                You are permitted to share these official badges across all channels. However, purchasing bot
                votes or offering monetary incentives in exchange for OTP votes is strictly monitored by our
                anti-fraud auditor and will lead to disqualification.
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}

function CopyBlock({ title, body, copiedKey, copyKey, onCopy }) {
  return (
    <div className="card-gold p-6">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h4 className="font-bold text-white text-base">{title}</h4>
        <button
          onClick={() => onCopy(body, copyKey)}
          className="shrink-0 px-3 py-1 rounded-lg bg-champagne-500/10 text-champagne-400 text-xs font-semibold hover:bg-champagne-500/20 border border-champagne-500/30 transition-all"
        >
          {copiedKey === copyKey ? '✓ Copied!' : 'Copy Text'}
        </button>
      </div>
      <pre className="p-4 rounded-xl bg-ink-900 text-white/70 text-xs whitespace-pre-wrap font-sans leading-relaxed border border-white/5 max-h-64 overflow-y-auto">
        {body}
      </pre>
    </div>
  );
}

function VIDEO_SCRIPT(nominee) {
  return [
    `HOOK (0-3s, face to camera, text on screen):`,
    `"I got nominated at the ${EVENT} — and I need 30 seconds of your help."`,
    ``,
    `SETUP (3-8s, show the official poster + QR):`,
    `"I'm ${nominee.full_name}, nominated for ${nominee.category_name || 'Creator of the Year'}."`,
    `"Scan this code or tap the link in my bio — it takes 30 seconds."`,
    ``,
    `PROOF (8-12s, screen recording of the nominee page):`,
    `"One verified mobile number, one vote per category. It's 100% public and OTP-verified."`,
    ``,
    `CALL TO ACTION (12-18s, point at QR):`,
    `"Vote for me before 15 November. Scan the QR, share this video, and rally your family."`,
    ``,
    `END FRAME (static):`,
    `${nominee.full_name} · ${nominee.category_name || 'Official Nominee'}`,
    `Nominee Code: ${nominee.nominee_code || 'TIC26'}`,
    nomineeUrl(nominee),
    `#TeluguIconAwards2026 #TIA2026`,
  ].join('\n');
}
