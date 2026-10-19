import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api, getAssetUrl, clearApiCache } from '../../api';
import {
  buildPoster,
  buildCampaignKitZip,
  POSTER_TEMPLATES,
  POSTER_WIDTH,
  POSTER_HEIGHT,
  STORY_WIDTH,
  STORY_HEIGHT,
  loadImage,
} from '../../lib/posterRenderer';
import { qrUrl, qrDataUrl, downloadQrPng, voteUrl, nomineeUrl } from '../../lib/nomineeCampaign';

export default function PosterTemplatesTab() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [categoryDetails, setCategoryDetails] = useState(null);

  // Template editor state
  const [templateKey, setTemplateKey] = useState('gold_prestige');
  const [themeColor, setThemeColor] = useState('#D4AF37');
  const [badgeText, setBadgeText] = useState('OFFICIAL NOMINEE');
  const [tagline, setTagline] = useState('');
  const [customTags, setCustomTags] = useState('#TeluguIconAwards2026, #TIA2026');
  const [previewFormat, setPreviewFormat] = useState('poster');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Category sponsors state
  const [categorySponsors, setCategorySponsors] = useState([]);
  const [previewFallbackSponsors, setPreviewFallbackSponsors] = useState([]);
  const [allSponsors, setAllSponsors] = useState([]);
  const [selectedSponsorToAdd, setSelectedSponsorToAdd] = useState('');
  const [sponsorRole, setSponsorRole] = useState('Category Partner');
  const [sponsorSortOrder, setSponsorSortOrder] = useState(0);
  const [isAddingSponsor, setIsAddingSponsor] = useState(false);
  const [excludedSponsorIds, setExcludedSponsorIds] = useState(new Set());

  // Poster sponsor inclusion / exclusion actions
  const removeSponsorFromPoster = (sponsorId) => {
    setExcludedSponsorIds((prev) => {
      const next = new Set(prev);
      next.add(sponsorId);
      return next;
    });
    setFeedback({ type: 'success', text: 'Sponsor removed from poster preview.' });
    setTimeout(() => setFeedback(null), 2500);
  };

  const includeSponsorOnPoster = (sponsorId) => {
    setExcludedSponsorIds((prev) => {
      const next = new Set(prev);
      next.delete(sponsorId);
      return next;
    });
    setFeedback({ type: 'success', text: 'Sponsor restored to poster preview.' });
    setTimeout(() => setFeedback(null), 2500);
  };

  // Nominees for selection and preview
  const [allNominees, setAllNominees] = useState([]);
  const [nominees, setNominees] = useState([]);
  const [selectedNomineeId, setSelectedNomineeId] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [isPreviewRendering, setIsPreviewRendering] = useState(false);
  const [isPosterReady, setIsPosterReady] = useState(false);

  const posterCanvasRef = useRef(null);
  const storyCanvasRef = useRef(null);
  const qrImageRef = useRef(null);
  const renderSeqRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load all categories, sponsors, and nominees on mount
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/categories'),
      api.get('/admin/sponsors').catch(() => api.get('/sponsors')),
      api.get('/admin/nominees').catch(() => api.get('/nominees')),
    ])
      .then(([cats, spons, noms]) => {
        if (Array.isArray(cats)) {
          setCategories(cats);
        }
        const sponsorList = Array.isArray(spons) ? spons : (Array.isArray(spons?.data) ? spons.data : []);
        setAllSponsors(sponsorList);
        if (Array.isArray(noms)) {
          setAllNominees(noms);
        }

        const requestedNominee = searchParams.get('nominee');
        if (requestedNominee && Array.isArray(noms)) {
          const matched = noms.find((n) => String(n.id) === requestedNominee || String(n.slug) === requestedNominee);
          if (matched) {
            setSelectedNomineeId(String(matched.id));
            if (matched.category_id) {
              setSelectedCategoryId(String(matched.category_id));
              return;
            }
          }
        }

        const initialCatId = searchParams.get('category') || (cats && cats[0] ? String(cats[0].id) : '');
        setSelectedCategoryId(initialCatId);
      })
      .catch((err) => setFeedback({ type: 'error', text: err.message }))
      .finally(() => setLoading(false));
  }, []);

  // Whenever selected category changes, load its details, sponsors, and nominees
  useEffect(() => {
    if (!selectedCategoryId) return;

    // Keep URL parameter in sync
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('category', selectedCategoryId);
      return next;
    }, { replace: true });

    api.get(`/admin/categories/${selectedCategoryId}/poster-preview`)
      .then((data) => {
        if (data.category) {
          setCategoryDetails(data.category);
          setTemplateKey(data.category.poster_template || 'gold_prestige');
          setThemeColor(data.category.poster_theme_color || '#D4AF37');
          setBadgeText(data.category.poster_badge_text || 'OFFICIAL NOMINEE');
          setTagline(data.category.poster_tagline || '');
        }
        if (Array.isArray(data.category_sponsors)) {
          setCategorySponsors(data.category_sponsors);
        } else if (Array.isArray(data.sponsors)) {
          setCategorySponsors(data.sponsors);
        }
        if (Array.isArray(data.sponsors)) {
          setPreviewFallbackSponsors(data.sponsors);
        }
        if (Array.isArray(data.nominees)) {
          setNominees(data.nominees);
          const requestedNominee = searchParams.get('nominee');
          const matched = requestedNominee
            ? data.nominees.find((n) => String(n.id) === requestedNominee || String(n.slug) === requestedNominee)
            : null;
          setSelectedNomineeId(matched ? String(matched.id) : (data.nominees[0] ? String(data.nominees[0].id) : 'sample'));
        }
      })
      .catch((err) => {
        setFeedback({ type: 'error', text: `Failed to load category data: ${err.message}` });
      });
  }, [selectedCategoryId]);

  // Selected nominee resolution: category nominees -> all nominees -> fallback
  const currentNominee = (() => {
    if (selectedNomineeId && selectedNomineeId !== 'sample') {
      const foundInCat = nominees.find((n) => String(n.id) === String(selectedNomineeId));
      if (foundInCat) return foundInCat;
      const foundInAll = allNominees.find((n) => String(n.id) === String(selectedNomineeId));
      if (foundInAll) return foundInAll;
    }
    if (nominees.length > 0) return nominees[0];
    if (allNominees.length > 0) return allNominees[0];
    return {
      id: 99999,
      full_name: 'Telugu Creator',
      slug: 'telugu-creator',
      nominee_code: 'TIC26',
      photo_url: null,
      social_handle: '@creator',
      category_id: Number(selectedCategoryId) || 1,
      category_name: categoryDetails?.name || 'Creator Award',
    };
  })();

  // Render poster preview canvases whenever template, nominee, or sponsors change
  const renderPreview = useCallback(async () => {
    if (!currentNominee || !categoryDetails) return;
    const seq = ++renderSeqRef.current;
    setIsPreviewRendering(true);
    setIsPosterReady(false);

    try {
      // 1. Prepare QR Code
      const qrValue = qrUrl(currentNominee);
      let qrSource;
      try {
        qrSource = await qrDataUrl(qrValue, 640);
      } catch (_) {
        qrSource = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrValue)}&size=640x640&margin=8&format=png`;
      }
      const qrImg = await loadImage(qrSource);
      if (!isMountedRef.current || seq !== renderSeqRef.current) return;
      qrImageRef.current = qrImg;

      const activeCategory = {
        ...categoryDetails,
        poster_template: templateKey,
        poster_theme_color: themeColor,
        poster_badge_text: badgeText,
        poster_tagline: tagline,
      };

      const parsedTags = customTags.split(',').map((t) => t.trim()).filter(Boolean);

      // Only real database sponsors with logos, no fake reference fallback
      const baseSponsors = categorySponsors.length > 0
        ? categorySponsors
        : (previewFallbackSponsors.length > 0 ? previewFallbackSponsors : allSponsors);

      const activeSponsors = baseSponsors.filter((s) => {
        const sId = s.sponsor_id || s.id;
        const isMasterActive = s.is_active === 1 || s.is_active === true || s.is_active === '1' || s.is_active === undefined;
        const isExcluded = excludedSponsorIds.has(sId) || excludedSponsorIds.has(String(sId)) || excludedSponsorIds.has(s.name);
        const hasValidLogo = Boolean(s.logo_url || s.logo || s.image_id);
        return isMasterActive && !isExcluded && hasValidLogo;
      });

      // 2. Render Official Poster and Story
      const [posterCanvas, storyCanvas] = await Promise.all([
        buildPoster(currentNominee, {
          format: 'poster',
          category: activeCategory,
          sponsors: activeSponsors,
          allSponsors: baseSponsors,
          excludedSponsorIds,
          tags: parsedTags,
          qrImage: qrImg,
        }),
        buildPoster(currentNominee, {
          format: 'story',
          category: activeCategory,
          sponsors: activeSponsors,
          allSponsors: baseSponsors,
          excludedSponsorIds,
          tags: parsedTags,
          qrImage: qrImg,
        }),
      ]);

      if (!isMountedRef.current || seq !== renderSeqRef.current) return;

      // Copy to mounted preview canvases
      const copyTo = (from, to) => {
        if (!to || !from) return;
        to.width = from.width;
        to.height = from.height;
        const ctx = to.getContext('2d');
        ctx.drawImage(from, 0, 0);
      };

      copyTo(posterCanvas, posterCanvasRef.current);
      copyTo(storyCanvas, storyCanvasRef.current);

      setIsPosterReady(true);
      setIsPreviewRendering(false);
    } catch (err) {
      if (!isMountedRef.current || seq !== renderSeqRef.current) return;
      console.error('Preview render failed:', err);
      setIsPreviewRendering(false);
      setIsPosterReady(false);
    }
  }, [currentNominee, categoryDetails, templateKey, themeColor, badgeText, tagline, categorySponsors, previewFallbackSponsors, allSponsors, excludedSponsorIds, customTags]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);


  // Save category poster template settings
  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!selectedCategoryId) return;
    setIsSavingTemplate(true);
    setFeedback(null);

    try {
      const res = await api.put(`/admin/categories/${selectedCategoryId}/poster-template`, {
        poster_template: templateKey,
        poster_theme_color: themeColor,
        poster_badge_text: badgeText,
        poster_tagline: tagline,
      });

      setCategoryDetails((prev) => ({
        ...prev,
        poster_template: templateKey,
        poster_theme_color: themeColor,
        poster_badge_text: badgeText,
        poster_tagline: tagline,
      }));

      clearApiCache();
      setFeedback({ type: 'success', text: res.message || 'Category poster template updated!' });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to save template' });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Add sponsor association to this category
  const handleAddSponsor = async (e) => {
    e.preventDefault();
    if (!selectedCategoryId || !selectedSponsorToAdd) return;
    setIsAddingSponsor(true);
    setFeedback(null);

    try {
      await api.post(`/admin/categories/${selectedCategoryId}/sponsors`, {
        sponsor_id: Number(selectedSponsorToAdd),
        role: sponsorRole,
        sort_order: Number(sponsorSortOrder) || 0,
      });

      // Reload category sponsors
      const updatedSpons = await api.get(`/admin/categories/${selectedCategoryId}/sponsors`);
      setCategorySponsors(updatedSpons);
      setSelectedSponsorToAdd('');
      setSponsorRole('Category Partner');

      clearApiCache();
      setFeedback({ type: 'success', text: 'Sponsor linked to category successfully!' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to link sponsor' });
    } finally {
      setIsAddingSponsor(false);
    }
  };

  // Remove sponsor association from this category
  const handleRemoveSponsor = async (sponsorId, sponsorName) => {
    if (!window.confirm(`Remove "${sponsorName}" from ${categoryDetails?.name || 'this category'}?`)) {
      return;
    }
    try {
      await api.delete(`/admin/categories/${selectedCategoryId}/sponsors/${sponsorId}`);
      setCategorySponsors((prev) => prev.filter((s) => s.sponsor_id !== sponsorId && s.id !== sponsorId));
      clearApiCache();
      setFeedback({ type: 'success', text: 'Sponsor removed from category.' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to remove sponsor' });
    }
  };

  // Regenerate nominee poster
  const handleRegeneratePoster = async () => {
    if (!currentNominee || currentNominee.id === 99999) {
      renderPreview();
      return;
    }
    setIsRegenerating(true);
    try {
      const res = await api.post(`/admin/nominees/${currentNominee.id}/regenerate-poster`);
      clearApiCache();
      await renderPreview();
      setFeedback({ type: 'success', text: res.message || 'Poster regenerated and audit logged!' });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Regeneration failed' });
    } finally {
      setIsRegenerating(false);
    }
  };

  // Download preview poster PNG
  const handleDownloadPreviewPng = (format = 'poster') => {
    if (!isPosterReady || isPreviewRendering) return;
    const canvas = format === 'story' ? storyCanvasRef.current : posterCanvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Telugu-Icon-Awards-${currentNominee.slug || 'nominee'}-${format}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download PNG failed:', err);
      setFeedback({ type: 'error', text: 'Could not export poster image. Please reload and try again.' });
    }
  };

  // Download preview poster JPG
  const handleDownloadPreviewJpg = (format = 'poster') => {
    if (!isPosterReady || isPreviewRendering) return;
    const canvas = format === 'story' ? storyCanvasRef.current : posterCanvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Telugu-Icon-Awards-${currentNominee.slug || 'nominee'}-${format}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download JPG failed:', err);
      setFeedback({ type: 'error', text: 'Could not export poster image. Please reload and try again.' });
    }
  };

  // Copy direct voting link
  const handleCopyVotingLink = () => {
    if (!currentNominee) return;
    const link = voteUrl(currentNominee);
    navigator.clipboard?.writeText(link).catch(() => {});
    setFeedback({ type: 'success', text: `✓ Voting URL copied to clipboard: ${link}` });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Open direct voting page
  const handleOpenVotingPage = () => {
    if (!currentNominee) return;
    const link = voteUrl(currentNominee);
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  // Download sample campaign kit ZIP
  const handleDownloadZip = async () => {
    if (!currentNominee || !posterCanvasRef.current || !storyCanvasRef.current || !isPosterReady || isDownloadingZip) return;
    setIsDownloadingZip(true);
    try {
      const qrValue = qrUrl(currentNominee);
      let qrPngData = null;
      try {
        qrPngData = await qrDataUrl(qrValue, 1200);
      } catch (_) {}

      const { blob, filename } = await buildCampaignKitZip({
        nominee: currentNominee,
        category: categoryDetails,
        sponsors: categorySponsors,
        posterCanvas: posterCanvasRef.current,
        storyCanvas: storyCanvasRef.current,
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

      setFeedback({ type: 'success', text: '✓ Campaign Kit ZIP generated and downloaded!' });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      setFeedback({ type: 'error', text: 'Failed to build ZIP kit: ' + err.message });
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // Validation checks for current preview
  const missingPhoto = !currentNominee.photo_url;
  const missingSponsorLogos = categorySponsors.filter((sp) => !sp.logo_url);
  const isNameLong = (currentNominee.full_name || '').length > 25;
  const isCategoryLong = (categoryDetails?.name || '').length > 32;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
        <div>
          <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <span>🎨 Category Poster Templates &amp; Sponsors</span>
          </h2>
          <p className="text-white/40 text-xs mt-1">
            Configure reusable poster designs by category, attach category-specific sponsors, and preview live nominee posters.
          </p>
        </div>

        {/* Category selector */}
        <div className="flex items-center gap-2">
          <label className="text-white/60 text-xs font-semibold whitespace-nowrap">Category:</label>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="input-field max-w-[280px] text-xs font-semibold !py-2"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon || '🏆'} {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between ${
          feedback.type === 'error'
            ? 'bg-burgundy-900/50 border border-burgundy-500/40 text-rose-200'
            : 'bg-emerald-900/40 border border-emerald-500/40 text-emerald-200'
        }`}>
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="text-white/60 hover:text-white">✕</button>
        </div>
      )}

      {/* Main split grid: Controls on left, Live Canvas Preview on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Template Config & Sponsors Management (7 cols) */}
        <div className="lg:col-span-7 space-y-6">

          {/* 1. Category Template Configuration Card */}
          <div className="glass-card p-6 border border-champagne-500/20 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <h3 className="text-sm font-bold text-champagne-300 uppercase tracking-wider">
                  1. Poster Design Template
                </h3>
                <p className="text-white/40 text-xs mt-0.5">
                  Applied to all nominees in: <strong className="text-white">{categoryDetails?.name || 'Loading...'}</strong>
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-champagne-500/15 text-champagne-400 border border-champagne-500/30 font-mono">
                ID #{selectedCategoryId}
              </span>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              {/* Theme Template Radio Cards */}
              <div>
                <label className="block text-white/70 text-xs font-semibold mb-2">Select Visual Theme</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.values(POSTER_TEMPLATES).map((tmpl) => {
                    const isSelected = templateKey === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => {
                          setTemplateKey(tmpl.id);
                          setThemeColor(tmpl.primaryColor);
                        }}
                        className={`p-3 rounded-xl text-left border transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'bg-champagne-500/15 border-champagne-500 shadow-gold'
                            : 'bg-ink-800/80 border-white/8 hover:border-white/20'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full mt-0.5 shrink-0 border border-white/30 ${
                            tmpl.id === 'gold_prestige'
                              ? 'bg-[#D4AF37]'
                              : tmpl.id === 'royal_amethyst'
                              ? 'bg-[#C084FC]'
                              : tmpl.id === 'emerald_grandeur'
                              ? 'bg-[#10B981]'
                              : tmpl.id === 'crimson_star'
                              ? 'bg-[#F43F5E]'
                              : tmpl.id === 'cyber_bronze'
                              ? 'bg-[#38BDF8]'
                              : tmpl.id === 'midnight_sapphire'
                              ? 'bg-[#60A5FA]'
                              : 'bg-champagne-400'
                          }`}
                        />
                        <div className="min-w-0">
                          <p className={`text-xs font-bold ${isSelected ? 'text-champagne-300' : 'text-white'}`}>
                            {tmpl.name}
                          </p>
                          <p className="text-white/40 text-[10px] line-clamp-1 mt-0.5">
                            {tmpl.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Theme Color & Presets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/70 text-xs font-semibold mb-1">
                    Primary Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="w-10 h-9 rounded-lg bg-transparent cursor-pointer border border-white/20"
                    />
                    <input
                      type="text"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="input-field font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/70 text-xs font-semibold mb-1">
                    Badge Text
                  </label>
                  <input
                    type="text"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    placeholder="e.g. OFFICIAL NOMINEE"
                    className="input-field text-xs uppercase tracking-wider"
                  />
                </div>
              </div>

              {/* Category Tagline */}
              <div>
                <label className="block text-white/70 text-xs font-semibold mb-1">
                  Custom Category Tagline (Optional)
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Celebrating Telugu Digital Excellence"
                  className="input-field text-xs"
                />
              </div>

              {/* Campaign Tags & Hashtags */}
              <div>
                <label className="block text-white/70 text-xs font-semibold mb-1">
                  Campaign Tags &amp; Hashtags (Comma-separated)
                </label>
                <input
                  type="text"
                  value={customTags}
                  onChange={(e) => setCustomTags(e.target.value)}
                  placeholder="e.g. #TeluguIconAwards2026, #TIA2026, Creator"
                  className="input-field text-xs"
                />
                <p className="text-white/40 text-[10px] mt-1">
                  Automatically arranged in neat, non-overlapping pill chips on the poster.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingTemplate}
                  className="btn-gold !py-2 !px-4 text-xs font-bold disabled:opacity-50 flex items-center gap-2"
                >
                  <span>{isSavingTemplate ? '⏳' : '💾'}</span>
                  <span>{isSavingTemplate ? 'Saving Changes...' : 'Save Template Settings'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* 2. Category-Wise Sponsor Association Card */}
          <div className="glass-card p-6 border border-champagne-500/20 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <h3 className="text-sm font-bold text-champagne-300 uppercase tracking-wider">
                  2. Category Sponsors ({categorySponsors.length})
                </h3>
                <p className="text-white/40 text-xs mt-0.5">
                  Only these sponsors will appear on posters generated for nominees in this category.
                </p>
              </div>
              <Link to="/admin/sponsors" className="text-champagne-400 text-xs hover:underline">
                Manage Global Sponsors ↗
              </Link>
            </div>

            {/* List of currently associated sponsors */}
            {categorySponsors.length === 0 ? (
              <div className="p-4 rounded-xl bg-ink-900/60 border border-white/5 text-center">
                <p className="text-white/50 text-xs">
                  No sponsors linked to this category yet.
                </p>
                <p className="text-white/30 text-[11px] mt-1">
                  Posters for this category will display the default event presenter branding.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {categorySponsors.map((sp) => {
                  const sponsorId = sp.sponsor_id || sp.id;
                  const isMasterActive = Number(sp.is_active) === 1 || sp.is_active === true;
                  const isExcludedFromPoster = excludedSponsorIds.has(sponsorId);

                  return (
                    <div
                      key={sp.id || sp.association_id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        !isMasterActive
                          ? 'bg-ink-950/80 border-rose-900/30 opacity-70'
                          : isExcludedFromPoster
                          ? 'bg-ink-900/50 border-amber-500/20 opacity-80'
                          : 'bg-ink-900/70 border-white/8'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {sp.logo_url ? (
                          <img
                            src={getAssetUrl(sp.logo_url)}
                            alt={sp.name}
                            className="w-11 h-11 object-contain rounded-lg bg-black/40 p-1 border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-lg bg-champagne-500/10 border border-champagne-500/20 flex items-center justify-center text-sm font-bold text-champagne-400 shrink-0">
                            {sp.name ? sp.name[0] : 'S'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-white text-xs font-bold truncate">{sp.name}</p>
                            {/* Master Switch Status Badge */}
                            {!isMasterActive ? (
                              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-rose-900/60 text-rose-300 border border-rose-500/40">
                                🔴 Master Switch OFF
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-900/40 text-emerald-300 border border-emerald-500/30">
                                🟢 Master Active
                              </span>
                            )}

                            {/* Poster Visibility Status Badge */}
                            {isMasterActive && isExcludedFromPoster && (
                              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-900/50 text-amber-300 border border-amber-500/30">
                                ✕ Excluded from Poster
                              </span>
                            )}
                          </div>

                          <p className="text-champagne-400 text-[11px] font-semibold mt-0.5">
                            {sp.role || 'Category Partner'} {sp.tier && `• ${sp.tier.replace(/_/g, ' ')}`}
                          </p>

                          {!isMasterActive && (
                            <p className="text-rose-400 text-[10px] mt-0.5">
                              ⚠️ This sponsor's global switch is OFF in Sponsors list. It will not appear on any poster.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Poster Control Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {isMasterActive && (
                          isExcludedFromPoster ? (
                            <button
                              type="button"
                              onClick={() => includeSponsorOnPoster(sponsorId)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-900/40 text-emerald-200 hover:bg-emerald-900/70 border border-emerald-500/40 text-xs font-semibold transition-all flex items-center gap-1"
                              title="Include this sponsor in the poster preview and exports"
                            >
                              <span>➕</span>
                              <span>Include on Poster</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => removeSponsorFromPoster(sponsorId)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-900/40 text-amber-200 hover:bg-amber-900/70 border border-amber-500/40 text-xs font-semibold transition-all flex items-center gap-1"
                              title="Hide this sponsor from this poster without deleting the link"
                            >
                              <span>🚫</span>
                              <span>Remove from Poster</span>
                            </button>
                          )
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveSponsor(sponsorId, sp.name)}
                          className="px-2.5 py-1.5 rounded-lg bg-burgundy-900/30 text-rose-300 hover:bg-burgundy-900/60 border border-burgundy-500/30 text-xs font-semibold transition-all"
                          title="Permanently remove association from this category"
                        >
                          Unlink ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Form to link a new sponsor to this category */}
            <form onSubmit={handleAddSponsor} className="pt-3 border-t border-white/5 space-y-3">
              <h4 className="text-white/80 text-xs font-bold uppercase tracking-wider">
                + Link Sponsor to this Category
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-white/50 text-[11px] mb-1">Select Sponsor *</label>
                  <select
                    value={selectedSponsorToAdd}
                    onChange={(e) => setSelectedSponsorToAdd(e.target.value)}
                    required
                    className="input-field text-xs !py-2"
                  >
                    <option value="">-- Choose Sponsor --</option>
                    {allSponsors
                      .filter((s) => !categorySponsors.some((cs) => cs.sponsor_id === s.id || cs.id === s.id))
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.tier || 'partner'})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-white/50 text-[11px] mb-1">Role / Sponsorship Tag</label>
                  <input
                    type="text"
                    value={sponsorRole}
                    onChange={(e) => setSponsorRole(e.target.value)}
                    placeholder="e.g. Powered By"
                    className="input-field text-xs !py-2"
                  />
                </div>

                <div className="sm:col-span-1 flex items-end">
                  <button
                    type="submit"
                    disabled={isAddingSponsor || !selectedSponsorToAdd}
                    className="btn-gold !py-2 w-full text-xs font-bold disabled:opacity-40"
                  >
                    {isAddingSponsor ? 'Linking...' : 'Link to Category'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Live Poster Preview & Validation (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="glass-card p-6 border border-champagne-500/30 sticky top-20">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-sm font-bold text-champagne-300 uppercase tracking-wider">
                Live Poster Preview
              </h3>
              <div className="flex items-center gap-1 bg-ink-900/90 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setPreviewFormat('poster')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    previewFormat === 'poster'
                      ? 'bg-champagne-500 text-ink-900 shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  🖼️ 4:5 Poster
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFormat('story')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    previewFormat === 'story'
                      ? 'bg-champagne-500 text-ink-900 shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  📱 9:16 Story
                </button>
              </div>
            </div>

            {/* Select Nominee for Preview */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-white/70 text-xs font-semibold">
                  Selected Nominee for Poster &amp; QR:
                </label>
                <span className="text-[10px] text-champagne-400 font-mono">
                  ID: #{currentNominee?.id} · Code: {currentNominee?.nominee_code || 'TIC26'}
                </span>
              </div>
              <select
                value={selectedNomineeId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedNomineeId(val);
                  const matched = allNominees.find((n) => String(n.id) === String(val));
                  if (matched && matched.category_id && String(matched.category_id) !== String(selectedCategoryId)) {
                    setSelectedCategoryId(String(matched.category_id));
                  }
                }}
                className="input-field text-xs font-medium !py-2"
              >
                {allNominees.length > 0 ? (
                  <>
                    <optgroup label={`Current Category (${categoryDetails?.name || 'Category'})`}>
                      {nominees.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.full_name} ({n.nominee_code || 'TIC26'}) {n.photo_url ? '📷' : '⚠️ No Photo'}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="All Other Nominees in Database">
                      {allNominees
                        .filter((n) => !nominees.some((cn) => cn.id === n.id))
                        .map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.full_name} — {n.category_name || 'Category'} ({n.nominee_code || 'TIC26'}) {n.photo_url ? '📷' : '⚠️ No Photo'}
                          </option>
                        ))}
                    </optgroup>
                  </>
                ) : nominees.length > 0 ? (
                  nominees.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.full_name} ({n.nominee_code || 'TIC26'}) {n.photo_url ? '📷' : '⚠️ No Photo'}
                    </option>
                  ))
                ) : (
                  <option value="sample">Sample Telugu Creator (Demo Profile)</option>
                )}
              </select>
            </div>

            {/* Real-time Validation Badges */}
            <div className="space-y-1.5 my-3.5">
              {missingPhoto ? (
                <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                  <span>⚠️</span>
                  <span><strong>Nominee photo missing:</strong> Elegant crest &amp; monogram avatar will be rendered.</span>
                </div>
              ) : (
                <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-2">
                  <span>✓</span>
                  <span>Nominee photo verified &amp; framed with gold ring.</span>
                </div>
              )}

              {categorySponsors.length > 0 ? (
                missingSponsorLogos.length > 0 ? (
                  <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                    <span>⚠️</span>
                    <span>
                      {missingSponsorLogos.length} sponsor(s) have no logo: Omitted from poster.
                    </span>
                  </div>
                ) : (
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-2">
                    <span>✓</span>
                    <span>All {categorySponsors.length} category sponsor logos integrated.</span>
                  </div>
                )
              ) : (
                <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-[11px] flex items-center gap-2">
                  <span>ℹ️</span>
                  <span>Zero active sponsors: Sponsor section is completely hidden with no blank gaps.</span>
                </div>
              )}

              {isNameLong && (
                <div className="px-3 py-1 text-[10px] text-white/40">
                  ℹ️ Name length is {currentNominee.full_name.length} chars. Auto-scaled font &amp; 2-line wrap active.
                </div>
              )}
            </div>

            {/* Quick Sponsor Controls for this Poster */}
            <div className="p-3.5 rounded-xl bg-ink-900/80 border border-champagne-500/20 space-y-2.5 my-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-champagne-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🤝</span> Sponsors in this Poster
                </span>
                <span className="text-[11px] font-semibold text-white/60">
                  {(() => {
                    const base = categorySponsors.length > 0
                      ? categorySponsors
                      : (previewFallbackSponsors.length > 0 ? previewFallbackSponsors : []);
                    const visibleCount = base.filter((s) => {
                      const isMasterActive = Number(s.is_active) === 1 || s.is_active === true || s.is_active === undefined;
                      const hasLogo = Boolean(s.logo_url || s.logo || s.image_id);
                      return isMasterActive && hasLogo && !excludedSponsorIds.has(s.sponsor_id || s.id);
                    }).length;
                    return `${visibleCount} active on poster`;
                  })()}
                </span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {(() => {
                  const base = categorySponsors.length > 0
                    ? categorySponsors
                    : (previewFallbackSponsors.length > 0 ? previewFallbackSponsors : []);
                  const activeList = base.filter((s) => {
                    const isMasterActive = Number(s.is_active) === 1 || s.is_active === true || s.is_active === undefined;
                    const hasLogo = Boolean(s.logo_url || s.logo || s.image_id);
                    return isMasterActive && hasLogo && !excludedSponsorIds.has(s.sponsor_id || s.id);
                  });
                  const excludedList = base.filter((s) => {
                    const isMasterActive = Number(s.is_active) === 1 || s.is_active === true || s.is_active === undefined;
                    return isMasterActive && excludedSponsorIds.has(s.sponsor_id || s.id);
                  });

                  if (activeList.length === 0 && excludedList.length === 0) {
                    return (
                      <p className="text-white/40 text-[11px] italic text-center py-2">
                        Zero active sponsors. The sponsor section will be completely hidden from the poster.
                      </p>
                    );
                  }

                  return (
                    <>
                      {activeList.map((sp) => {
                        const sId = sp.sponsor_id || sp.id;
                        return (
                          <div
                            key={sId}
                            className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5 text-xs gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                              <span className="text-white font-semibold truncate">{sp.name}</span>
                              <span className="text-white/40 text-[10px]">({sp.role || 'Partner'})</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSponsorFromPoster(sId)}
                              className="px-2 py-0.5 rounded bg-amber-900/40 text-amber-200 hover:bg-amber-900/70 border border-amber-500/40 text-[10px] font-bold shrink-0 transition-all"
                              title="Remove from this poster preview"
                            >
                              Remove ✕
                            </button>
                          </div>
                        );
                      })}

                      {excludedList.length > 0 && (
                        <div className="pt-2 border-t border-white/5 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-amber-400/80">
                            Excluded from this Poster ({excludedList.length}):
                          </span>
                          {excludedList.map((sp) => {
                            const sId = sp.sponsor_id || sp.id;
                            return (
                              <div
                                key={sId}
                                className="flex items-center justify-between p-1.5 rounded-lg bg-black/20 border border-amber-500/20 text-xs opacity-75 gap-2"
                              >
                                <span className="text-white/60 line-through text-[11px] truncate">{sp.name}</span>
                                <button
                                  type="button"
                                  onClick={() => includeSponsorOnPoster(sId)}
                                  className="px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/70 border border-emerald-500/40 text-[10px] font-bold shrink-0 transition-all"
                                >
                                  + Include
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Poster Canvas Preview */}
            <div className="flex justify-center items-center py-2">
              <div
                className={`relative w-full rounded-2xl overflow-hidden shadow-2xl border border-champagne-500/40 bg-black/40 transition-all ${
                  previewFormat === 'story' ? 'max-w-[240px]' : 'max-w-[340px]'
                }`}
              >
                {isPreviewRendering && (
                  <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-[1px] flex items-center justify-center z-10 p-2 text-center">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-ink-900/90 border border-champagne-500/40 text-champagne-300 text-xs shadow-lg">
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-champagne-400 border-t-transparent animate-spin inline-block" />
                      <span>Updating Preview...</span>
                    </div>
                  </div>
                )}
                <canvas
                  ref={posterCanvasRef}
                  className={`w-full h-auto block ${previewFormat === 'poster' ? '' : 'hidden'}`}
                />
                <canvas
                  ref={storyCanvasRef}
                  className={`w-full h-auto block ${previewFormat === 'story' ? '' : 'hidden'}`}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-3 border-t border-white/5 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={renderPreview}
                  disabled={isPreviewRendering}
                  className="py-2.5 px-3 rounded-xl bg-white/5 text-white/90 hover:bg-white/10 border border-white/10 text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>👁️</span>
                  <span>{isPreviewRendering ? 'Rendering...' : 'Preview Poster'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={isSavingTemplate}
                  className="py-2.5 px-3 rounded-xl bg-champagne-500/20 text-champagne-300 hover:bg-champagne-500/30 border border-champagne-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>💾</span>
                  <span>{isSavingTemplate ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleRegeneratePoster}
                  disabled={isRegenerating || isPreviewRendering}
                  className="py-2.5 px-3 rounded-xl bg-ink-800 text-champagne-300 hover:bg-ink-700 border border-champagne-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>{isRegenerating ? '⏳' : '⚡'}</span>
                  <span>{isRegenerating ? 'Generating...' : 'Generate Poster'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadPreviewPng(previewFormat)}
                  disabled={!isPosterReady || isPreviewRendering || isRegenerating || isDownloadingZip}
                  className="btn-gold !py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>⬇</span>
                  <span>Download PNG</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPreviewJpg(previewFormat)}
                  disabled={!isPosterReady || isPreviewRendering || isRegenerating || isDownloadingZip}
                  className="py-2 px-3 rounded-xl bg-white/5 text-white/80 hover:bg-white/10 border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>🖼️</span>
                  <span>Download JPG</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyVotingLink}
                  className="py-2 px-3 rounded-xl bg-emerald-950/40 text-emerald-300 hover:bg-emerald-950/70 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <span>🔗</span>
                  <span>Copy Voting Link</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleOpenVotingPage}
                  className="py-2 px-3 rounded-xl bg-blue-950/40 text-blue-300 hover:bg-blue-950/70 border border-blue-500/30 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <span>🌐</span>
                  <span>Open Voting Page ↗</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadZip}
                  disabled={!isPosterReady || isPreviewRendering || isDownloadingZip}
                  className="py-2 px-3 rounded-xl bg-ink-900 text-champagne-400 hover:bg-ink-800 border border-champagne-500/40 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>📦</span>
                  <span>{isDownloadingZip ? 'Packaging...' : 'Sample Kit (ZIP)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
