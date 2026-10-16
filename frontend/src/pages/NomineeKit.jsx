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
import {
  buildPoster,
  buildCampaignKitZip,
  POSTER_TEMPLATES,
  POSTER_WIDTH,
  POSTER_HEIGHT,
  STORY_WIDTH,
  STORY_HEIGHT,
  loadImage,
} from '../lib/posterRenderer';

export default function NomineeKit() {
  const [searchParams] = useSearchParams();
  const [nominees, setNominees] = useState([]);
  const [selectedNominee, setSelectedNominee] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [categorySponsors, setCategorySponsors] = useState([]);
  const [search, setSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);
  const [posterWarning, setPosterWarning] = useState(null);
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [zipSuccessMessage, setZipSuccessMessage] = useState(null);

  const posterRef = useRef(null);
  const storyRef = useRef(null);
  const qrImageRef = useRef(null);

  // Load active nominees
  useEffect(() => {
    api.get('/nominees').then((data) => {
      if (Array.isArray(data)) setNominees(data);
    }).catch(() => {});
  }, []);

  // Sync selected nominee from query parameter or default to first
  useEffect(() => {
    if (!nominees.length) return;
    const requested = searchParams.get('nominee');
    const match = requested
      ? nominees.find((n) => String(n.slug) === requested || String(n.id) === requested)
      : null;
    setSelectedNominee(match || nominees[0]);
  }, [nominees, searchParams]);

  // Fetch full category poster data & category sponsors whenever selected nominee changes
  useEffect(() => {
    if (!selectedNominee) return;
    let cancelled = false;

    // Fetch poster data from API
    api.get(`/nominees/${selectedNominee.id}/poster-data`)
      .then((data) => {
        if (cancelled) return;
        if (data.category) setCategoryData(data.category);
        if (Array.isArray(data.sponsors)) setCategorySponsors(data.sponsors);
        if (data.validation?.warnings?.length) {
          setPosterWarning(data.validation.warnings.join(' '));
        } else {
          setPosterWarning(null);
        }
      })
      .catch(() => {
        // Fallback: fetch directly from category sponsors endpoint
        if (selectedNominee.category_id) {
          api.get(`/categories/${selectedNominee.category_id}/sponsors`)
            .then((spons) => {
              if (cancelled) return;
              if (Array.isArray(spons)) setCategorySponsors(spons);
            })
            .catch(() => {});
        }
      });

    return () => { cancelled = true; };
  }, [selectedNominee]);

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

  // Render both canvases whenever selected nominee or category sponsors change
  useEffect(() => {
    if (!selectedNominee) return undefined;
    let cancelled = false;

    (async () => {
      try {
        track(selectedNominee.id, 'kit_view');
        const qrValue = qrUrl(selectedNominee);

        let qrSource;
        try {
          qrSource = await qrDataUrl(qrValue, 640);
        } catch (_) {
          qrSource = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrValue)}&size=640x640&margin=8&format=png`;
        }
        const qrImg = await loadImage(qrSource);
        qrImageRef.current = qrImg;

        // Render 4:5 Poster and 9:16 Story using category template and category sponsors
        const posterCanvas = await buildPoster(selectedNominee, {
          format: 'poster',
          category: categoryData,
          sponsors: categorySponsors,
          qrImage: qrImg,
        });

        const storyCanvas = await buildPoster(selectedNominee, {
          format: 'story',
          category: categoryData,
          sponsors: categorySponsors,
          qrImage: qrImg,
        });

        if (cancelled) return;

        const copyToView = (from, to) => {
          if (!to) return;
          to.width = from.width;
          to.height = from.height;
          const ctx = to.getContext('2d');
          ctx.drawImage(from, 0, 0);
        };

        copyToView(posterCanvas, posterRef.current);
        copyToView(storyCanvas, storyRef.current);

        if (!qrImg) {
          setPosterWarning('The QR code could not be generated. Do not print this poster without reloading — the printed URL is still correct.');
        }
      } catch (error) {
        setPosterWarning('Poster generation failed. Please reload this page.');
      }
    })();

    return () => { cancelled = true; };
  }, [selectedNominee, categoryData, categorySponsors]);

  // Handle Full Campaign Kit ZIP Download
  const handleDownloadZip = async () => {
    if (!selectedNominee || !posterRef.current || isGeneratingZip) return;
    setIsGeneratingZip(true);
    setZipSuccessMessage(null);

    try {
      track(selectedNominee.id, 'kit_download', { source: 'zip' });

      // Generate QR data url for ZIP
      const qrValue = qrUrl(selectedNominee);
      let qrPngData = null;
      try {
        qrPngData = await qrDataUrl(qrValue, 1200);
      } catch (_) {}

      const { blob, filename } = await buildCampaignKitZip({
        nominee: selectedNominee,
        category: categoryData,
        sponsors: categorySponsors,
        posterCanvas: posterRef.current,
        storyCanvas: storyRef.current,
        qrDataUrl: qrPngData,
      });

      // Trigger browser download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setZipSuccessMessage('✓ Campaign Kit ZIP downloaded successfully!');
      setTimeout(() => setZipSuccessMessage(null), 4000);
    } catch (err) {
      alert('Could not package ZIP kit. Please try downloading posters individually.');
    } finally {
      setIsGeneratingZip(false);
    }
  };

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
  const categoryTitle = categoryData?.name || selectedNominee.category_name || 'Creator of the Year';
  const currentTemplate = POSTER_TEMPLATES[categoryData?.poster_template || selectedNominee.poster_template || 'gold_prestige'] || POSTER_TEMPLATES.gold_prestige;

  const waMessage = `🏆 Hey friends and family! I'm nominated for *${categoryTitle}* at the *${EVENT}*!\n\nPlease take 30 seconds to cast your OTP-verified vote for *${selectedNominee.full_name}*:\n\n👉 ${vote}\n\nNominee Code: ${selectedNominee.nominee_code || 'TIC26'}\nThank you for believing in me! 🙏✨ #TeluguIconAwards2026 #TIA2026`;

  const assets = [
    { key: 'zip', icon: '📦', label: 'Full Campaign Kit (ZIP)', value: 'Includes Poster, Story, QR & Copy', kind: 'zip' },
    { key: 'poster', icon: '🖼️', label: 'Nominee Poster (4:5 PNG)', kind: 'poster' },
    { key: 'story', icon: '📱', label: 'Instagram Story (9:16 PNG)', kind: 'story' },
    { key: 'qr', icon: '📲', label: 'High-Res QR Code (PNG)', value: qrUrl(selectedNominee), kind: 'qr' },
    { key: 'page', icon: '🔗', label: 'My Nominee Page', value: page, kind: 'copy' },
    { key: 'vote', icon: '🗳️', label: 'My Voting Link', value: vote, kind: 'copy' },
    { key: 'code', icon: '#️⃣', label: 'Nominee Code', value: selectedNominee.nominee_code || 'TIC26', kind: 'copy' },
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
            Everything you need to campaign: category-branded posters, Instagram stories,
            verified QR codes, ready-to-post copy, and one-click ZIP download.
          </p>

          {/* Quick ZIP download hero CTA */}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={handleDownloadZip}
              disabled={isGeneratingZip}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-champagne-400 to-champagne-600 text-ink-900 font-bold text-sm sm:text-base hover:brightness-110 shadow-gold transition-all flex items-center gap-2"
            >
              <span>{isGeneratingZip ? '⏳' : '📦'}</span>
              <span>{isGeneratingZip ? 'Packaging Campaign Kit...' : 'Download Full Campaign Kit (ZIP)'}</span>
            </button>
          </div>
          {zipSuccessMessage && (
            <p className="text-emerald-400 text-xs font-semibold mt-3 animate-fade-in">{zipSuccessMessage}</p>
          )}
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold font-display text-white">Official Nominee Poster (4:5)</h3>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-champagne-500/15 text-champagne-300 border border-champagne-500/30">
                    Template: {currentTemplate.name.split(' ')[0]}
                  </span>
                </div>
                <div className="relative mx-auto max-w-[380px] rounded-2xl overflow-hidden shadow-2xl border border-champagne-500/40">
                  <canvas ref={posterRef} className="w-full h-auto block" />
                </div>
                <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center max-w-[380px] mx-auto">
                  <button
                    onClick={() => {
                      track(selectedNominee.id, 'poster_download', { source: 'poster' });
                      downloadDataUrl(posterRef.current.toDataURL('image/png'), `Telugu-Icon-Poster-${selectedNominee.slug || selectedNominee.id}.png`);
                    }}
                    className="flex-1 py-3 rounded-xl bg-champagne-500 text-ink-900 font-bold text-xs hover:bg-champagne-400 transition-all shadow-gold"
                  >
                    Download Poster (PNG) ↓
                  </button>
                  <button
                    onClick={handleDownloadZip}
                    disabled={isGeneratingZip}
                    className="py-3 px-4 rounded-xl bg-ink-800 border border-champagne-500/40 text-champagne-400 font-bold text-xs hover:bg-ink-700 transition-all"
                  >
                    📦 Full Kit (ZIP)
                  </button>
                </div>
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

              {/* Category Sponsors Information Block */}
              <div className="card-gold p-5">
                <h4 className="font-display text-sm font-bold text-white mb-2 flex items-center justify-between">
                  <span>🤝 Official Category Partners</span>
                  <span className="text-[11px] text-champagne-400 font-mono">
                    {categorySponsors.length} {categorySponsors.length === 1 ? 'Sponsor' : 'Sponsors'}
                  </span>
                </h4>
                {categorySponsors.length > 0 ? (
                  <div className="space-y-2 mt-3">
                    {categorySponsors.map((sp) => (
                      <div key={sp.id || sp.association_id} className="flex items-center gap-3 p-2.5 rounded-xl bg-ink-900/60 border border-white/5">
                        {sp.logo_url ? (
                          <img src={getAssetUrl(sp.logo_url)} alt={sp.name} className="w-10 h-10 object-contain rounded-lg bg-black/40 p-1" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-champagne-500/10 border border-champagne-500/20 flex items-center justify-center text-sm font-bold text-champagne-400">
                            {sp.name[0]}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-semibold truncate">{sp.name}</p>
                          <p className="text-white/40 text-[10px]">{sp.role || 'Category Partner'}</p>
                        </div>
                        {sp.website_url && (
                          <a href={sp.website_url} target="_blank" rel="noopener noreferrer" className="text-champagne-400 text-xs hover:underline">
                            ↗ Visit
                          </a>
                        )}
                      </div>
                    ))}
                    <p className="text-[10px] text-white/40 mt-2">
                      These sponsor logos are automatically integrated into the bottom section of your official campaign poster.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-white/40 mt-1">
                    No individual category sponsors assigned. The official Telugu Icon event branding and Pracharam Media endorsement are displayed.
                  </p>
                )}
              </div>
            </div>

            {/* Asset list */}
            <div className="space-y-4">
              <div className="card-gold p-6">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-lg font-bold font-display text-white mb-1">📦 My Campaign Material</h3>
                    <p className="text-white/40 text-xs">
                      Approved for {selectedNominee.full_name} · {categoryTitle}
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadZip}
                    disabled={isGeneratingZip}
                    className="shrink-0 px-3.5 py-2 rounded-xl bg-champagne-500 text-ink-900 font-bold text-xs hover:bg-champagne-400 shadow-gold transition-all"
                  >
                    {isGeneratingZip ? 'Packaging...' : '⬇ Download ZIP'}
                  </button>
                </div>

                {/* Live QR preview */}
                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 my-4 rounded-2xl bg-ink-900/60 border border-champagne-500/20">
                  <QrBlock value={qrUrl(selectedNominee)} size={150} />
                  <div className="flex-1 text-center sm:text-left">
                    <h4 className="font-bold text-white text-sm mb-1">My QR Code</h4>
                    <p className="text-white/40 text-xs mb-2">
                      Printed on your poster and story. Scans open your profile with OTP voting pre-selected.
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

                      {asset.kind === 'zip' && (
                        <button
                          onClick={handleDownloadZip}
                          disabled={isGeneratingZip}
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-champagne-500 text-ink-900 text-[10px] font-bold hover:bg-champagne-400"
                        >
                          {isGeneratingZip ? 'Generating...' : '↓ Download'}
                        </button>
                      )}

                      {asset.kind === 'copy' && (
                        <button
                          onClick={() => copyToClipboard(asset.value, asset.key)}
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-champagne-500/10 text-champagne-400 text-[10px] font-bold border border-champagne-500/30 hover:bg-champagne-500/20"
                        >
                          {copiedKey === asset.key ? '✓ Copied' : 'Copy'}
                        </button>
                      )}

                      {(asset.kind === 'poster' || asset.kind === 'poster+copy') && (
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

                      {asset.kind === 'story' && (
                        <button
                          onClick={() => {
                            track(selectedNominee.id, 'poster_download', { source: asset.key });
                            downloadDataUrl(storyRef.current.toDataURL('image/png'), `Telugu-Icon-Story-${selectedNominee.slug || selectedNominee.id}.png`);
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
                body={`${selectedNominee.full_name} — ${categoryTitle}\n\nSwipe up and scan to vote!\n\n${qrUrl(selectedNominee)}\n\n#TeluguIconAwards2026 #TIA2026`}
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
                You are permitted to share these official badges and posters across all channels. Purchasing bot
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
