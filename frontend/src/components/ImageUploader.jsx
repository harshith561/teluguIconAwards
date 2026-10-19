import { useState, useRef } from 'react';
import { api, getAssetUrl } from '../api';

const MAX_IMAGE_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB (1,048,576 bytes)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export default function ImageUploader({
  label = 'Upload Image',
  value = '',
  onChange,
  onImageIdChange,
  required = false,
  className = '',
  section = 'general',
  entityType = null,
  entityId = null,
  aspectRatio = 'square',
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    if (!file) {
      return 'Image is required. Please select an image file.';
    }

    // Check size
    if (file.size === 0) {
      return 'Uploaded file is empty. Please select a valid image.';
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return 'Image is required. Please upload an image smaller than or equal to 1 MB.';
    }

    // Check format
    const mime = (file.type || '').toLowerCase();
    const ext = file.name ? file.name.substring(file.name.lastIndexOf('.')).toLowerCase() : '';
    const isValidMime = ALLOWED_MIME_TYPES.includes(mime);
    const isValidExt = ALLOWED_EXTENSIONS.includes(ext);

    if (!isValidMime && !isValidExt) {
      return 'Invalid image format. Only JPEG, PNG, and WebP images are allowed.';
    }

    return null;
  };

  const handleFile = async (file) => {
    if (!file || uploading) return;

    setError(null);
    setSuccessMsg(null);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);

    try {
      const res = await api.upload(file, {
        section,
        entity_type: entityType,
        entity_id: entityId,
      });

      if (res && (res.ok !== false) && (res.url || res.id)) {
        const finalUrl = res.url || `/api/images/${res.id}/file`;
        if (onChange) {
          onChange(finalUrl, res);
        }
        if (onImageIdChange && res.id) {
          onImageIdChange(res.id);
        }
        setSuccessMsg('Image uploaded and saved to database successfully!');
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        const errorMsg = res?.message || 'Failed to upload image. Please try again.';
        setError(errorMsg);
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      setError(err?.message || 'Network error while uploading image to server');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = () => {
    if (uploading) return;
    setError(null);
    setSuccessMsg(null);
    if (onChange) onChange('', null);
    if (onImageIdChange) onImageIdChange(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const displayUrl = value ? getAssetUrl(value) : '';

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-champagne-300">
            {label} {required && <span className="text-red-400">*</span>}
          </label>
          <span className="text-[10px] text-white/40">Max 1 MB (JPEG, PNG, WebP)</span>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFile(e.target.files?.[0])}
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="hidden"
        disabled={uploading}
      />

      {displayUrl ? (
        <div className="relative group rounded-xl overflow-hidden border border-champagne-500/30 bg-ink-950 p-2.5 flex items-center gap-3">
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-ink-800 shrink-0 border border-white/10 flex items-center justify-center relative">
            <img
              src={displayUrl}
              alt="Uploaded Preview"
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="%231a1a24"><rect width="64" height="64" fill="%231a1a24"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff40" font-size="20">🖼️</text></svg>';
              }}
            />
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-champagne-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span>✓</span> Database Stored
              </span>
              {uploading && (
                <span className="text-[10px] text-amber-400 animate-pulse font-medium">
                  Uploading...
                </span>
              )}
            </div>
            <p className="text-[11px] text-white/60 truncate mt-1">
              {String(value).includes('/api/images/') ? 'Saved in database' : 'Ready'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 text-[11px] font-semibold text-champagne-400 bg-white/5 hover:bg-white/10 disabled:opacity-50 rounded-lg transition-colors border border-white/10"
              title="Replace current image"
            >
              Replace
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={handleRemove}
              className="px-2.5 py-1 text-[11px] font-semibold text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-950/60 disabled:opacity-50 rounded-lg transition-colors border border-red-500/20"
              title="Remove image"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
            uploading
              ? 'opacity-70 cursor-not-allowed border-amber-500/40 bg-amber-500/5'
              : dragOver
              ? 'border-champagne-400 bg-champagne-500/10'
              : 'border-white/15 hover:border-champagne-500/50 bg-white/[0.02] hover:bg-white/[0.04]'
          }`}
        >
          {uploading ? (
            <div className="py-2 flex items-center justify-center gap-2 text-xs text-champagne-300">
              <div className="w-4 h-4 border-2 border-champagne-400 border-t-transparent rounded-full animate-spin" />
              <span>Saving image to database...</span>
            </div>
          ) : (
            <div className="py-1 space-y-1">
              <div className="text-xl">🖼️</div>
              <div className="text-xs font-semibold text-white/90">
                Click to upload image or drag & drop
              </div>
              <p className="text-[10px] text-white/40">
                Supports JPEG, PNG, WebP • Max 1 MB (1,048,576 bytes)
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-[11px] text-red-400 font-medium bg-red-950/30 border border-red-500/20 px-2.5 py-1.5 rounded-lg">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium bg-emerald-950/30 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
          <span>✓</span>
          <span>{successMsg}</span>
        </div>
      )}
    </div>
  );
}
