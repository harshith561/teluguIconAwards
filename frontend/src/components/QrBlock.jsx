import { useEffect, useRef, useState } from 'react';

// A QR code plus the exact URL it encodes.
//
// Two things this fixes over a bare <canvas>:
//   1. The encoded URL is always visible next to the code. A QR that silently
//      points somewhere wrong is worse than no QR - now it can be checked by
//      eye and by clicking before it is printed.
//   2. If local generation ever fails, it falls back to a remote image instead
//      of leaving a blank square on the page.
//
// Generated locally (no third-party host) so posters and offline print runs
// still work. Add-on req. 6.
export default function QrBlock({
  value,
  size = 140,
  label = 'Scan to Vote',
  showUrl = true,
  dark = '#0a0a0a',
  light = '#ffffff',
  onDataUrl,
  // Wraps the code in an <a href={value}>. Turn this off when the encoded value
  // is not a URL (a gate-pass token, for example) - otherwise the wrapper points
  // at a relative path that 404s.
  linkify = true,
}) {
  const canvasRef = useRef(null);
  const [mode, setMode] = useState(value ? 'loading' : 'idle');

  useEffect(() => {
    let cancelled = false;
    if (!value || !canvasRef.current) {
      setMode('idle');
      return undefined;
    }

    setMode('loading');
    import('qrcode')
      .then(({ default: QRCode }) => {
        if (cancelled || !canvasRef.current) return null;
        return QRCode.toCanvas(canvasRef.current, value, {
          width: size,
          margin: 1,
          errorCorrectionLevel: 'H',
          color: { dark, light },
        }).then(() => {
          if (cancelled) return;
          setMode('ready');
          if (!onDataUrl) return null;
          return QRCode.toDataURL(value, {
            width: size * 2,
            margin: 2,
            errorCorrectionLevel: 'H',
            color: { dark, light },
          }).then((url) => { if (!cancelled) onDataUrl(url); }).catch(() => {});
        });
      })
      .catch(() => {
        // Bundler blocked, module failed to load - show a scannable fallback
        // rather than an empty box.
        if (!cancelled) setMode('fallback');
      });

    return () => { cancelled = true; };
  }, [value, size, dark, light, onDataUrl]);

  if (!value) return null;

  const displayUrl = value.replace(/^https?:\/\//, '');
  const fallbackSrc = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(value)}&size=${size * 3}x${size * 3}&margin=8&format=png`;

  const code = (
    <>
      {mode === 'fallback' ? (
        <img
          src={fallbackSrc}
          width={size}
          height={size}
          alt={`QR code for ${displayUrl}`}
          className="block rounded-md"
        />
      ) : (
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          role="img"
          aria-label={`QR code linking to ${displayUrl}`}
          className="block rounded-md bg-white"
        />
      )}
    </>
  );

  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      {linkify ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          title="Open this link"
          className="block rounded-lg bg-white p-1.5 hover:opacity-90 transition-opacity"
        >
          {code}
        </a>
      ) : (
        <div className="block rounded-lg bg-white p-1.5">{code}</div>
      )}

      {label && (
        <span className="text-champagne-400/60 text-[10px] uppercase tracking-widest font-bold">
          {label}
        </span>
      )}

      {showUrl && (
        <div className="w-full max-w-[240px] text-center">
          <p className="text-white/30 text-[9px] uppercase tracking-wider font-bold mb-0.5">
            QR points to
          </p>
          <p className="text-white/60 text-[10px] font-mono break-all leading-tight select-all">
            {displayUrl}
          </p>
        </div>
      )}
    </div>
  );
}