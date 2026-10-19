import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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
  createPosterFilename,
  POSTER_TEMPLATES,
  POSTER_WIDTH,
  POSTER_HEIGHT,
  STORY_WIDTH,
  STORY_HEIGHT,
  loadImage,
} from '../lib/posterRenderer';
import NomineeHtmlPoster from '../components/NomineeHtmlPoster';
import { exportHtmlPosterToBlob, downloadHtmlPoster } from '../lib/htmlPosterExporter';

export default function NomineeKit() {
  const [searchParams] = useSearchParams();
  const [nominees, setNominees] = useState([]);
  const [selectedNominee, setSelectedNominee] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [categorySponsors, setCategorySponsors] = useState([]);
  const [search, setSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);
  const [qrDataUrlState, setQrDataUrlState] = useState(null);

  // Production-grade asynchronous lifecycle & download readiness states
  const [isLoadingNominees, setIsLoadingNominees] = useState(true);
  const [isLoadingPosterData, setIsLoadingPosterData] = useState(false);
  const [isRenderingPoster, setIsRenderingPoster] = useState(false);
  const [isPosterReady, setIsPosterReady] = useState(false);
  const [posterWarning, setPosterWarning] = useState(null);
  const [posterError, setPosterError] = useState(null);

  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [zipSuccessMessage, setZipSuccessMessage] = useState(null);

  const posterRef = useRef(null);
  const storyRef = useRef(null);
  const posterHtmlRef = useRef(null);
  const storyHtmlRef = useRef(null);
  const qrImageRef = useRef(null);
  const renderSeqRef = useRef(0);

  // 1. Load active nominees on mount with cancellation cleanup
  useEffect(() => {
    let cancelled = false;
    setIsLoadingNominees(true);

    api.get('/nominees')
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data)) {
          setNominees(data);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load nominees list:', err);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingNominees(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Sync selected nominee from query parameter or default to first (stable state reference)
  useEffect(() => {
    if (!nominees.length) return;
    const requested = searchParams.get('nominee');
    const matched = requested
      ? nominees.find((n) => String(n.slug) === requested || String(n.id) === requested)
      : null;
    const target = matched || nominees[0];
    setSelectedNominee((prev) => {
      if (prev && target && String(prev.id) === String(target.id)) {
        return prev;
      }
      return target || null;
    });
  }, [nominees, searchParams]);

  // 3. Atomically coordinated data fetching and asynchronous canvas rendering pipeline
  useEffect(() => {
    if (!selectedNominee) return undefined;

    let cancelled = false;
    const currentSeq = ++renderSeqRef.current;

    setIsPosterReady(false);
    setIsLoadingPosterData(true);
    setIsRenderingPoster(false);
    setPosterError(null);
    setPosterWarning(null);

    // Track nominee campaign kit view event
    track(selectedNominee.id, 'kit_view');

    // Fetch complete poster data from backend
    api.get(`/nominees/${selectedNominee.id}/poster-data`)
      .then(async (data) => {
        if (cancelled || currentSeq !== renderSeqRef.current) return;

        // Data validation
        if (!data || typeof data !== 'object') {
          throw new Error('Malformed poster data payload received from server');
        }

        const category = data.category || (selectedNominee.category_id ? {
          id: selectedNominee.category_id,
          name: selectedNominee.category_name,
        } : null);

        const sponsors = Array.isArray(data.sponsors) ? data.sponsors : [];

        setCategoryData(category);
        setCategorySponsors(sponsors);
        setIsLoadingPosterData(false);
        setIsRenderingPoster(true);

        if (data.validation?.warnings?.length) {
          setPosterWarning(data.validation.warnings.join(' '));
        }

        // Generate genuine scannable QR Code
        const qrValue = qrUrl(selectedNominee);
        let qrSource;
        try {
          qrSource = await qrDataUrl(qrValue, 640);
        } catch (_) {
          qrSource = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrValue)}&size=640x640&margin=8&format=png`;
        }

        const qrImg = await loadImage(qrSource);
        if (cancelled || currentSeq !== renderSeqRef.current) return;
        qrImageRef.current = qrImg;
        setQrDataUrlState(qrSource);

        if (!qrImg) {
          setPosterWarning((prev) =>
            prev ? `${prev} QR code image could not be loaded.` : 'The QR code image could not be loaded.'
          );
        }

        // Render both 4:5 Poster and 9:16 Story canvases
        const [posterCanvas, storyCanvas] = await Promise.all([
          buildPoster(selectedNominee, {
            format: 'poster',
            category,
            sponsors,
            qrImage: qrImg,
          }),
          buildPoster(selectedNominee, {
            format: 'story',
            category,
            sponsors,
            qrImage: qrImg,
          }),
        ]);

        if (cancelled || currentSeq !== renderSeqRef.current) return;

        // Copy rendered result to the mounted preview canvases
        const copyToView = (from, to) => {
          if (!to || !from) return;
          to.width = from.width;
          to.height = from.height;
          const ctx = to.getContext('2d');
          ctx.drawImage(from, 0, 0);
        };

        copyToView(posterCanvas, posterRef.current);
        copyToView(storyCanvas, storyRef.current);

        setIsRenderingPoster(false);
        setIsPosterReady(true);
      })
      .catch((error) => {
        if (cancelled || currentSeq !== renderSeqRef.current) return;
        console.error('Nominee campaign kit workflow failure:', error);
        setIsLoadingPosterData(false);
        setIsRenderingPoster(false);
        setIsPosterReady(false);
        setPosterError('Failed to generate poster. Please check your network connection and reload.');
      });

    return () => {
      cancelled = true;
    };
  }, [selectedNominee?.id]);

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

  // Safe handler for poster PNG / JPG export
  // Filename: CandidateName_FunctionName.png (Requirement 15)
  const handleDownloadPoster = async (format = 'png') => {
    if (!selectedNominee) return;
    try {
      track(selectedNominee.id, 'poster_download', { source: `poster_${format}` });

      // Prefer direct high-res HTML-to-Image download
      if (posterHtmlRef.current) {
        await downloadHtmlPoster(posterHtmlRef.current, {
          candidateName: selectedNominee.full_name,
          categoryName: categoryData?.name || selectedNominee.category_name,
          format,
        });
        return;
      }

      // Fallback to canvas export
      if (posterRef.current && isPosterReady) {
        const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
        const quality = format === 'jpg' ? 0.95 : undefined;
        const dataUrl = posterRef.current.toDataURL(mime, quality);
        const baseName = createPosterFilename(
          selectedNominee.full_name,
          categoryData?.name || selectedNominee.category_name
        ).replace(/\.png$/, '');
        downloadDataUrl(dataUrl, `${baseName}.${format}`);
      }
    } catch (err) {
      console.error('Poster export error:', err);
      setPosterWarning('Poster download failed. Please reload the page or use Poster Studio.');
    }
  };

  // Safe handler for story PNG / JPG export
  const handleDownloadStory = async (format = 'png') => {
    if (!selectedNominee) return;
    try {
      track(selectedNominee.id, 'poster_download', { source: `story_${format}` });

      // Prefer direct high-res HTML-to-Image download
      if (storyHtmlRef.current) {
        const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
        const ext = format === 'jpg' ? 'jpg' : 'png';
        const storyBlob = await exportHtmlPosterToBlob(storyHtmlRef.current, { mimeType: mime });
        if (storyBlob) {
          const storySlug = (selectedNominee.slug || selectedNominee.id).toString();
          const url = URL.createObjectURL(storyBlob);
          downloadDataUrl(url, `Telugu-Icon-Story-${storySlug}.${ext}`);
          setTimeout(() => URL.revokeObjectURL(url), 2000);
          return;
        }
      }

      // Fallback to canvas export
      if (storyRef.current && isPosterReady) {
        const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
        const quality = format === 'jpg' ? 0.95 : undefined;
        const dataUrl = storyRef.current.toDataURL(mime, quality);
        const storySlug = (selectedNominee.slug || selectedNominee.id).toString();
        downloadDataUrl(dataUrl, `Telugu-Icon-Story-${storySlug}.${format}`);
      }
    } catch (err) {
      console.error('Story export error:', err);
      setPosterWarning('Story download failed. Please reload the page or use Poster Studio.');
    }
  };

  // Safe handler for Full Campaign Kit ZIP Download
  const handleDownloadZip = async () => {
    if (!selectedNominee || isGeneratingZip) return;
    setIsGeneratingZip(true);
    setZipSuccessMessage(null);

    try {
      track(selectedNominee.id, 'kit_download', { source: 'zip' });

      // Generate high-resolution QR data URL for ZIP
      const qrValue = qrUrl(selectedNominee);
      let qrPngData = null;
      try {
        qrPngData = await qrDataUrl(qrValue, 1200);
      } catch (_) {}

      // Get high-res blobs from HTML posters if mounted
      let posterBlob = null;
      let storyBlob = null;
      if (posterHtmlRef.current) {
        posterBlob = await exportHtmlPosterToBlob(posterHtmlRef.current, { mimeType: 'image/png' });
      }
      if (storyHtmlRef.current) {
        storyBlob = await exportHtmlPosterToBlob(storyHtmlRef.current, { mimeType: 'image/png' });
      }

      const { blob, filename } = await buildCampaignKitZip({
        nominee: selectedNominee,
        category: categoryData,
        sponsors: categorySponsors,
        posterCanvas: posterRef.current,
        storyCanvas: storyRef.current,
        posterBlob,
        storyBlob,
        qrDataUrl: qrPngData,
      });

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
      console.error('Campaign kit ZIP packaging error:', err);
      alert('Could not package ZIP kit. Please try downloading posters individually.');
    } finally {
      setIsGeneratingZip(false);
    }
  };

  if (!selectedNominee) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-ink-900 flex items-center justify-center">
          <p className="text-white/40 text-sm">
            {isLoadingNominees ? 'Loading campaign kit...' : 'No approved nominees found.'}
          </p>
        </div>
      </PageTransition>
    );
  }

  const page = nomineeUrl(selectedNominee);
  const vote = voteUrl(selectedNominee);
  const categoryTitle = categoryData?.name || selectedNominee.category_name || 'Creator of the Year';
  const currentTemplate = POSTER_TEMPLATES[categoryData?.poster_template || selectedNominee.poster_template || 'gold_prestige'] || POSTER_TEMPLATES.gold_prestige;

  const waMessage = `🏆 Hey friends and family! I'm nominated for *${categoryTitle}* at the *${EVENT}*!\n\nPlease take 30 seconds to cast your OTP-verified vote for *${selectedNominee.full_name}*:\n\n👉 ${vote}\n\nNominee Code: ${selectedNominee.nominee_code || 'TIC26'}\nThank you for believing in me! 🙏✨ #TeluguIconAwards2026 #TIA2026`;

  const isBusy = !isPosterReady || isRenderingPoster || isLoadingPosterData || isGeneratingZip;

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
              disabled={isBusy}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-champagne-400 to-champagne-600 text-ink-900 font-bold text-sm sm:text-base hover:brightness-110 shadow-gold transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>{isGeneratingZip ? '⏳' : isRenderingPoster ? '⚡' : '📦'}</span>
              <span>
                {isGeneratingZip
                  ? 'Packaging Campaign Kit...'
                  : isRenderingPoster || isLoadingPosterData
                  ? 'Rendering Nominee Poster...'
                  : 'Download Full Campaign Kit (ZIP)'}
              </span>
            </button>
          </div>
          {zipSuccessMessage && (
            <p className="text-emerald-400 text-xs font-semibold mt-3 animate-fade-in">{zipSuccessMessage}</p>
          )}
        </div>
      </section>

      <section className="py-10 sm:py-14 bg-ink-900 min-h-screen">
        <div className="max-w-7xl mx-auto px-4">
          {posterError && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center justify-between gap-3">
              <span>{posterError}</span>
              <button
                onClick={() => {
                  renderSeqRef.current++;
                  setSelectedNominee({ ...selectedNominee });
                }}
                className="px-3 py-1 rounded-lg bg-red-500/20 text-red-300 font-bold hover:bg-red-500/30 transition-all"
              >
                Retry
              </button>
            </div>
          )}

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
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/poster?nominee=${selectedNominee.slug || selectedNominee.id}`}
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-champagne-500/20 text-champagne-300 border border-champagne-500/30 hover:bg-champagne-500/30 transition-all flex items-center gap-1"
                      title="Open interactive HTML & Tailwind Poster Studio"
                    >
                      <span>🎨</span>
                      <span>Studio</span>
                    </Link>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-champagne-500/15 text-champagne-300 border border-champagne-500/30">
                      HTML5
                    </span>
                  </div>
                </div>

                {/* HTML Poster Preview (1080x1620 scaled to 360x540) */}
                <div className="relative mx-auto w-[360px] h-[540px] rounded-2xl overflow-hidden shadow-2xl border border-champagne-500/40 bg-black/40 flex items-start justify-center">
                  {(isLoadingPosterData || isRenderingPoster) && (
                    <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-30 p-4 text-center">
                      <div className="w-8 h-8 rounded-full border-2 border-champagne-400 border-t-transparent animate-spin" />
                      <span className="text-champagne-300 font-bold text-xs">
                        {isLoadingPosterData ? 'Fetching Campaign Data...' : 'Rendering Golden Nominee Poster...'}
                      </span>
                    </div>
                  )}
                  <div style={{ width: '1080px', height: '1620px', transform: 'scale(0.333333)', transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
                    <NomineeHtmlPoster
                      ref={posterHtmlRef}
                      nominee={selectedNominee}
                      category={categoryData}
                      sponsors={categorySponsors}
                      qrUrl={qrDataUrlState || qrUrl(selectedNominee)}
                      event={{
                        date: '16 NOVEMBER 2026',
                        venue: 'SHILPAKALA VEDIKA, HYDERABAD',
                      }}
                    />
                  </div>
                  <canvas ref={posterRef} className="hidden" />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-2 max-w-[380px] mx-auto">
                  <button
                    onClick={() => handleDownloadPoster('png')}
                    disabled={isBusy}
                    className="py-2.5 px-3 rounded-xl bg-champagne-500 text-ink-900 font-bold text-xs hover:bg-champagne-400 transition-all shadow-gold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isRenderingPoster ? 'Rendering...' : 'Download PNG ↓'}
                  </button>
                  <button
                    onClick={() => handleDownloadPoster('jpg')}
                    disabled={isBusy}
                    className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Download JPG ↓
                  </button>
                  <button
                    onClick={() => copyToClipboard(voteUrl(selectedNominee), 'voting-link-btn')}
                    className="py-2.5 px-3 rounded-xl bg-emerald-950/40 text-emerald-300 hover:bg-emerald-950/70 border border-emerald-500/30 text-xs font-semibold transition-all"
                  >
                    {copiedKey === 'voting-link-btn' ? '✓ Link Copied!' : '🔗 Copy Voting Link'}
                  </button>
                  <button
                    onClick={handleDownloadZip}
                    disabled={isBusy}
                    className="py-2.5 px-3 rounded-xl bg-ink-800 border border-champagne-500/40 text-champagne-400 font-bold text-xs hover:bg-ink-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isGeneratingZip ? 'Packaging...' : '📦 Full Kit (ZIP)'}
                  </button>
                </div>
              </div>

              <div className="card-gold p-6 text-center">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold font-display text-white">Instagram Story (9:16)</h3>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-champagne-500/15 text-champagne-300 border border-champagne-500/30">
                    Story
                  </span>
                </div>

                {/* HTML Story Preview (1080x1920 scaled to 240x426) */}
                <div className="relative mx-auto w-[240px] h-[426px] rounded-2xl overflow-hidden shadow-2xl border border-champagne-500/40 bg-black/40 flex items-start justify-center">
                  {(isLoadingPosterData || isRenderingPoster) && (
                    <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-30 p-2 text-center">
                      <div className="w-6 h-6 rounded-full border-2 border-champagne-400 border-t-transparent animate-spin" />
                      <span className="text-champagne-300 font-bold text-[11px]">Rendering Story...</span>
                    </div>
                  )}
                  <div style={{ width: '1080px', height: '1920px', transform: 'scale(0.222222)', transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
                    <NomineeHtmlPoster
                      ref={storyHtmlRef}
                      nominee={selectedNominee}
                      category={categoryData}
                      sponsors={categorySponsors}
                      qrUrl={qrDataUrlState || qrUrl(selectedNominee)}
                      format="story"
                      event={{
                        date: '16 NOVEMBER 2026',
                        venue: 'SHILPAKALA VEDIKA, HYDERABAD',
                      }}
                    />
                  </div>
                  <canvas ref={storyRef} className="hidden" />
                </div>
                <div className="mt-6 grid grid-cols-2 gap-2 max-w-[240px] mx-auto">
                  <button
                    onClick={() => handleDownloadStory('png')}
                    disabled={isBusy}
                    className="py-2.5 px-2 rounded-xl bg-champagne-500 text-ink-900 font-bold text-xs hover:bg-champagne-400 transition-all shadow-gold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Story (PNG) ↓
                  </button>
                  <button
                    onClick={() => handleDownloadStory('jpg')}
                    disabled={isBusy}
                    className="py-2.5 px-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Story (JPG) ↓
                  </button>
                </div>
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
                          <p className="text-white/40 text-[10px]">
                            {sp.tier === 'title_partner'
                              ? 'Title Partner'
                              : sp.tier === 'powered_by'
                              ? 'Powered By'
                              : sp.tier === 'co_powered_by'
                              ? 'Co-Powered By'
                              : sp.role || 'Category Partner'}
                          </p>
                        </div>
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
                    disabled={isBusy}
                    className="shrink-0 px-3.5 py-2 rounded-xl bg-champagne-500 text-ink-900 font-bold text-xs hover:bg-champagne-400 shadow-gold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
                          disabled={isBusy}
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-champagne-500 text-ink-900 text-[10px] font-bold hover:bg-champagne-400 disabled:opacity-40 disabled:cursor-not-allowed"
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
                          onClick={() => handleDownloadPoster('png')}
                          disabled={isBusy}
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-champagne-500/10 text-champagne-400 text-[10px] font-bold border border-champagne-500/30 hover:bg-champagne-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          ↓ PNG
                        </button>
                      )}

                      {asset.kind === 'story' && (
                        <button
                          onClick={() => handleDownloadStory('png')}
                          disabled={isBusy}
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-champagne-500/10 text-champagne-400 text-[10px] font-bold border border-champagne-500/30 hover:bg-champagne-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
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
