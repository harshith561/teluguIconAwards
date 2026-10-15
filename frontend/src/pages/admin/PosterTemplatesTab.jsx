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
import { qrUrl, qrDataUrl, downloadQrPng } from '../../lib/nomineeCampaign';

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
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Category sponsors state
  const [categorySponsors, setCategorySponsors] = useState([]);
  const [allSponsors, setAllSponsors] = useState([]);
  const [selectedSponsorToAdd, setSelectedSponsorToAdd] = useState('');
  const [sponsorRole, setSponsorRole] = useState('Category Partner');
  const [sponsorSortOrder, setSponsorSortOrder] = useState(0);
  const [isAddingSponsor, setIsAddingSponsor] = useState(false);

  // Category nominees for preview
  const [nominees, setNominees] = useState([]);
  const [selectedNomineeId, setSelectedNomineeId] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  const posterCanvasRef = useRef(null);
  const storyCanvasRef = useRef(null);
  const qrImageRef = useRef(null);

  // Load all categories and sponsors on mount
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/categories'),
      api.get('/admin/sponsors').catch(() => api.get('/sponsors')),
    ])
      .then(([cats, spons]) => {
        if (Array.isArray(cats)) {
          setCategories(cats);
          const initialCatId = searchParams.get('category') || (cats[0] ? String(cats[0].id) : '');
          setSelectedCategoryId(initialCatId);
        }
        if (Array.isArray(spons)) {
          setAllSponsors(spons);
        }
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
        if (Array.isArray(data.sponsors)) {
          setCategorySponsors(data.sponsors);
        }
        if (Array.isArray(data.nominees)) {
          setNominees(data.nominees);
          const requestedNominee = searchParams.get('nominee');
          const matched = requestedNominee
            ? data.nominees.find((n) => String(n.id) === requestedNominee)
            : null;
          setSelectedNomineeId(matched ? String(matched.id) : (data.nominees[0] ? String(data.nominees[0].id) : 'sample'));
        }
      })
      .catch((err) => {
        setFeedback({ type: 'error', text: `Failed to load category data: ${err.message}` });
      });
  }, [selectedCategoryId]);

  // Selected nominee or sample fallback for live preview
  const currentNominee = selectedNomineeId === 'sample' || !nominees.length
    ? {
      id: 99999,
      full_name: 'Sample Telugu Creator',
      slug: 'sample-creator',
      nominee_code: 'TIC26-DEMO',
      photo_url: null,
      social_handle: '@samplecreator',
      category_id: Number(selectedCategoryId),
      category_name: categoryDetails?.name || 'Creator Award',
    }
    : (nominees.find((n) => String(n.id) === String(selectedNomineeId)) || nominees[0]);

  // Render poster preview canvases whenever template, nominee, or sponsors change
  const renderPreview = useCallback(async () => {
    if (!currentNominee || !categoryDetails) return;

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
      qrImageRef.current = qrImg;

      const activeCategory = {
        ...categoryDetails,
        poster_template: templateKey,
        poster_theme_color: themeColor,
        poster_badge_text: badgeText,
        poster_tagline: tagline,
      };

      // 2. Render 4:5 Poster
      const posterCanvas = await buildPoster(currentNominee, {
        format: 'poster',
        category: activeCategory,
        sponsors: categorySponsors,
        qrImage: qrImg,
      });

      // 3. Render 9:16 Story
      const storyCanvas = await buildPoster(currentNominee, {
        format: 'story',
        category: activeCategory,
        sponsors: categorySponsors,
        qrImage: qrImg,
      });

      // Copy to mounted preview canvases
      const copyTo = (from, to) => {
        if (!to) return;
        to.width = from.width;
        to.height = from.height;
        const ctx = to.getContext('2d');
        ctx.drawImage(from, 0, 0);
      };

      copyTo(posterCanvas, posterCanvasRef.current);
      copyTo(storyCanvas, storyCanvasRef.current);
    } catch (err) {
      console.error('Preview render failed:', err);
    }
  }, [currentNominee, categoryDetails, templateKey, themeColor, badgeText, tagline, categorySponsors]);

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
    const canvas = format === 'story' ? storyCanvasRef.current : posterCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `Preview-${currentNominee.slug || 'creator'}-${format}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Download sample campaign kit ZIP
  const handleDownloadZip = async () => {
    if (!currentNominee || !posterCanvasRef.current) return;
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
                          className="w-5 h-5 rounded-full mt-0.5 shrink-0 border border-white/30"
                          style={{ backgroundColor: tmpl.primaryColor }}
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
              <div className="space-y-2.5">
                {categorySponsors.map((sp) => (
                  <div
                    key={sp.id || sp.association_id}
                    className="p-3 rounded-xl bg-ink-900/70 border border-white/8 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {sp.logo_url ? (
                        <img
                          src={getAssetUrl(sp.logo_url)}
                          alt={sp.name}
                          className="w-12 h-12 object-contain rounded-lg bg-black/40 p-1 border border-white/10"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-champagne-500/10 border border-champagne-500/20 flex items-center justify-center text-sm font-bold text-champagne-400">
                          {sp.name[0]}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white text-xs font-bold truncate">{sp.name}</p>
                          {!sp.logo_url && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              No Logo
                            </span>
                          )}
                        </div>
                        <p className="text-champagne-400 text-[11px] font-semibold">{sp.role || 'Category Partner'}</p>
                        {sp.tier && <p className="text-white/30 text-[10px] uppercase">{sp.tier.replace(/_/g, ' ')}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRemoveSponsor(sp.sponsor_id || sp.id, sp.name)}
                        className="px-2.5 py-1.5 rounded-lg bg-burgundy-900/30 text-rose-300 hover:bg-burgundy-900/60 border border-burgundy-500/30 text-[11px] font-semibold transition-all"
                      >
                        Remove ✕
                      </button>
                    </div>
                  </div>
                ))}
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
              <span className="text-white/40 text-[11px]">4:5 &amp; 9:16 Canvas</span>
            </div>

            {/* Select Nominee for Preview */}
            <div className="mt-4">
              <label className="block text-white/70 text-xs font-semibold mb-1">
                Preview with Nominee in Category:
              </label>
              <select
                value={selectedNomineeId}
                onChange={(e) => setSelectedNomineeId(e.target.value)}
                className="input-field text-xs font-medium !py-2"
              >
                {nominees.length > 0 ? (
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
                      {missingSponsorLogos.length} sponsor(s) have no logo: Typographic cards will be rendered.
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
                  <span>No sponsors: Standard Telugu Icon presenter branding will be displayed.</span>
                </div>
              )}

              {isNameLong && (
                <div className="px-3 py-1 text-[10px] text-white/40">
                  ℹ️ Name length is {currentNominee.full_name.length} chars. Auto-scaled font &amp; 2-line wrap active.
                </div>
              )}
            </div>

            {/* Poster Canvas Preview */}
            <div className="flex justify-center items-center py-2">
              <div className="relative max-w-[280px] w-full rounded-2xl overflow-hidden shadow-2xl border border-champagne-500/40">
                <canvas ref={posterCanvasRef} className="w-full h-auto block" />
              </div>
            </div>

            {/* Hidden canvas for 9:16 story rendering */}
            <canvas ref={storyCanvasRef} className="hidden" />

            {/* Action buttons */}
            <div className="pt-3 border-t border-white/5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleRegeneratePoster}
                disabled={isRegenerating}
                className="py-2.5 px-3 rounded-xl bg-champagne-500/20 text-champagne-300 hover:bg-champagne-500/30 border border-champagne-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <span>{isRegenerating ? '⏳' : '🔄'}</span>
                <span>{isRegenerating ? 'Regenerating...' : 'Regenerate Poster'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadPreviewPng('poster')}
                className="btn-gold !py-2.5 text-xs font-bold"
              >
                ⬇ Download (PNG)
              </button>

              <button
                type="button"
                onClick={() => handleDownloadPreviewPng('story')}
                className="py-2 px-3 rounded-xl bg-white/5 text-white/80 hover:bg-white/10 border border-white/10 text-xs font-semibold col-span-1"
              >
                📱 Download Story (9:16)
              </button>

              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={isDownloadingZip}
                className="py-2 px-3 rounded-xl bg-ink-800 text-champagne-400 hover:bg-ink-700 border border-champagne-500/40 text-xs font-bold col-span-1 disabled:opacity-40"
              >
                {isDownloadingZip ? 'Packaging...' : '📦 Sample Kit (ZIP)'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
