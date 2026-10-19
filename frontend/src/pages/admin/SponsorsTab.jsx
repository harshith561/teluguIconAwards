import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { api, getAssetUrl } from '../../api';

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB (1,048,576 bytes)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export const SPONSOR_TYPES = [
  'Title Sponsor',
  'Powered By Sponsor',
  'Associate Sponsor',
  'Gold Sponsor',
  'Silver Sponsor',
  'Media Partner',
  'Event Partner',
  'Technology Partner',
  'Digital Partner',
  'Bronze Sponsor',
  'Official Partner',
  'Co-Presenting Sponsor',
];

export default function SponsorsTab() {
  // Data state
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Notifications
  const [notification, setNotification] = useState(null);
  const notificationTimeoutRef = useRef(null);

  const showNotification = useCallback((type, message) => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    setNotification({ type, message });
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, 4000);
  }, []);

  // Form state
  const [editingSponsor, setEditingSponsor] = useState(null);
  const [name, setName] = useState('');
  const [sponsorType, setSponsorType] = useState('');
  const [link, setLink] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef(null);
  const formCardRef = useRef(null);

  // Memoized set of sponsor types currently assigned to existing sponsors (excluding the one being edited)
  const assignedTypes = useMemo(() => {
    return new Set(
      sponsors
        .filter((s) => !editingSponsor || s.id !== editingSponsor.id)
        .map((s) => s.sponsor_type)
        .filter(Boolean)
    );
  }, [sponsors, editingSponsor]);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, [logoPreview]);

  // Load sponsors from GET /api/admin/sponsors
  const loadSponsors = useCallback(async (force = false) => {
    try {
      setFetchError(null);
      const res = await api.get('/admin/sponsors', { force });
      const sponsorList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setSponsors(sponsorList);
    } catch (err) {
      console.error('Failed to load sponsors:', err);
      setFetchError(err.message || 'Failed to load sponsors');
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    loadSponsors(true).finally(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [loadSponsors]);

  // Validate a selected logo file
  const validateFile = (file) => {
    if (!file) return 'Sponsor logo is required.';
    if (file.size === 0) return 'Selected file is empty.';
    if (file.size > MAX_FILE_SIZE) {
      return `Image is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum allowed size is 1 MB.`;
    }

    const mime = (file.type || '').toLowerCase();
    const ext = file.name ? file.name.substring(file.name.lastIndexOf('.')).toLowerCase() : '';
    const validMime = ALLOWED_MIME_TYPES.includes(mime);
    const validExt = ALLOWED_EXTENSIONS.includes(ext);

    if (!validMime && !validExt) {
      return 'Invalid file type. Only JPG, JPEG, PNG, and WebP images are permitted.';
    }

    return null;
  };

  // Handle file selection (input or drop)
  const handleFileSelect = (file) => {
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setFormErrors((prev) => ({ ...prev, logo: error }));
      setLogoFile(null);
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
      setLogoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFormErrors((prev) => ({ ...prev, logo: null }));
    setLogoFile(file);
    if (logoPreview && logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview);
    }
    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    handleFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (submitting) return;
    const file = e.dataTransfer.files?.[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleRemoveLogo = () => {
    if (logoPreview && logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoFile(null);
    setLogoPreview(null);
    setFormErrors((prev) => ({ ...prev, logo: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Start editing a sponsor
  const handleStartEdit = (sponsor) => {
    setEditingSponsor(sponsor);
    setName(sponsor.name || '');
    setSponsorType(sponsor.sponsor_type || '');
    setLink(sponsor.link || '');
    setLogoFile(null);
    if (logoPreview && logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoPreview(sponsor.logo ? getAssetUrl(sponsor.logo) : null);
    setFormErrors({});
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (formCardRef.current) {
      formCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Cancel editing and revert to create mode
  const handleCancelEdit = () => {
    setEditingSponsor(null);
    setName('');
    setSponsorType('');
    setLink('');
    handleRemoveLogo();
    setFormErrors({});
  };

  // Client-side validations
  const validateForm = () => {
    const errors = {};

    if (!editingSponsor && !logoFile) {
      errors.logo = 'Sponsor logo is required.';
    } else if (logoFile) {
      const fileErr = validateFile(logoFile);
      if (fileErr) errors.logo = fileErr;
    } else if (editingSponsor && !logoPreview) {
      errors.logo = 'Sponsor logo is required.';
    }

    if (!name.trim()) {
      errors.name = 'Sponsor name is required.';
    }

    if (!sponsorType) {
      errors.sponsor_type = 'Please select a sponsor type.';
    } else if (assignedTypes.has(sponsorType)) {
      errors.sponsor_type = 'This sponsor type has already been assigned to another sponsor.';
    }

    if (link.trim()) {
      try {
        const parsed = new URL(link.trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          errors.link = 'Link must start with http:// or https://';
        }
      } catch {
        errors.link = 'Please enter a valid website URL (e.g. https://example.com)';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit sponsor form (Create or Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const formData = new FormData();
      if (editingSponsor) {
        formData.append('id', editingSponsor.id);
        formData.append('sponsor_id', editingSponsor.id);
      }
      if (logoFile) {
        formData.append('logo', logoFile);
      }
      formData.append('name', name.trim());
      formData.append('sponsor_type', sponsorType);
      if (link.trim()) {
        formData.append('link', link.trim());
      }

      // Always send the POST API (POST /admin/sponsors) for both create and update
      const res = await api.postMultipart('/admin/sponsors', formData);

      if (res && res.ok !== false && (res.success || res.id || res.data)) {
        showNotification(
          'success',
          res.message || (editingSponsor ? 'Sponsor updated successfully!' : 'Sponsor created successfully!')
        );
        // Reset form
        handleCancelEdit();
        // Refresh sponsors list (this also frees or updates available types)
        await loadSponsors(true);
      } else {
        const errMessage = res?.message || `Failed to ${editingSponsor ? 'update' : 'create'} sponsor. Please try again.`;
        showNotification('error', errMessage);
      }
    } catch (err) {
      console.error(`Error ${editingSponsor ? 'updating' : 'submitting'} sponsor:`, err);
      showNotification('error', err?.message || `Network error while ${editingSponsor ? 'updating' : 'creating'} sponsor.`);
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm delete sponsor
  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;

    setIsDeleting(true);

    try {
      const res = await api.delete(`/admin/sponsors/${deleteTarget.id}`);

      if (res && res.ok !== false && res.success !== false) {
        showNotification(
          'success',
          res.message || `Sponsor deleted successfully. ${deleteTarget.sponsor_type ? `"${deleteTarget.sponsor_type}" is now available again.` : ''}`
        );
        // If the sponsor currently being edited was deleted, cancel edit mode
        if (editingSponsor?.id === deleteTarget.id) {
          handleCancelEdit();
        }
        // Remove from local list immediately — sponsor type becomes available instantly
        setSponsors((prev) => prev.filter((s) => s.id !== deleteTarget.id));
        setDeleteTarget(null);
      } else {
        const errMessage = res?.message || 'Failed to delete sponsor.';
        showNotification('error', errMessage);
        setDeleteTarget(null);
      }
    } catch (err) {
      console.error('Error deleting sponsor:', err);
      showNotification('error', err?.message || 'Network error while deleting sponsor.');
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2">
            <span>🤝</span> Sponsor Management
          </h1>
          <p className="text-white/40 text-xs mt-1">
            Create and manage official sponsors. Exactly one sponsor per sponsor type is enforced.
          </p>
        </div>
        <button
          onClick={() => loadSponsors(true)}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs border border-white/10 flex items-center gap-1.5 transition-all disabled:opacity-50"
          title="Refresh sponsors"
        >
          <span className={loading ? 'animate-spin' : ''}>🔄</span> Refresh List
        </button>
      </div>

      {/* Global Notifications */}
      {notification && (
        <div
          className={`px-4 py-3 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between transition-all duration-300 shadow-lg ${
            notification.type === 'success'
              ? 'bg-emerald-900/40 border border-emerald-500/50 text-emerald-200'
              : 'bg-burgundy-900/60 border border-burgundy-500/50 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{notification.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-white/40 hover:text-white text-xs ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Section 1: Create / Edit Sponsor Form */}
      <div
        ref={formCardRef}
        className={`glass-card p-5 md:p-6 border transition-all duration-300 ${
          editingSponsor
            ? 'border-champagne-500/50 bg-champagne-500/[0.03] shadow-lg shadow-champagne-500/5'
            : 'border-white/10'
        }`}
      >
        <div className="border-b border-white/10 pb-3 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              {editingSponsor ? (
                <>
                  <span className="text-champagne-400">✏️</span>
                  <span>Edit Sponsor:</span>
                  <span className="text-champagne-300 font-extrabold">{editingSponsor.name}</span>
                </>
              ) : (
                <>
                  <span className="text-champagne-400">➕</span>
                  <span>Add New Sponsor</span>
                </>
              )}
            </h2>
            <p className="text-white/40 text-xs mt-0.5">
              {editingSponsor
                ? 'Update sponsor details or select a new logo file to replace the current one.'
                : 'Assign one sponsor to an official Sponsor Type.'}
            </p>
          </div>
          {editingSponsor && (
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={submitting}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 text-xs font-medium self-start sm:self-auto transition-all flex items-center gap-1.5"
            >
              <span>✕</span>
              <span>Cancel Edit</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Logo Upload */}
            <div className="lg:col-span-5 space-y-2">
              <label className="block text-xs font-semibold text-white/80">
                Sponsor Logo <span className="text-burgundy-400">*</span>
                {editingSponsor && (
                  <span className="text-white/40 font-normal ml-1.5">(Keep or Replace)</span>
                )}
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
                id="sponsor-logo-input"
                disabled={submitting}
              />

              {logoPreview ? (
                <div className="p-4 rounded-xl bg-ink-800/80 border border-champagne-500/30 flex flex-col items-center justify-center space-y-3 relative group">
                  <div className="w-full h-36 bg-black/40 rounded-lg p-3 flex items-center justify-center border border-white/5">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="w-full flex items-center justify-between text-xs text-white/60 px-1">
                    <span className="truncate max-w-[200px]" title={logoFile?.name || 'Saved logo'}>
                      {logoFile ? logoFile.name : (editingSponsor ? 'Current saved logo' : 'Logo')}
                    </span>
                    <span className="text-champagne-400 font-mono text-[11px]">
                      {logoFile ? `${(logoFile.size / 1024).toFixed(1)} KB` : (editingSponsor ? 'Saved' : '')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 w-full pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={submitting}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-all"
                    >
                      {editingSponsor && !logoFile ? 'Replace Logo' : 'Change Logo'}
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      disabled={submitting}
                      className="py-1.5 px-3 rounded-lg bg-burgundy-900/40 hover:bg-burgundy-900/70 border border-burgundy-500/30 text-burgundy-300 text-xs font-medium transition-all"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[170px] ${
                    isDragOver
                      ? 'border-champagne-400 bg-champagne-500/10'
                      : formErrors.logo
                      ? 'border-burgundy-500/60 bg-burgundy-950/20'
                      : 'border-white/15 hover:border-champagne-500/40 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl mb-2 text-champagne-400">
                    📷
                  </div>
                  <p className="text-xs font-semibold text-white/90">
                    Click to upload or drag & drop
                  </p>
                  <p className="text-[11px] text-white/40 mt-1">
                    PNG, JPG, JPEG, or WebP (Max 1 MB)
                  </p>
                </div>
              )}

              {formErrors.logo && (
                <p className="text-xs text-burgundy-400 font-medium">{formErrors.logo}</p>
              )}
            </div>

            {/* Right Column: Name, Sponsor Type, Category, Link */}
            <div className="lg:col-span-7 space-y-4">
              {/* Sponsor Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-white/80">
                  Sponsor Name <span className="text-burgundy-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corporation, Sri Lakshmi Gold"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: null }));
                  }}
                  disabled={submitting}
                  className={`input-field !py-2 !text-xs w-full ${
                    formErrors.name ? '!border-burgundy-500/60' : ''
                  }`}
                />
                {formErrors.name && (
                  <p className="text-xs text-burgundy-400 font-medium">{formErrors.name}</p>
                )}
              </div>

              {/* Sponsor Type Dropdown (One per Type enforced) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-white/80">
                    Sponsor Type <span className="text-burgundy-400">*</span>
                  </label>
                  <span className="text-[11px] text-white/40">
                    {12 - assignedTypes.size} of 12 available
                  </span>
                </div>
                <select
                  value={sponsorType}
                  onChange={(e) => {
                    setSponsorType(e.target.value);
                    if (formErrors.sponsor_type) setFormErrors((prev) => ({ ...prev, sponsor_type: null }));
                  }}
                  disabled={submitting}
                  className={`input-field !py-2 !text-xs w-full ${
                    formErrors.sponsor_type ? '!border-burgundy-500/60' : ''
                  }`}
                >
                  <option value="">— Select a Sponsor Type —</option>
                  {SPONSOR_TYPES.map((type) => {
                    const isAssigned = assignedTypes.has(type);
                    return (
                      <option
                        key={type}
                        value={type}
                        disabled={isAssigned}
                        className={isAssigned ? 'text-white/30 bg-ink-900' : 'text-white bg-ink-800'}
                      >
                        {type} {isAssigned ? '(Already Assigned)' : ''}
                      </option>
                    );
                  })}
                </select>
                {formErrors.sponsor_type && (
                  <p className="text-xs text-burgundy-400 font-medium">{formErrors.sponsor_type}</p>
                )}
              </div>

              {/* Sponsor Link (Optional) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-white/80 flex items-center justify-between">
                  <span>Sponsor Link</span>
                  <span className="text-white/30 text-[11px] font-normal">Optional</span>
                </label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={link}
                  onChange={(e) => {
                    setLink(e.target.value);
                    if (formErrors.link) setFormErrors((prev) => ({ ...prev, link: null }));
                  }}
                  disabled={submitting}
                  className={`input-field !py-2 !text-xs w-full ${
                    formErrors.link ? '!border-burgundy-500/60' : ''
                  }`}
                />
                {formErrors.link && (
                  <p className="text-xs text-burgundy-400 font-medium">{formErrors.link}</p>
                )}
              </div>

              {/* Submit / Update Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                {editingSponsor && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-gold !py-2.5 !px-6 text-xs font-bold rounded-xl flex items-center gap-2 disabled:opacity-50 transition-all shadow-md"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-ink-900 border-t-transparent rounded-full animate-spin" />
                      <span>{editingSponsor ? 'Updating Sponsor...' : 'Saving Sponsor...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{editingSponsor ? '💾' : '➕'}</span>
                      <span>{editingSponsor ? 'Update Sponsor' : 'Save Sponsor'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Section 2: Saved Sponsors List */}
      <div className="glass-card overflow-hidden border border-white/10">
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>📋</span> Saved Sponsors
              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                {sponsors.length}
              </span>
            </h2>
            <p className="text-white/40 text-xs mt-0.5">
              All active sponsors with assigned types.
            </p>
          </div>
        </div>

        {fetchError && (
          <div className="p-4 bg-burgundy-900/40 border-b border-burgundy-500/40 text-red-200 text-xs flex items-center justify-between">
            <span>{fetchError}</span>
            <button
              onClick={() => loadSponsors(true)}
              className="text-white underline hover:no-underline font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-ink-800/60 text-white/40 uppercase text-[10px] sm:text-xs tracking-wider border-b border-white/5">
              <tr>
                <th className="px-4 py-3.5 w-24">Logo</th>
                <th className="px-4 py-3.5">Sponsor Name</th>
                <th className="px-4 py-3.5">Sponsor Type</th>
                <th className="px-4 py-3.5">Sponsor Link</th>
                <th className="px-4 py-3.5 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && sponsors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-white/40">
                    <div className="w-7 h-7 border-2 border-champagne-500/30 border-t-champagne-500 rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading sponsors...</span>
                  </td>
                </tr>
              ) : sponsors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-white/40">
                    <div className="text-2xl mb-2">🤝</div>
                    <div className="font-medium text-white/60">No sponsors found</div>
                    <div className="text-xs text-white/30 mt-1">
                      Add your first sponsor using the form above.
                    </div>
                  </td>
                </tr>
              ) : (
                sponsors.map((sponsor) => (
                  <tr
                    key={sponsor.id}
                    className={`transition-colors ${
                      editingSponsor?.id === sponsor.id
                        ? 'bg-champagne-500/10 border-l-2 border-champagne-400'
                        : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    {/* Logo Thumbnail */}
                    <td className="px-4 py-3.5 align-middle">
                      <div className="w-14 h-14 rounded-lg bg-ink-800/90 border border-white/10 p-1.5 flex items-center justify-center overflow-hidden shrink-0">
                        {sponsor.logo ? (
                          <img
                            src={getAssetUrl(sponsor.logo)}
                            alt={sponsor.name}
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement.innerText = '🤝';
                            }}
                          />
                        ) : (
                          <span className="text-xl">🤝</span>
                        )}
                      </div>
                    </td>

                    {/* Sponsor Name */}
                    <td className="px-4 py-3.5 align-middle font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <span>{sponsor.name}</span>
                        {editingSponsor?.id === sponsor.id && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-champagne-500/20 text-champagne-300 border border-champagne-500/40">
                            Editing
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Sponsor Type Badge */}
                    <td className="px-4 py-3.5 align-middle">
                      {sponsor.sponsor_type ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-champagne-500/15 text-champagne-300 border border-champagne-500/30 whitespace-nowrap">
                          {sponsor.sponsor_type}
                        </span>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>

                    {/* Sponsor Link */}
                    <td className="px-4 py-3.5 align-middle">
                      {sponsor.link ? (
                        <a
                          href={sponsor.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-champagne-400 hover:text-champagne-300 underline inline-flex items-center gap-1 text-xs truncate max-w-[200px]"
                          title={sponsor.link}
                        >
                          <span className="truncate">{sponsor.link.replace(/^https?:\/\//i, '')}</span>
                          <span className="text-[10px]">↗</span>
                        </a>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 align-middle text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(sponsor)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                            editingSponsor?.id === sponsor.id
                              ? 'bg-champagne-400 text-ink-950 shadow-md font-bold'
                              : 'bg-champagne-500/15 hover:bg-champagne-500/30 border border-champagne-500/30 text-champagne-300'
                          }`}
                          title={`Edit ${sponsor.name}`}
                        >
                          <span>✏️</span>
                          <span>{editingSponsor?.id === sponsor.id ? 'Editing' : 'Edit'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(sponsor)}
                          className="px-2.5 py-1 rounded-lg bg-burgundy-900/30 hover:bg-burgundy-900/60 border border-burgundy-500/30 text-burgundy-300 text-xs font-semibold transition-all flex items-center gap-1"
                          title={`Delete ${sponsor.name}`}
                        >
                          <span>🗑️</span>
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-4 border border-burgundy-500/40 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span>⚠️</span> Confirm Permanent Deletion
              </h3>
              <button
                onClick={() => !isDeleting && setDeleteTarget(null)}
                disabled={isDeleting}
                className="text-white/50 hover:text-white text-sm p-1"
              >
                ✕
              </button>
            </div>

            {/* Target Details */}
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-ink-800 border border-white/10 p-1 flex items-center justify-center shrink-0">
                  {deleteTarget.logo ? (
                    <img
                      src={getAssetUrl(deleteTarget.logo)}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-base">🤝</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-white font-bold text-sm truncate">{deleteTarget.name}</div>
                  {deleteTarget.sponsor_type && (
                    <div className="text-champagne-400 font-semibold text-xs mt-0.5">
                      {deleteTarget.sponsor_type}
                    </div>
                  )}
                  <div className="text-white/40 text-[11px] mt-0.5 truncate">
                    {deleteTarget.category_name || 'Category Partner'}
                  </div>
                </div>
              </div>

              {/* Warning Box */}
              <div className="p-3.5 rounded-xl bg-burgundy-950/50 border border-burgundy-500/40 text-red-200 space-y-1">
                <p className="font-semibold text-xs leading-relaxed">
                  Are you sure you want to permanently delete this sponsor?
                </p>
                <p className="opacity-80 text-[11px] leading-relaxed">
                  This action cannot be undone. The sponsor record and logo will be removed, and the{' '}
                  <span className="font-semibold text-white">
                    {deleteTarget.sponsor_type || 'sponsor type'}
                  </span>{' '}
                  will immediately become available again.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/70 text-xs font-medium transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-burgundy-600 hover:bg-burgundy-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Permanently</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
