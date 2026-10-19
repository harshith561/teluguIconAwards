import React, { forwardRef, useState, useEffect } from 'react';
import { getAssetUrl } from '../api';

/**
 * Luxury Golden Avatar Silhouette SVG
 * Rendered when a nominee has no custom photo uploaded or if photo fails to load.
 */
export const GoldAvatarFallback = ({ className = "w-full h-full" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="goldAvatarBg" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#1f1810" />
        <stop offset="60%" stopColor="#120c06" />
        <stop offset="100%" stopColor="#080503" />
      </radialGradient>
      <linearGradient id="goldAvatarMetal" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFF2BF" />
        <stop offset="45%" stopColor="#D4AF37" />
        <stop offset="100%" stopColor="#8A6412" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="50" fill="url(#goldAvatarBg)" />
    {/* Head */}
    <circle cx="50" cy="38" r="16" fill="url(#goldAvatarMetal)" />
    {/* Bust / Shoulders */}
    <path
      d="M20 84 C20 62, 34 56, 50 56 C66 56, 80 62, 80 84 Z"
      fill="url(#goldAvatarMetal)"
    />
  </svg>
);

/**
 * NomineeHtmlPoster
 * Pure HTML/CSS Luxury Awards Poster.
 * - Perfectly center-aligned directly under the official header & badge.
 * - Dynamic vertical spacers adapting cleanly between 2:3 Poster and 9:16 Story.
 * - Dynamic sponsor grid adapting to 0, 1-3, or 4+ sponsor logos.
 * - Exports crisp high-resolution PNG/JPG directly in browser.
 */
export const NomineeHtmlPoster = forwardRef(({
  nominee,
  category,
  sponsors = [],
  qrUrl,
  event = {},
  format = 'poster', // 'poster' (2:3, 1080x1620) or 'story' (9:16, 1080x1920)
  className = '',
  scale = 1, // Optional CSS preview scale
}, ref) => {
  const [imgError, setImgError] = useState(false);
  const isStory = format === 'story';
  const width = 1080;
  const height = isStory ? 1920 : 1620;

  const candidateName = nominee?.full_name || 'Creator Name';
  const categoryName = (category?.name || nominee?.category_name || 'Telugu YouTuber of the Year').toUpperCase();
  const photoUrl = nominee?.photo_url ? getAssetUrl(nominee.photo_url) : null;

  const eventDate = (event?.date || '16 NOVEMBER 2026').toUpperCase();
  const eventVenue = (event?.venue || 'SHILPAKALA VEDIKA, HYDERABAD').toUpperCase();

  // Filter eligible active sponsors with valid logos
  const validSponsors = sponsors.filter(
    (s) => s && s.is_active !== 0 && !s.excluded_from_poster && (s.logo_url || s.logo || s.image_id)
  );

  useEffect(() => {
    setImgError(false);
  }, [photoUrl]);

  return (
    <div
      ref={ref}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top left',
        backgroundImage: "url('/brand/master-poster.jpg')",
        backgroundPosition: 'top center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundColor: '#050302',
        position: 'relative',
        overflow: 'hidden',
        color: '#FFFFFF',
        fontFamily: "'Cinzel', 'Playfair Display', Georgia, serif",
        boxSizing: 'border-box',
      }}
      className={`select-none ${className}`}
    >
      {/* 
        Spacer below the pre-baked "★ OFFICIAL NOMINEE ★" badge:
        - In Poster (1080x1620, scale 1.582): badge bottom is at y ≈ 529px -> spacer 548px.
        - In Story (1080x1920, scale 1.875): badge bottom is at y ≈ 628px -> spacer 648px.
        This completely eliminates badge overlap and black background gaps.
      */}
      <div style={{ height: isStory ? '648px' : '548px' }} />

      {/* Main Dynamic Content Column: 100% HORIZONTALLY CENTER-ALIGNED */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          width: '100%',
          maxWidth: '540px',
          margin: '0 auto',
          padding: '0 20px',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 5,
          textAlign: 'center',
        }}
      >
        {/* 1. Nominee Photo in Glowing Double Gold Concentric Ring (Centered) */}
        <div
          style={{
            width: isStory ? '215px' : '200px',
            height: isStory ? '215px' : '200px',
            borderRadius: '50%',
            padding: '5px',
            background: 'linear-gradient(135deg, #FFF5BA 0%, #FCD34D 35%, #D4AF37 70%, #8A6412 100%)',
            boxShadow: '0 0 30px rgba(212, 175, 55, 0.55), 0 0 10px rgba(255, 245, 186, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              overflow: 'hidden',
              backgroundColor: '#111111',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {photoUrl && !imgError ? (
              <img
                src={photoUrl}
                alt=""
                crossOrigin="anonymous"
                onError={() => setImgError(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            ) : (
              <GoldAvatarFallback className="w-full h-full" />
            )}
          </div>
        </div>

        {/* 2. Nominee Full Name (Centered) */}
        <h1
          style={{
            margin: isStory ? '18px 0 0 0' : '14px 0 0 0',
            color: '#F7E096',
            fontSize: candidateName.length > 24 ? '32px' : (candidateName.length > 16 ? '38px' : '44px'),
            fontWeight: 700,
            textAlign: 'center',
            textTransform: 'capitalize',
            letterSpacing: '1px',
            textShadow: '0 2px 10px rgba(0,0,0,0.9), 0 0 25px rgba(212, 175, 55, 0.45)',
            lineHeight: 1.15,
            maxWidth: '520px',
          }}
        >
          {candidateName}
        </h1>

        {/* 3. Nominated Category Plaque (Centered) */}
        <div style={{ marginTop: isStory ? '14px' : '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '3px',
              color: '#D4AF37',
              fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
              marginBottom: '4px',
              textTransform: 'uppercase',
            }}
          >
            NOMINATED FOR
          </span>
          <div
            style={{
              border: '2px solid rgba(212, 175, 55, 0.85)',
              borderRadius: '20px',
              padding: '8px 28px',
              fontSize: categoryName.length > 30 ? '15px' : (categoryName.length > 22 ? '17px' : '19px'),
              fontWeight: 700,
              letterSpacing: '1.5px',
              color: '#FFF8E7',
              background: 'rgba(12, 8, 4, 0.75)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
              fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
              textAlign: 'center',
              maxWidth: '500px',
            }}
          >
            {categoryName}
          </div>
        </div>

        {/* 4. Dynamic Sponsors Grid (Adapts to sponsor count) */}
        {validSponsors.length > 0 && (
          <div style={{ marginTop: isStory ? '22px' : '16px', width: '100%', maxWidth: '520px', textAlign: 'center' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                marginBottom: '8px',
              }}
            >
              <div style={{ height: '1px', width: '45px', background: 'rgba(212, 175, 55, 0.5)' }} />
              <span
                style={{
                  color: '#D4AF37',
                  fontSize: '13px',
                  fontWeight: 700,
                  letterSpacing: '2.5px',
                  fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
                }}
              >
                OUR PROUD SPONSORS
              </span>
              <div style={{ height: '1px', width: '45px', background: 'rgba(212, 175, 55, 0.5)' }} />
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px 18px',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '2px 0',
              }}
            >
              {validSponsors.map((sp) => {
                const sUrl = sp.logo_url || sp.logo || (sp.image_id ? `/api/images/${sp.image_id}/file` : '');
                return (
                  <div
                    key={sp.id || sp.name}
                    style={{
                      height: validSponsors.length <= 2 ? '44px' : '38px',
                      maxWidth: validSponsors.length <= 2 ? '180px' : (validSponsors.length <= 4 ? '130px' : '100px'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={getAssetUrl(sUrl)}
                      alt={sp.name}
                      crossOrigin="anonymous"
                      style={{
                        maxHeight: '100%',
                        maxWidth: '100%',
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.7))',
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Dynamic QR Code & Voting CTA (Enlarged for Instant Mobile Scanning) */}
        <div
          style={{
            marginTop: isStory
              ? (validSponsors.length > 0 ? '20px' : '32px')
              : (validSponsors.length > 0 ? '14px' : '22px'),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              color: '#D4AF37',
              fontSize: isStory ? '21px' : '19px',
              fontWeight: 800,
              letterSpacing: '2.5px',
              textShadow: '0 2px 10px rgba(0,0,0,0.9), 0 0 20px rgba(212, 175, 55, 0.45)',
            }}
          >
            SCAN TO VIEW &amp; VOTE
          </span>
          <span
            style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: isStory ? '13px' : '12px',
              fontWeight: 600,
              marginTop: '4px',
              marginBottom: '10px',
              fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
            }}
          >
            Discover the Nominee &amp; Cast Your Official Vote
          </span>

          {/* High-Contrast White Card with Gold Border - Enlarged for Instant Camera Scanability */}
          <div
            style={{
              width: isStory ? '185px' : '170px',
              height: isStory ? '185px' : '170px',
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '3px solid rgba(212, 175, 55, 0.95)',
              padding: '10px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.7), 0 0 18px rgba(212, 175, 55, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="Voting QR Code"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  imageRendering: 'crisp-edges',
                }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: '#eee' }} />
            )}
          </div>
        </div>
      </div>

      {/* 6. Event Date & Venue Footer Strip (Centered at bottom, ONLY Date and Venue) */}
      <div
        style={{
          position: 'absolute',
          bottom: isStory ? '44px' : '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 120px)',
          maxWidth: isStory ? '680px' : '620px',
          padding: isStory ? '14px 32px' : '10px 28px',
          background: 'rgba(12, 8, 4, 0.92)',
          border: '2px solid rgba(212, 175, 55, 0.85)',
          borderRadius: '35px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.85), 0 0 15px rgba(212, 175, 55, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
          boxSizing: 'border-box',
          zIndex: 10,
        }}
      >
        <span
          style={{
            color: '#FFF8E7',
            fontSize: isStory ? '16px' : '14px',
            fontWeight: 700,
            letterSpacing: '1.5px',
            textAlign: 'center',
            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
          }}
        >
          📅  {eventDate}   |   📍  {eventVenue}
        </span>
      </div>
    </div>
  );
});

NomineeHtmlPoster.displayName = 'NomineeHtmlPoster';
export default NomineeHtmlPoster;
