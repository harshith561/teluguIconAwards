import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import { api } from '../api';

const STEPS = ['Categories (Up to 3)', 'Creator Details', 'Digital Presence', 'Your Story', 'Review & Submit'];

const BASE_FORM = {
  full_name: '',
  creator_name: '',
  email: '',
  phone: '',
  city: '',
  state: '',
  primary_platform: 'YouTube',
  youtube_url: '',
  instagram_url: '',
  facebook_url: '',
  other_profile_url: '',
  website_url: '',
  journey: '',
  achievements: '',
  support_links: '',
  agree: false,
};

export default function NominatePage() {
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [catSearch, setCatSearch] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(BASE_FORM);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [nominationId, setNominationId] = useState(null);
  const [nominationCodes, setNominationCodes] = useState([]);

  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  useEffect(() => {
    api.get('/categories').then((data) => {
      if (Array.isArray(data)) {
        setCategories(data.filter((c) => c.type === 'self_nomination'));
      }
    }).catch(() => {});
  }, []);

  const handlePhotoChange = (e) => {
    setError(null);
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      setError(`Profile photograph must be less than 1 MB (selected file is ${(file.size / (1024 * 1024)).toFixed(2)} MB). Please select a compressed image.`);
      return;
    }

    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhoto(null);
    setPhotoPreview(null);
  };

  const update = (e) => {
    const target = e.target;
    setForm({ ...form, [target.name]: target.type === 'checkbox' ? target.checked : target.value });
  };

  const toggleCategory = (catId) => {
    setError(null);
    if (selectedCategories.includes(catId)) {
      setSelectedCategories(selectedCategories.filter((id) => id !== catId));
    } else {
      if (selectedCategories.length >= 3) {
        setError('Each creator/influencer may self-nominate in a maximum of 3 categories only.');
        return;
      }
      setSelectedCategories([...selectedCategories, catId]);
    }
  };

  const next = () => {
    setError(null);
    setMessage(null);
    if (step === 0) {
      if (selectedCategories.length === 0) {
        setError('Please select at least 1 category (maximum 3 categories).');
        return;
      }
      if (selectedCategories.length > 3) {
        setError('Maximum 3 categories allowed.');
        return;
      }
    }
    if (step === 1) {
      if (!form.full_name.trim()) { setError('Full legal name is required.'); return; }
      if (!form.creator_name.trim()) { setError('Creator / handle name is required.'); return; }
      if (!/^[6-9]\d{9}$/.test(form.phone.replace(/[^\d]/g, ''))) { setError('Enter a valid 10-digit Indian mobile number.'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setError('Enter a valid email address.'); return; }
      if (!form.city.trim()) { setError('City is required.'); return; }
      if (!form.state.trim()) { setError('State is required.'); return; }
      if (!photo) { setError('Profile photograph is mandatory. Please upload your photo to continue.'); return; }
    }
    setStep(Math.min(step + 1, STEPS.length - 1));
  };

  const prev = () => setStep(Math.max(step - 1, 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Guard against multiple rapid clicks
    setError(null);
    setMessage(null);

    if (!photo) {
      setError('Profile photograph is mandatory. Please go back to Creator Details and upload your photo.');
      return;
    }
    if (!form.agree) {
      setError('Please accept the Terms & Conditions to continue.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      selectedCategories.forEach((id) => fd.append('category_ids[]', id));
      fd.append('category_ids', JSON.stringify(selectedCategories));
      fd.append('category_id', selectedCategories[0]); // fallback

      ['full_name', 'creator_name', 'email', 'phone', 'city', 'state',
        'primary_platform', 'youtube_url', 'instagram_url', 'facebook_url',
        'other_profile_url', 'website_url', 'journey', 'achievements', 'support_links']
        .forEach((k) => {
          if (String(form[k] || '').trim() !== '') fd.append(k, form[k]);
        });
      if (photo) fd.append('photo', photo);

      const res = await api.postMultipart('/nominations', fd);
      if (res && (res.nomination_code || res.id)) {
        setNominationId(res.nomination_code || res.id);
        setNominationCodes(res.nomination_codes || [res.nomination_code || res.id]);
        setSubmitted(true);
      } else {
        setError(res?.message || 'Failed to submit. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(catSearch.toLowerCase())
  );

  const selectedCategoryNames = categories
    .filter((c) => selectedCategories.includes(c.id))
    .map((c) => c.name);

  if (submitted) {
    return (
      <PageTransition>
        <div className="min-h-[75vh] flex items-center justify-center bg-gradient-to-b from-[#160505] to-[#250909] py-16 px-4">
          <div className="relative max-w-lg mx-auto text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h1 className="font-serif-luxury text-3xl sm:text-4xl font-bold text-[#f1d99a] mb-3">
              Nomination Submitted!
            </h1>
            <p className="text-[#f6e9d5] text-sm mb-2">Thank you for submitting your self-nomination.</p>
            <p className="text-[#a99888] text-xs mb-6">
              Your self-nomination for the Telugu Icon Digital &amp; Influencer Awards 2026 has been successfully received and logged for verification.
            </p>
            <div className="card-preview p-6 mb-8 text-center">
              {photoPreview && (
                <div className="mb-4 flex justify-center">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[#d8b56b] shadow-lg shadow-black/60">
                    <img src={photoPreview} alt={form.creator_name || form.full_name} className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
              <p className="text-[#a99888] text-xs uppercase tracking-widest mb-1">YOUR OFFICIAL NOMINATION ID</p>
              <p className="font-serif-luxury text-2xl sm:text-3xl font-black text-[#f1d99a]">{nominationId}</p>
              {nominationCodes.length > 1 && (
                <div className="mt-3 pt-3 border-t border-[rgba(216,181,107,0.2)] text-xs text-[#d7c8b8]">
                  <span>All Registered IDs: </span>
                  <strong className="text-[#f1d99a]">{nominationCodes.join(', ')}</strong>
                </div>
              )}
              <p className="text-[#d7c8b8] text-xs mt-3">
                Selected Categories: <strong className="text-white">{selectedCategoryNames.join(', ')}</strong>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3.5 justify-center">
              <Link to="/nominee-status" className="btn-gold">
                Track My Nomination &amp; Get My Kit
              </Link>
              <Link to="/nominee-kit" className="btn-outline">
                Open Campaign Kit
              </Link>
              <Link to="/" className="btn-outline">
                Back to Home
              </Link>
            </div>
            <p className="text-[#a99888] text-[11px] mt-4 max-w-sm mx-auto leading-relaxed">
              Check back any time with your mobile number — the moment your nomination is approved,
              your official page, QR code and campaign kit unlock automatically.
            </p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      {/* Hero */}
      <section className="relative py-12 sm:py-20 bg-gradient-to-br from-[#330000] via-[#820000] to-[#3d0000] text-center overflow-hidden px-3 sm:px-4">
        <div className="relative max-w-3xl mx-auto">
          <div className="text-[10px] tracking-[3px] sm:tracking-[4px] text-[#f1d99a] font-black uppercase mb-2">
            01 OCTOBER 2026 – 05 NOVEMBER 2026
          </div>
          <h1 className="font-serif-luxury text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-[#fff7e8] mb-3 sm:mb-4">
            Own Your Story. <span className="text-[#f1d99a]">Self-Nominate.</span>
          </h1>
          <p className="text-[#f6e9d5] text-xs sm:text-base max-w-xl mx-auto leading-relaxed">
            The Telugu Icon Digital &amp; Influencer Awards 2026 accepts <strong className="text-[#f1d99a]">self-nominations only</strong>.
            Put your own digital journey forward for recognition.
          </p>
        </div>
      </section>

      {/* Main Form */}
      <section className="py-10 sm:py-16 bg-[#160505]">
        <div className="max-w-3xl mx-auto px-4">
          {/* Rule banner */}
          <div className="rounded border border-[rgba(216,181,107,0.4)] bg-[#250909] px-4 py-3.5 sm:px-5 sm:py-4 text-xs text-[#f1d99a] mb-6 sm:mb-8 leading-relaxed">
            <strong className="block text-xs sm:text-sm mb-1 uppercase tracking-wider text-white">Rule for Self-Nomination:</strong>
            Each creator/influencer may self-nominate in a maximum of <strong>3 categories only</strong>, and every selected category must be genuinely relevant to their content, work or digital presence. There is NO option to nominate someone else.
          </div>

          {/* Stepper Header */}
          <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-col items-center flex-1 min-w-[70px] relative text-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                    i === step
                      ? 'bg-[#d8b56b] text-[#160505] border-[#d8b56b]'
                      : i < step
                      ? 'bg-[#d8b56b]/20 text-[#f1d99a] border-[#d8b56b]/50'
                      : 'bg-black/40 text-white/30 border-white/10'
                  }`}
                >
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-[10px] sm:text-xs mt-1.5 ${i <= step ? 'text-[#f1d99a]' : 'text-white/30'}`}>
                  {s}
                </span>
              </div>
            ))}
          </div>

          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-preview p-6 sm:p-8"
          >
            {error && (
              <div className="mb-6 px-4 py-3 rounded bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-medium">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-6 px-4 py-3 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-medium">
                {message}
              </div>
            )}

            {/* STEP 0: CATEGORY SELECTION (UP TO 3) */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-[rgba(216,181,107,0.2)]">
                  <div>
                    <h3 className="font-serif-luxury text-xl font-bold text-white">Select Your Categories</h3>
                    <p className="text-xs text-[#a99888]">Choose up to 3 relevant public voting categories for your nomination.</p>
                  </div>
                  <div className="px-3 py-1 rounded border border-[#d8b56b]/50 bg-[#d8b56b]/10 text-[#f1d99a] text-xs font-bold">
                    Selected: {selectedCategories.length} / 3
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Filter categories (e.g. YouTube, Tech, Food, Comedy)..."
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                  className="input-field text-xs py-2.5"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pr-1">
                  {filteredCategories.map((c) => {
                    const isSelected = selectedCategories.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => toggleCategory(c.id)}
                        className={`p-3.5 rounded border text-xs cursor-pointer transition-all flex items-start justify-between gap-2 ${
                          isSelected
                            ? 'border-[#d8b56b] bg-[#d8b56b]/15 text-white shadow-sm'
                            : 'border-white/10 bg-black/20 text-[#d7c8b8] hover:border-white/30'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-[#f1d99a] mb-0.5">{c.name}</div>
                          <div className="text-[11px] text-[#a99888] line-clamp-1">{c.description}</div>
                        </div>
                        <span className={`text-base font-bold shrink-0 ${isSelected ? 'text-[#d8b56b]' : 'text-white/20'}`}>
                          {isSelected ? '✓' : '+'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {selectedCategories.length > 0 && (
                  <div className="p-3 bg-black/40 border border-[rgba(216,181,107,0.3)] rounded text-xs text-[#f1d99a]">
                    <strong>Your Selected Categories ({selectedCategories.length}/3):</strong>{' '}
                    {selectedCategoryNames.join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* STEP 1: CREATOR DETAILS */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-serif-luxury text-xl font-bold text-white mb-2">Creator Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#cdbda9] mb-1">Full Legal Name *</label>
                    <input type="text" name="full_name" value={form.full_name} onChange={update} placeholder="Your full name" className="input-field text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#cdbda9] mb-1">Creator / Channel Name *</label>
                    <input type="text" name="creator_name" value={form.creator_name} onChange={update} placeholder="Channel / handle name" className="input-field text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#cdbda9] mb-1">Mobile Number (Indian 10-digit) *</label>
                    <input type="tel" name="phone" value={form.phone} onChange={update} maxLength={10} placeholder="9876543210" className="input-field text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#cdbda9] mb-1">Email Address *</label>
                    <input type="email" name="email" value={form.email} onChange={update} placeholder="creator@email.com" className="input-field text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#cdbda9] mb-1">City *</label>
                    <input type="text" name="city" value={form.city} onChange={update} placeholder="Hyderabad, Visakhapatnam..." className="input-field text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#cdbda9] mb-1">State *</label>
                    <input type="text" name="state" value={form.state} onChange={update} placeholder="Telangana / Andhra Pradesh..." className="input-field text-sm" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#cdbda9]">
                      Profile Photograph <span className="text-red-400 font-bold">*</span>
                    </label>
                    <span className="text-[11px] text-amber-300 font-semibold bg-amber-950/80 px-2.5 py-0.5 rounded border border-amber-500/40">
                      ★ Mandatory (Max 1MB)
                    </span>
                  </div>

                  {photoPreview ? (
                    <div className="p-4 rounded-xl border border-[#d8b56b]/50 bg-black/50 flex flex-col sm:flex-row items-center gap-4 shadow-lg shadow-black/40">
                      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-[#d8b56b] shadow-md shadow-black/80 shrink-0">
                        <img
                          src={photoPreview}
                          alt="Profile preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <div className="text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                          <span className="text-emerald-400">✓</span> {photo?.name}
                        </div>
                        <div className="text-xs text-[#a99888] mt-1">
                          Size: {photo ? (photo.size / (1024 * 1024)).toFixed(2) : 0} MB • Ready for submission
                        </div>
                        <div className="text-[11px] text-[#f1d99a]/90 mt-1">
                          This photograph will appear on your official campaign kit, posters, and voting profile.
                        </div>
                        <div className="mt-3 flex gap-2 justify-center sm:justify-start">
                          <label className="cursor-pointer px-3 py-1.5 rounded bg-[#d8b56b] hover:bg-[#e4c57f] text-[#160505] text-xs font-bold transition-colors">
                            Change Photo
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/jpg"
                              onChange={handlePhotoChange}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="px-3 py-1.5 rounded border border-red-500/40 text-red-300 hover:bg-red-950/60 text-xs font-medium transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className="block p-6 rounded-xl border-2 border-dashed border-[#d8b56b]/50 hover:border-[#d8b56b] bg-black/30 hover:bg-black/50 transition-all cursor-pointer text-center group">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                      <div className="w-12 h-12 rounded-full bg-[#d8b56b]/15 text-[#f1d99a] flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform text-2xl">
                        📷
                      </div>
                      <div className="text-sm font-bold text-[#f1d99a] mb-1">
                        Upload Profile Photograph <span className="text-red-400 font-bold">*</span>
                      </div>
                      <p className="text-xs text-[#a99888] max-w-md mx-auto">
                        JPEG, PNG, or WebP format up to <strong className="text-white">1 MB</strong>. Clear portrait photograph is required for nominee identity &amp; posters.
                      </p>
                      <div className="inline-block mt-3 px-4 py-1.5 rounded bg-[#d8b56b] text-[#160505] text-xs font-bold shadow">
                        Browse &amp; Select Photo
                      </div>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: DIGITAL PRESENCE */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-serif-luxury text-xl font-bold text-white mb-2">Digital Presence</h3>
                <div>
                  <label className="block text-xs text-[#cdbda9] mb-1">Primary Platform *</label>
                  <select name="primary_platform" value={form.primary_platform} onChange={update} className="input-field text-sm">
                    {['YouTube', 'Instagram', 'Facebook', 'Podcast', 'Shorts / Reels', 'X', 'Other'].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#cdbda9] mb-1">YouTube Channel URL</label>
                    <input type="url" name="youtube_url" value={form.youtube_url} onChange={update} placeholder="youtube.com/@channel" className="input-field text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#cdbda9] mb-1">Instagram Profile URL</label>
                    <input type="url" name="instagram_url" value={form.instagram_url} onChange={update} placeholder="instagram.com/handle" className="input-field text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#cdbda9] mb-1">Facebook Page URL</label>
                    <input type="url" name="facebook_url" value={form.facebook_url} onChange={update} placeholder="facebook.com/page" className="input-field text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#cdbda9] mb-1">Other Profile / Podcast URL</label>
                    <input type="url" name="other_profile_url" value={form.other_profile_url} onChange={update} placeholder="Spotify, X, etc." className="input-field text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#cdbda9] mb-1">Website URL (Optional)</label>
                  <input type="url" name="website_url" value={form.website_url} onChange={update} placeholder="https://yourwebsite.com" className="input-field text-sm" />
                </div>
              </div>
            )}

            {/* STEP 3: YOUR STORY */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-serif-luxury text-xl font-bold text-white mb-2">Your Story &amp; Impact</h3>
                <div>
                  <label className="block text-xs text-[#cdbda9] mb-1">Tell us about your creator journey *</label>
                  <textarea
                    name="journey"
                    value={form.journey}
                    onChange={update}
                    rows={5}
                    placeholder="Describe your digital journey, what content you create, how you build community, and what makes your voice unique."
                    className="input-field resize-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#cdbda9] mb-1">Milestones, impact &amp; achievements</label>
                  <textarea
                    name="achievements"
                    value={form.achievements}
                    onChange={update}
                    rows={3}
                    placeholder="Key milestones, viral videos, awards, audience reach or positive community influence."
                    className="input-field resize-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#cdbda9] mb-1">Supporting links (best videos, portfolio, etc.)</label>
                  <textarea
                    name="support_links"
                    value={form.support_links}
                    onChange={update}
                    rows={2}
                    placeholder="URLs to your best content or proof of work (one per line)"
                    className="input-field resize-none text-sm"
                  />
                </div>
              </div>
            )}

            {/* STEP 4: REVIEW & SUBMIT */}
            {step === 4 && (
              <div className="space-y-5">
                <h3 className="font-serif-luxury text-xl font-bold text-white mb-2">Review Your Self-Nomination</h3>
                <div className="p-4 sm:p-5 rounded-xl bg-black/40 border border-[#d8b56b]/30 text-xs space-y-3 text-[#d7c8b8]">
                  <div className="flex items-center gap-4 pb-3 border-b border-white/10">
                    {photoPreview ? (
                      <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#d8b56b] shadow shrink-0">
                        <img
                          src={photoPreview}
                          alt="Profile preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-red-950/60 border border-red-500/50 flex items-center justify-center text-[10px] text-red-300 text-center shrink-0">
                        Missing Photo
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-white text-base">{form.creator_name || form.full_name}</div>
                      <div className="text-[#a99888] text-xs">{form.full_name}</div>
                      <div className="text-[#8fe0a5] text-[11px] mt-0.5">✓ Profile photo ready</div>
                    </div>
                  </div>
                  <div><strong className="text-white">Mobile:</strong> {form.phone}</div>
                  <div><strong className="text-white">Email:</strong> {form.email}</div>
                  <div><strong className="text-white">Location:</strong> {form.city}, {form.state}</div>
                  <div><strong className="text-white">Selected Categories ({selectedCategories.length}/3):</strong> <span className="text-[#f1d99a] font-bold">{selectedCategoryNames.join(', ')}</span></div>
                </div>

                <label className="flex items-start space-x-3 text-xs text-[#d7c8b8] cursor-pointer">
                  <input type="checkbox" name="agree" checked={form.agree} onChange={update} className="mt-0.5 accent-[#d8b56b]" />
                  <span>
                    I confirm that the information submitted is accurate and that I am submitting my own self-nomination as the official creator or authorized representative.
                  </span>
                </label>
                <label className="flex items-start space-x-3 text-xs text-white/50 cursor-pointer">
                  <input type="checkbox" checked readOnly className="mt-0.5 opacity-50" />
                  <span>
                    I agree to the Telugu Icon Digital &amp; Influencer Awards 2026 rules and terms.
                  </span>
                </label>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between items-center mt-8 pt-5 border-t border-[rgba(216,181,107,0.2)]">
              <button
                type="button"
                onClick={prev}
                disabled={step === 0 || isSubmitting}
                className="btn-outline text-xs py-2 px-5 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Back
              </button>

              {step < STEPS.length - 1 ? (
                <button type="button" onClick={next} className="btn-gold text-xs py-2 px-6">
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="btn-gold text-xs py-2.5 px-6 flex items-center justify-center gap-2 font-bold disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-[#d8b56b]/20"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-[#160505]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>SUBMITTING NOMINATION...</span>
                    </>
                  ) : (
                    <span>SUBMIT SELF-NOMINATION</span>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </PageTransition>
  );
}