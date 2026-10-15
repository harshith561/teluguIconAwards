import { useState, useRef } from 'react';
import { api, getAssetUrl } from '../api';

export default function ImageUploader({
  label = 'Upload Image',
  value = '',
  onChange,
  required = false,
  className = '',
  aspectRatio = 'square', // 'square', 'video', 'poster', or 'banner'
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (PNG, JPG, WebP, SVG)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10 MB');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      // Create local preview immediately for snappy feel
      const localPreview = URL.createObjectURL(file);
      if (onChange) onChange(localPreview);

      // Upload to server
      const res = await api.upload(file);
      if (res && res.url) {
        if (onChange) onChange(res.url);
      } else {
        // Fallback to base64 if server upload endpoint failed
        const reader = new FileReader();
        reader.onloadend = () => {
          if (onChange) onChange(reader.result);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.warn('Upload fallback to base64:', err);
      // Fallback: convert to base64 so admin can still save seamlessly!
      const reader = new FileReader();
      reader.onloadend = () => {
        if (onChange) onChange(reader.result);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const displayUrl = value ? getAssetUrl(value) : '';

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-champagne-300">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFile(e.target.files?.[0])}
        accept="image/*"
        className="hidden"
      />

      {displayUrl ? (
        <div className="relative group rounded-xl overflow-hidden border border-champagne-500/30 bg-ink-950 p-2 flex items-center gap-3">
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-ink-800 shrink-0 border border-white/10 flex items-center justify-center">
            <img src={displayUrl} alt="Preview" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                ✓ Ready
              </span>
              {uploading && (
                <span className="text-[10px] text-amber-400 animate-pulse font-medium">
                  Uploading...
                </span>
              )}
            </div>
            <p className="text-[11px] text-white/50 truncate mt-1">Image selected</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 text-[11px] font-semibold text-champagne-400 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10"
            >
              Change
            </button>
            <button
              type="button"
              onClick={() => onChange && onChange('')}
              className="px-2.5 py-1 text-[11px] font-semibold text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-950/60 rounded-lg transition-colors border border-red-500/20"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-champagne-400 bg-champagne-500/10'
              : 'border-white/15 hover:border-champagne-500/50 bg-white/[0.02] hover:bg-white/[0.04]'
          }`}
        >
          {uploading ? (
            <div className="py-2 flex items-center justify-center gap-2 text-xs text-champagne-300">
              <div className="w-4 h-4 border-2 border-champagne-400 border-t-transparent rounded-full animate-spin" />
              <span>Uploading image...</span>
            </div>
          ) : (
            <div className="py-1 space-y-1">
              <div className="text-xl">🖼️</div>
              <div className="text-xs font-semibold text-white/90">
                Click to upload image or drag & drop
              </div>
              <p className="text-[10px] text-white/40">
                Supports PNG, JPG, WebP, SVG (Max 10 MB)
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-[11px] text-red-400 font-medium">{error}</p>
      )}
    </div>
  );
}
