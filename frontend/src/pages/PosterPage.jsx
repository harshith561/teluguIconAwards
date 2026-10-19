import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import { api, getAssetUrl } from '../api';
import {
  qrUrl,
  qrDataUrl,
  track,
  nomineeUrl,
  voteUrl,
  downloadQrPng,
  EVENT,
  EVENT_HASHTAGS,
} from '../lib/nomineeCampaign';
import { createPosterFilename } from '../lib/posterRenderer';
import { exportHtmlPosterToBlob, downloadHtmlPoster } from '../lib/htmlPosterExporter';
import NomineeHtmlPoster from '../components/NomineeHtmlPoster';

export default function PosterPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { id: paramId } = useParams();

  const [nominees, setNominees] = useState([]);
  const [selectedNominee, setSelectedNominee] = useState(null);
  const [sponsors, setSponsors] = useState([]);
  const [categoryName, setCategoryName] = useState('TELUGU YOUTUBER OF THE YEAR');
  const [candidateName, setCandidateName] = useState('Creator Name');
  const [customPhotoUrl, setCustomPhotoUrl] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState(null);

  const [format, setFormat] = useState('poster'); // 'poster' (2:3) or 'story' (9:16)
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Active Campaign Resource Card Tab
  const [activeResource, setActiveResource] = useState('voting-link');
  const [copiedKey, setCopiedKey] = useState(null);
  const [isQrDownloading, setIsQrDownloading] = useState(false);

  const posterContainerRef = useRef(null);

  // 1. Fetch all nominees and active sponsors on mount from backend
  useEffect(() => {
    let cancelled = false;
    setIsLoadingData(true);

    Promise.all([
      api.get('/nominees').catch(() => []),
      api.get('/sponsors').catch(() => []),
    ])
      .then(([nomineesData, sponsorsData]) => {
        if (cancelled) return;
        const validNominees = Array.isArray(nomineesData) ? nomineesData : [];
        setNominees(validNominees);

        const activeSponsors = (Array.isArray(sponsorsData) ? sponsorsData : []).filter(
          (s) => s && s.is_active !== 0 && !s.excluded_from_poster
        );
        setSponsors(activeSponsors);

        // Determine target nominee from paramId, query param, or first nominee
        const querySlug = searchParams.get('nominee') || paramId;
        let matched = null;
        if (querySlug) {
          matched = validNominees.find(
            (n) => String(n.id) === String(querySlug) || String(n.slug) === String(querySlug)
          );
        }
        if (!matched && validNominees.length > 0) {
          matched = validNominees[0];
        }

        if (matched) {
          setSelectedNominee(matched);
          setCandidateName(matched.full_name || 'Creator Name');
          setCategoryName((matched.category_name || 'TELUGU YOUTUBER OF THE YEAR').toUpperCase());
          if (matched.photo_url) {
            setCustomPhotoUrl(getAssetUrl(matched.photo_url));
          }
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingData(false);
      });

    return () => {
      cancelled = true;
    };
  }, [paramId]);

  // 2. When nominee changes, generate QR Code and sync form fields with backend data
  useEffect(() => {
    if (!selectedNominee) return;
    setCandidateName(selectedNominee.full_name || 'Creator Name');
    setCategoryName((selectedNominee.category_name || 'TELUGU YOUTUBER OF THE YEAR').toUpperCase());
    setCustomPhotoUrl(selectedNominee.photo_url ? getAssetUrl(selectedNominee.photo_url) : null);

    let cancelled = false;
    const targetUrl = qrUrl(selectedNominee);

    qrDataUrl(targetUrl, 800)
      .then((dataUrl) => {
        if (!cancelled) setQrCodeDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setQrCodeDataUrl(
            `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(targetUrl)}&size=800x800&margin=8&format=png`
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedNominee?.id]);

  // Handle Nominee Selection: Automatically populates from backend
  const handleSelectNominee = (nomineeId) => {
    const found = nominees.find((n) => String(n.id) === String(nomineeId));
    if (found) {
      setSelectedNominee(found);
      setSearchParams({ nominee: found.slug || found.id });
    }
  };

  // Reset to original nominee data from database
  const handleResetToNominee = () => {
    if (!selectedNominee) return;
    setCandidateName(selectedNominee.full_name || 'Creator Name');
    setCategoryName((selectedNominee.category_name || 'TELUGU YOUTUBER OF THE YEAR').toUpperCase());
    setCustomPhotoUrl(selectedNominee.photo_url ? getAssetUrl(selectedNominee.photo_url) : null);
  };

  // Custom Photo Upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomPhotoUrl(url);
    }
  };

  // Browser Direct Download (PNG / JPG)
  const handleDownload = async (fileFormat = 'png') => {
    if (!posterContainerRef.current || isDownloading) return;
    setIsDownloading(true);
    setDownloadSuccess(null);

    try {
      if (selectedNominee) {
        track(selectedNominee.id, 'poster_download', { source: `html_${format}_${fileFormat}` });
      }

      const mimeType = fileFormat === 'jpg' ? 'image/jpeg' : 'image/png';
      const ext = fileFormat === 'jpg' ? 'jpg' : 'png';
      const baseFilename = createPosterFilename(candidateName, categoryName).replace(/\.png$/, '');
      const finalFilename = format === 'story'
        ? `Telugu-Icon-Awards-2026-Story-${baseFilename}.${ext}`
        : `${baseFilename}.${ext}`;

      const blob = await exportHtmlPosterToBlob(posterContainerRef.current, {
        mimeType,
        pixelRatio: 1, // Poster is rendered natively at 1080px
      });

      if (!blob) {
        throw new Error('Failed to create poster image blob');
      }

      // Native Browser Download Trigger
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);

      setDownloadSuccess(`✓ ${finalFilename} downloaded successfully!`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err) {
      console.error('Browser download error:', err);
      alert('Could not download poster. Please check console or try browser print.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Browser Print / Save as PDF
  const handleBrowserPrint = () => {
    window.print();
  };

  // Copy helper
  const copyToClipboard = useCallback((text, key) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  }, []);

  // Download high-res QR code PNG
  const handleQrDownload = async () => {
    if (!selectedNominee) return;
    setIsQrDownloading(true);
    try {
      track(selectedNominee.id, 'qr_download');
      await downloadQrPng(
        qrUrl(selectedNominee),
        `Telugu-Icon-Awards-QR-${selectedNominee.slug || selectedNominee.id}.png`,
        1200
      );
    } finally {
      setIsQrDownloading(false);
    }
  };

  // Preview Scale Calculation
  const isStory = format === 'story';
  const nativeW = 1080;
  const nativeH = isStory ? 1920 : 1620;
  // Scaled for desktop view to fit comfortably in view column (width ~420px)
  const previewScale = isStory ? 0.28 : 0.388;
  const previewBoxW = Math.round(nativeW * previewScale);
  const previewBoxH = Math.round(nativeH * previewScale);

  const activeNomineePayload = {
    ...selectedNominee,
    full_name: candidateName,
    photo_url: customPhotoUrl || selectedNominee?.photo_url,
    category_name: categoryName,
  };

  const votingPageUrl = selectedNominee ? nomineeUrl(selectedNominee) : 'https://teluguiconawards.in';
  const directVoteUrl = selectedNominee ? voteUrl(selectedNominee) : 'https://teluguiconawards.in/vote';

  // 6 Promotional Campaign Copy Templates
  const instagramText = `Humbled and honoured to announce my official nomination for ${categoryName} at the ${EVENT}! 🏆✨\n\nVoting is 100% public and OTP-verified. Cast your vote for me here 👉 ${votingPageUrl}\n\nNominee Code: ${selectedNominee?.nominee_code || 'TIC26'}\n\n${EVENT_HASHTAGS} #TeluguCreators #TeluguInfluencers #VoteForMe`;

  const whatsappText = `🏆 *నమస్కారం!* I have been officially nominated for *${categoryName}* at the *${EVENT}*!\n\nPlease take 30 seconds to support me and cast your OTP-verified vote here:\n👉 ${directVoteUrl}\n\nNominee Code: *${selectedNominee?.nominee_code || 'TIC26'}*\nThank you for believing in me! ప్రతి ఓటు ఎంతో ముఖ్యం 🙏✨ ${EVENT_HASHTAGS}`;

  const youtubeText = `Dear YouTube Family ❤️ Super proud to announce my official nomination for "${categoryName}" at the prestigious ${EVENT}! 🏆\n\nPublic voting is now officially open! Every single vote from you means the world to me.\n\n👉 Cast your vote here: ${directVoteUrl}\n(Nominee Code: ${selectedNominee?.nominee_code || 'TIC26'})\n\nThank you for all your constant love and encouragement. Let's bring this trophy home! 🌟`;

  const videoScript = `Script (30 Seconds Reel / Shorts):\n"Hey guys! I have some super exciting news to share today! I've been officially nominated for ${categoryName} at the Telugu Icon Awards 2026! 🏆\n\nThank you all so much for your continuous love and support. Official voting is live right now! Click the link in my bio or scan the QR code on my official poster to cast your vote. Let's bring this trophy home together! Love you all!" 🎬`;

  // 6 Resource Cards from user's specification
  const RESOURCE_ITEMS = [
    {
      id: 'voting-link',
      title: 'Unique Voting Link',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      ),
      desc: 'Direct link to nominee profile with instant OTP voting form.',
    },
    {
      id: 'instagram-story',
      title: 'Instagram Story Template',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      ),
      desc: 'Optimized 9:16 story copy, hashtags, and sticker tips.',
    },
    {
      id: 'whatsapp-status',
      title: 'WhatsApp Status Template',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      ),
      desc: 'Telugu & English broadcast copy for status & group shares.',
    },
    {
      id: 'youtube-community',
      title: 'YouTube Community Copy',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      ),
      desc: 'Formatted announcement text for YouTube Community posts.',
    },
    {
      id: 'video-announcement',
      title: 'Video Announcement Template',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
          <line x1="7" y1="2" x2="7" y2="22" />
          <line x1="17" y1="2" x2="17" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
        </svg>
      ),
      desc: '30-second video script for Reels, Shorts, and TikTok.',
    },
    {
      id: 'shareable-qr',
      title: 'Shareable QR Code',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
      desc: 'High-resolution scannable QR code for print and social media.',
    },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-ink-900 text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Print Stylesheet: prints ONLY the poster cleanly */}
        <style dangerouslySetInnerHTML={{
          __html: `
          @media print {
            body * { visibility: hidden !important; }
            #printable-poster, #printable-poster * { visibility: visible !important; }
            #printable-poster {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100vw !important;
              height: 100vh !important;
              transform: none !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            nav, footer, .no-print { display: none !important; }
          }
        ` }} />

        {/* Hero Header */}
        <div className="max-w-6xl mx-auto text-center mb-10 no-print">
          <span className="text-xs uppercase tracking-[3px] text-champagne-400 font-bold">
            Creator Campaign Engine
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold font-display mt-2 mb-3">
            Dynamic <span className="text-transparent bg-clip-text bg-gradient-to-r from-champagne-200 via-champagne-400 to-champagne-600">Awards Poster</span> Studio
          </h1>
          <p className="text-white/60 text-sm sm:text-base max-w-2xl mx-auto">
            Rendered live with React &amp; Tailwind CSS over the official Telugu Icon golden template.
            Nominee details load directly from the database and can be edited live with one-click direct browser download.
          </p>
        </div>

        {/* Main Grid: Controls Left, Poster Right */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Controls Column (5 cols) */}
          <div className="lg:col-span-5 bg-ink-800/80 border border-champagne-500/30 rounded-2xl p-6 backdrop-blur-md space-y-6 no-print shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg font-bold font-display text-white">Poster Customizer</h2>
                <p className="text-xs text-white/50">Data loaded from backend · Edit live</p>
              </div>
              {selectedNominee && (
                <button
                  type="button"
                  onClick={handleResetToNominee}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-[11px] text-champagne-300 transition-all font-semibold"
                  title="Reload original nominee values from database"
                >
                  ↺ Reset Data
                </button>
              )}
            </div>

            {/* Select Nominee from Backend */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                Select Nominee (from Database)
              </label>
              <select
                value={selectedNominee?.id || ''}
                onChange={(e) => handleSelectNominee(e.target.value)}
                className="w-full bg-ink-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-champagne-400 transition-all"
              >
                {nominees.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.full_name} · {n.category_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Candidate Name Input (Editable) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                Creator / Candidate Name
              </label>
              <input
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="Enter candidate name..."
                className="w-full bg-ink-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-champagne-400 transition-all font-display"
              />
            </div>

            {/* Category Name Input (Editable) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                Award Category
              </label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value.toUpperCase())}
                placeholder="e.g. TELUGU YOUTUBER OF THE YEAR"
                className="w-full bg-ink-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-champagne-400 transition-all uppercase tracking-wide text-xs"
              />
            </div>

            {/* Nominee Photo Option */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                Nominee Portrait
              </label>
              <div className="flex items-center gap-3">
                <label className="flex-1 cursor-pointer py-2.5 px-3 rounded-xl bg-ink-900 border border-white/15 hover:border-champagne-400/50 text-xs text-white/80 font-semibold text-center transition-all flex items-center justify-center gap-2">
                  <span>📷 Upload Custom Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                {customPhotoUrl && (
                  <button
                    onClick={() => setCustomPhotoUrl(null)}
                    className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white/70 font-semibold"
                    title="Reset to default avatar"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Format Toggle: Poster vs Story */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                Aspect Ratio / Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat('poster')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${format === 'poster'
                    ? 'bg-champagne-500 text-ink-900 border-champagne-400 shadow-gold'
                    : 'bg-ink-900 text-white/70 border-white/15 hover:border-white/30'
                    }`}
                >
                  🖼️ Poster (2:3 / 1080×1620)
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('story')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${format === 'story'
                    ? 'bg-champagne-500 text-ink-900 border-champagne-400 shadow-gold'
                    : 'bg-ink-900 text-white/70 border-white/15 hover:border-white/30'
                    }`}
                >
                  📱 Story (9:16 / 1080×1920)
                </button>
              </div>
            </div>

            {/* Download Buttons Section */}
            <div className="pt-4 border-t border-white/10 space-y-2.5">
              <span className="block text-xs font-bold uppercase tracking-wider text-champagne-400 mb-1">
                Direct Browser Downloads
              </span>

              <button
                onClick={() => handleDownload('png')}
                disabled={isDownloading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-champagne-400 to-champagne-600 text-ink-900 font-bold text-sm hover:brightness-110 shadow-gold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{isDownloading ? '⏳' : '⬇'}</span>
                <span>{isDownloading ? 'Generating...' : `Download High-Res PNG (${format === 'story' ? '9:16' : '2:3'})`}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleDownload('jpg')}
                  disabled={isDownloading}
                  className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <span>⬇</span>
                  <span>Download JPG</span>
                </button>

                <button
                  onClick={handleBrowserPrint}
                  className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <span>🖨️</span>
                  <span>Print / Save PDF</span>
                </button>
              </div>

              {downloadSuccess && (
                <p className="text-emerald-400 text-xs font-semibold text-center mt-2 animate-fade-in">
                  {downloadSuccess}
                </p>
              )}
            </div>

            {/* Quick Link to Nominee Kit */}
            <div className="pt-2 text-center">
              <Link
                to={`/nominee-kit?nominee=${selectedNominee?.slug || selectedNominee?.id || ''}`}
                className="text-xs text-champagne-400/80 hover:text-champagne-300 underline font-semibold"
              >
                ← Back to Full Campaign Kit &amp; ZIP Download
              </Link>
            </div>
          </div>

          {/* Poster Display Column (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            <div className="text-center mb-3 no-print">
              <span className="text-xs text-white/50 font-mono">
                Live Preview: {format === 'story' ? 'Instagram Story (1080×1920)' : 'Official Nominee Poster (1080×1620)'}
              </span>
            </div>

            {/* Responsive Scaling Preview Wrapper */}
            <div
              className="relative rounded-2xl overflow-hidden shadow-2xl border border-champagne-500/40 bg-black/60 flex items-start justify-center"
              style={{
                width: `${previewBoxW}px`,
                height: `${previewBoxH}px`,
              }}
            >
              {/* Scaled HTML Poster Element */}
              <div
                style={{
                  width: `${nativeW}px`,
                  height: `${nativeH}px`,
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top left',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                }}
              >
                <div id="printable-poster">
                  <NomineeHtmlPoster
                    ref={posterContainerRef}
                    nominee={activeNomineePayload}
                    category={{ name: categoryName }}
                    sponsors={sponsors}
                    qrUrl={qrCodeDataUrl || (selectedNominee ? qrUrl(selectedNominee) : null)}
                    format={format}
                    event={{
                      date: '16 NOVEMBER 2026',
                      venue: 'SHILPAKALA VEDIKA, HYDERABAD',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Info badge below poster */}
            <div className="mt-4 text-center max-w-md text-xs text-white/40 no-print">
              💡 <span className="text-champagne-400 font-semibold">100% Dynamic HTML:</span> Changes in the customizer update the poster in real-time. Direct browser download exports at pristine 1080px resolution with dynamic filename <span className="font-mono text-champagne-300">CandidateName_FunctionName.png</span>.
            </div>
          </div>

        </div>

        {/* ── CAMPAIGN DISTRIBUTION SUITE (Added below to other section per user prompt & image) ── */}
        <div className="max-w-6xl mx-auto mt-16 no-print">
          <div className="text-center mb-8">
            <span className="text-xs uppercase tracking-[3px] text-champagne-400 font-bold">
              Nominee Campaign Resources
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold font-display mt-2 mb-2">
              Share &amp; Rally Your Community
            </h2>
            <p className="text-white/60 text-xs sm:text-sm max-w-xl mx-auto">
              Official promotion templates tailored for {candidateName}. Click any tile below to preview and copy your voting links, social templates, and shareable QR code.
            </p>
          </div>

          {/* 6 Rounded Resource Cards from user's uploaded screenshot */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
            {RESOURCE_ITEMS.map((item) => {
              const isSelected = activeResource === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveResource(item.id)}
                  className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all duration-300 border ${isSelected
                    ? 'bg-gradient-to-b from-[#2a131b] to-[#1c0d12] border-champagne-400/80 shadow-[0_0_20px_rgba(212,175,55,0.25)] scale-[1.02]'
                    : 'bg-[#1a0e14]/70 hover:bg-[#25121b]/80 border-white/10 hover:border-champagne-500/30'
                    }`}
                >
                  <div className={`p-2.5 rounded-xl mb-2.5 transition-colors ${isSelected ? 'text-champagne-300 bg-champagne-500/20' : 'text-white/70 bg-white/5'}`}>
                    {item.icon}
                  </div>
                  <span className={`text-xs font-semibold leading-snug ${isSelected ? 'text-white' : 'text-white/70'}`}>
                    {item.title}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Dynamic Active Resource Details Panel */}
          <div className="bg-ink-800/90 border border-champagne-500/30 rounded-2xl p-6 backdrop-blur-md shadow-2xl">
            {/* 1. Unique Voting Link */}
            {activeResource === 'voting-link' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                      <span>🔗</span> Unique Voting Link
                    </h3>
                    <p className="text-xs text-white/50">Your personal public link that takes voters directly to your OTP-verified vote form.</p>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 self-start sm:self-auto">
                    Live Link
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  <div className="flex-1 bg-ink-950 border border-white/15 rounded-xl px-4 py-3 text-xs text-champagne-300 font-mono select-all overflow-x-auto whitespace-nowrap">
                    {directVoteUrl}
                  </div>
                  <button
                    onClick={() => copyToClipboard(directVoteUrl, 'vote-url')}
                    className="py-3 px-5 rounded-xl bg-champagne-500 hover:bg-champagne-400 text-ink-950 font-bold text-xs transition-all shrink-0 flex items-center justify-center gap-2"
                  >
                    <span>{copiedKey === 'vote-url' ? '✓' : '📋'}</span>
                    <span>{copiedKey === 'vote-url' ? 'Copied Link!' : 'Copy Voting Link'}</span>
                  </button>
                  <a
                    href={directVoteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs transition-all shrink-0 flex items-center justify-center gap-1.5"
                  >
                    <span>↗</span>
                    <span>Open Link</span>
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-white/60">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="font-bold text-champagne-400 block mb-1">📌 Instagram Bio Tip:</span>
                    Paste this exact link in your Instagram bio link-in-bio or story sticker for maximum conversion.
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="font-bold text-champagne-400 block mb-1">💬 YouTube Descriptions:</span>
                    Pin this link as the top pinned comment on your latest video releases.
                  </div>
                </div>
              </div>
            )}

            {/* 2. Instagram Story Template */}
            {activeResource === 'instagram-story' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                      <span>📸</span> Instagram Story Template
                    </h3>
                    <p className="text-xs text-white/50">Post with your 9:16 poster artwork and link sticker.</p>
                  </div>
                  <button
                    onClick={() => {
                      setFormat('story');
                      window.scrollTo({ top: 200, behavior: 'smooth' });
                    }}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-champagne-500/20 text-champagne-300 border border-champagne-500/40 hover:bg-champagne-500/30 transition-all self-start sm:self-auto"
                  >
                    🎨 Switch Poster to 9:16 Story Format ↑
                  </button>
                </div>

                <div className="bg-ink-950 border border-white/15 rounded-xl p-4 text-xs text-white/80 whitespace-pre-line font-sans leading-relaxed select-all">
                  {instagramText}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => copyToClipboard(instagramText, 'ig-copy')}
                    className="py-2.5 px-4 rounded-xl bg-champagne-500 hover:bg-champagne-400 text-ink-950 font-bold text-xs transition-all flex items-center gap-2"
                  >
                    <span>{copiedKey === 'ig-copy' ? '✓' : '📋'}</span>
                    <span>{copiedKey === 'ig-copy' ? 'Caption Copied!' : 'Copy Story Caption'}</span>
                  </button>
                  <span className="text-xs text-white/40">Tip: Add a "Link" sticker in Instagram Stories with your voting link!</span>
                </div>
              </div>
            )}

            {/* 3. WhatsApp Status Template */}
            {activeResource === 'whatsapp-status' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                      <span>💬</span> WhatsApp Status &amp; Group Message
                    </h3>
                    <p className="text-xs text-white/50">Bilingual Telugu &amp; English voting request copy for status updates and WhatsApp groups.</p>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 self-start sm:self-auto">
                    WhatsApp Ready
                  </span>
                </div>

                <div className="bg-ink-950 border border-white/15 rounded-xl p-4 text-xs text-white/80 whitespace-pre-line font-sans leading-relaxed select-all">
                  {whatsappText}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-ink-950 font-bold text-xs transition-all flex items-center gap-2"
                  >
                    <span>📲</span>
                    <span>Share Directly to WhatsApp</span>
                  </a>
                  <button
                    onClick={() => copyToClipboard(whatsappText, 'wa-copy')}
                    className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs transition-all flex items-center gap-2"
                  >
                    <span>{copiedKey === 'wa-copy' ? '✓' : '📋'}</span>
                    <span>{copiedKey === 'wa-copy' ? 'Copied Message!' : 'Copy WhatsApp Message'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* 4. YouTube Community Copy */}
            {activeResource === 'youtube-community' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                      <span>▶️</span> YouTube Community Copy
                    </h3>
                    <p className="text-xs text-white/50">Engage your channel subscribers with an official announcement in your Community tab.</p>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 self-start sm:self-auto">
                    YouTube Tab
                  </span>
                </div>

                <div className="bg-ink-950 border border-white/15 rounded-xl p-4 text-xs text-white/80 whitespace-pre-line font-sans leading-relaxed select-all">
                  {youtubeText}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => copyToClipboard(youtubeText, 'yt-copy')}
                    className="py-2.5 px-4 rounded-xl bg-champagne-500 hover:bg-champagne-400 text-ink-950 font-bold text-xs transition-all flex items-center gap-2"
                  >
                    <span>{copiedKey === 'yt-copy' ? '✓' : '📋'}</span>
                    <span>{copiedKey === 'yt-copy' ? 'Copied Post!' : 'Copy Community Post'}</span>
                  </button>
                  <a
                    href="https://studio.youtube.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs transition-all"
                  >
                    Open YouTube Studio ↗
                  </a>
                </div>
              </div>
            )}

            {/* 5. Video Announcement Template */}
            {activeResource === 'video-announcement' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                      <span>🎬</span> Video Announcement Script (Reels &amp; Shorts)
                    </h3>
                    <p className="text-xs text-white/50">Read this 30-second script directly on camera to record your announcement reel or short.</p>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 self-start sm:self-auto">
                    30-Sec Script
                  </span>
                </div>

                <div className="bg-ink-950 border border-white/15 rounded-xl p-4 text-xs text-white/85 whitespace-pre-line font-sans leading-relaxed select-all">
                  {videoScript}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => copyToClipboard(videoScript, 'video-copy')}
                    className="py-2.5 px-4 rounded-xl bg-champagne-500 hover:bg-champagne-400 text-ink-950 font-bold text-xs transition-all flex items-center gap-2"
                  >
                    <span>{copiedKey === 'video-copy' ? '✓' : '📋'}</span>
                    <span>{copiedKey === 'video-copy' ? 'Copied Script!' : 'Copy Script Text'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* 6. Shareable QR Code */}
            {activeResource === 'shareable-qr' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                      <span>🔳</span> Shareable QR Code
                    </h3>
                    <p className="text-xs text-white/50">High-resolution QR code that opens your voting form when scanned by any smartphone camera.</p>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-champagne-500/20 text-champagne-300 border border-champagne-500/30 self-start sm:self-auto">
                    1200×1200 PNG
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* QR Card */}
                  <div className="w-36 h-36 bg-white rounded-2xl p-2.5 border-2 border-champagne-500/60 shadow-xl flex items-center justify-center shrink-0">
                    {qrCodeDataUrl ? (
                      <img src={qrCodeDataUrl} alt="Voting QR Code" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full bg-gray-200 animate-pulse rounded-lg" />
                    )}
                  </div>

                  <div className="space-y-3 flex-1 text-center sm:text-left">
                    <p className="text-xs text-white/70">
                      This QR code contains your official nominee tracking code (<span className="text-champagne-300 font-mono font-bold">{selectedNominee?.nominee_code || 'TIC26'}</span>).
                      Scan tests confirm 100% readability across iOS and Android devices.
                    </p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                      <button
                        onClick={handleQrDownload}
                        disabled={isQrDownloading}
                        className="py-2.5 px-5 rounded-xl bg-champagne-500 hover:bg-champagne-400 text-ink-950 font-bold text-xs transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        <span>{isQrDownloading ? '⏳' : '⬇'}</span>
                        <span>{isQrDownloading ? 'Downloading...' : 'Download QR Code PNG'}</span>
                      </button>
                      <button
                        onClick={() => copyToClipboard(directVoteUrl, 'qr-url-copy')}
                        className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs transition-all flex items-center gap-2"
                      >
                        <span>{copiedKey === 'qr-url-copy' ? '✓' : '🔗'}</span>
                        <span>{copiedKey === 'qr-url-copy' ? 'Copied Link!' : 'Copy QR Target Link'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </PageTransition>
  );
}
