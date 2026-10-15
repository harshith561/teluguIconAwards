import JSZip from 'jszip';
import { getAssetUrl } from '../api';
import { nomineeUrl, qrUrl, voteUrl, EVENT, EVENT_HASHTAGS } from './nomineeCampaign';

export const POSTER_WIDTH = 1080;
export const POSTER_HEIGHT = 1350; // 4:5 Instagram Portrait
export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;  // 9:16 Instagram Story

// ── Color & Theme Palettes for Category Poster Templates ──────────────────
export const POSTER_TEMPLATES = {
  gold_prestige: {
    id: 'gold_prestige',
    name: 'Gold Prestige (Classic)',
    description: 'Opulent gold borders, regal serif typography, dark vignette. Ideal for Jury & Headline awards.',
    primaryColor: '#D4AF37',
    secondaryColor: '#FFDF73',
    badgeText: 'OFFICIAL NOMINEE',
    bgStops: [
      { stop: 0, color: '#140f07' },
      { stop: 0.45, color: '#0d0905' },
      { stop: 1, color: '#050403' },
    ],
    borderWidth: 14,
    drawDecorations: (ctx, w, h, S, color) => {
      // Corner ornamental diamonds
      const corners = [
        [60 * S, 60 * S],
        [w - 60 * S, 60 * S],
        [60 * S, h - 60 * S],
        [w - 60 * S, h - 60 * S],
      ];
      ctx.fillStyle = color;
      corners.forEach(([cx, cy]) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy - 8 * S);
        ctx.lineTo(cx + 8 * S, cy);
        ctx.lineTo(cx, cy + 8 * S);
        ctx.lineTo(cx - 8 * S, cy);
        ctx.closePath();
        ctx.fill();
      });
    },
  },

  royal_amethyst: {
    id: 'royal_amethyst',
    name: 'Royal Amethyst',
    description: 'Deep royal purple with violet glow and gold trim. Ideal for Entertainment, Dance, Comedy & Music.',
    primaryColor: '#C084FC',
    secondaryColor: '#E879F9',
    badgeText: 'OFFICIAL NOMINEE',
    bgStops: [
      { stop: 0, color: '#1f0d2c' },
      { stop: 0.5, color: '#100517' },
      { stop: 1, color: '#050208' },
    ],
    borderWidth: 12,
    drawDecorations: (ctx, w, h, S, color) => {
      // Ambient radial glow behind photo
      const radGlow = ctx.createRadialGradient(w / 2, 480 * S, 100 * S, w / 2, 480 * S, 320 * S);
      radGlow.addColorStop(0, 'rgba(192, 132, 252, 0.18)');
      radGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = radGlow;
      ctx.fillRect(0, 200 * S, w, 600 * S);
    },
  },

  emerald_grandeur: {
    id: 'emerald_grandeur',
    name: 'Emerald Grandeur',
    description: 'Rich emerald jewel tones with warm amber highlights. Ideal for Tech, Business, Education & Impact.',
    primaryColor: '#10B981',
    secondaryColor: '#34D399',
    badgeText: 'OFFICIAL NOMINEE',
    bgStops: [
      { stop: 0, color: '#062319' },
      { stop: 0.5, color: '#03140e' },
      { stop: 1, color: '#010705' },
    ],
    borderWidth: 12,
    drawDecorations: (ctx, w, h, S, color) => {
      // Clean geometric inner frame
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
      ctx.lineWidth = 2 * S;
      ctx.strokeRect(65 * S, 65 * S, w - 130 * S, h - 130 * S);
    },
  },

  crimson_star: {
    id: 'crimson_star',
    name: 'Crimson Star',
    description: 'Vibrant crimson, rose gold accents & theater spotlight. Ideal for Cinema, Lifestyle, Food & Fashion.',
    primaryColor: '#F43F5E',
    secondaryColor: '#FB7185',
    badgeText: 'OFFICIAL NOMINEE',
    bgStops: [
      { stop: 0, color: '#270813' },
      { stop: 0.5, color: '#140309' },
      { stop: 1, color: '#060103' },
    ],
    borderWidth: 14,
    drawDecorations: (ctx, w, h, S, color) => {
      const radGlow = ctx.createRadialGradient(w / 2, 460 * S, 50 * S, w / 2, 460 * S, 350 * S);
      radGlow.addColorStop(0, 'rgba(244, 63, 94, 0.16)');
      radGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = radGlow;
      ctx.fillRect(0, 180 * S, w, 600 * S);
    },
  },

  cyber_bronze: {
    id: 'cyber_bronze',
    name: 'Cyber Bronze & Cyan',
    description: 'Futuristic slate with cyan neon and bronze trim. Ideal for Gaming, VFX, Tech & Digital Art.',
    primaryColor: '#38BDF8',
    secondaryColor: '#F59E0B',
    badgeText: 'OFFICIAL NOMINEE',
    bgStops: [
      { stop: 0, color: '#081c29' },
      { stop: 0.5, color: '#040e16' },
      { stop: 1, color: '#010508' },
    ],
    borderWidth: 12,
    drawDecorations: (ctx, w, h, S, color) => {
      // Chamfered corner accents
      ctx.strokeStyle = color;
      ctx.lineWidth = 3 * S;
      const len = 35 * S;
      // Top left
      ctx.beginPath();
      ctx.moveTo(35 * S, 35 * S + len);
      ctx.lineTo(35 * S, 35 * S);
      ctx.lineTo(35 * S + len, 35 * S);
      ctx.stroke();
      // Top right
      ctx.beginPath();
      ctx.moveTo(w - 35 * S - len, 35 * S);
      ctx.lineTo(w - 35 * S, 35 * S);
      ctx.lineTo(w - 35 * S, 35 * S + len);
      ctx.stroke();
    },
  },

  midnight_sapphire: {
    id: 'midnight_sapphire',
    name: 'Midnight Sapphire',
    description: 'Deep sapphire night sky with platinum gold trim. Ideal for News, Podcasting, Media & Documentaries.',
    primaryColor: '#60A5FA',
    secondaryColor: '#F1D38A',
    badgeText: 'OFFICIAL NOMINEE',
    bgStops: [
      { stop: 0, color: '#0b162e' },
      { stop: 0.5, color: '#050a17' },
      { stop: 1, color: '#020409' },
    ],
    borderWidth: 12,
    drawDecorations: (ctx, w, h, S, color) => {
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.4)';
      ctx.lineWidth = 2 * S;
      ctx.strokeRect(60 * S, 60 * S, w - 120 * S, h - 120 * S);
    },
  },
};

// ── Text helper with auto-wrapping & ellipsis ──────────────────────────────
export const wrapText = (ctx, text, maxWidth, maxLines = 2) => {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      if (lines.length === maxLines) break;
    } else {
      currentLine = candidate;
    }
  }
  if (lines.length < maxLines && currentLine) lines.push(currentLine);

  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = `${last.trimEnd()}…`;
  }
  return lines;
};

export const drawLines = (ctx, lines, centerX, startY, lineHeight) => {
  lines.forEach((line, index) => {
    ctx.fillText(line, centerX, startY + index * lineHeight);
  });
};

// ── Image loader with timeout and anonymous CORS ──────────────────────────
export const loadImage = (src, timeoutMs = 6000) =>
  new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';

    let timer = setTimeout(() => {
      resolve(null);
    }, timeoutMs);

    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });

// ── Nominee Monogram generator (when photo is missing) ─────────────────────
const drawMonogramAvatar = (ctx, cx, cy, radius, name, color, S) => {
  const grad = ctx.createRadialGradient(cx, cy, 20 * S, cx, cy, radius);
  grad.addColorStop(0, '#221929');
  grad.addColorStop(1, '#0c0710');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Subtle laurel ring inside
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 * S;
  ctx.stroke();

  // Trophy or Initials
  const initials = String(name || 'TI')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '🏆';

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${85 * S}px "Cinzel", Georgia, serif`;
  ctx.fillText(initials, cx, cy - 10 * S);

  ctx.font = `600 ${20 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText('OFFICIAL NOMINEE', cx, cy + 60 * S);
  ctx.textBaseline = 'alphabetic'; // Reset
};

// ── Sponsor section renderer ──────────────────────────────────────────────
const drawSponsorsSection = async (ctx, sponsors, cx, startY, maxWidth, S, primaryColor) => {
  if (!sponsors || !sponsors.length) {
    // 0 sponsors: render elegant event presenter footer
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = `${18 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
    ctx.fillText('Presented by Pracharam Media • The Voice of Telugu Digital Space', cx, startY + 22 * S);
    return;
  }

  // Pre-load sponsor logos
  const loadedSponsors = await Promise.all(
    sponsors.map(async (sp) => {
      const img = sp.logo_url ? await loadImage(getAssetUrl(sp.logo_url)) : null;
      return { ...sp, img };
    })
  );

  const count = loadedSponsors.length;
  ctx.textAlign = 'center';

  // Section Header Tag
  ctx.fillStyle = primaryColor;
  ctx.font = `bold ${17 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
  const headerText = count === 1
    ? (loadedSponsors[0].role || 'OFFICIAL CATEGORY PARTNER').toUpperCase()
    : 'OFFICIAL CATEGORY PARTNERS';
  ctx.fillText(headerText, cx, startY);

  const boxY = startY + 12 * S;
  const boxH = 92 * S;

  if (count === 1) {
    // 1 Sponsor: Centered card
    const sp = loadedSponsors[0];
    const cardW = Math.min(maxWidth * 0.75, 420 * S);
    const cardX = cx - cardW / 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
    ctx.lineWidth = 1.5 * S;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cardX, boxY, cardW, boxH, 12 * S);
    else ctx.rect(cardX, boxY, cardW, boxH);
    ctx.fill();
    ctx.stroke();

    if (sp.img) {
      // Draw logo with aspect ratio preserved
      const maxLogoW = 160 * S;
      const maxLogoH = 46 * S;
      const scale = Math.min(maxLogoW / sp.img.width, maxLogoH / sp.img.height);
      const dw = sp.img.width * scale;
      const dh = sp.img.height * scale;
      ctx.drawImage(sp.img, cx - dw / 2, boxY + 14 * S + (maxLogoH - dh) / 2, dw, dh);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `600 ${18 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
      ctx.fillText(sp.name, cx, boxY + 76 * S);
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${24 * S}px "Cinzel", Georgia, serif`;
      ctx.fillText(sp.name, cx, boxY + 44 * S);
      ctx.fillStyle = primaryColor;
      ctx.font = `600 ${16 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
      ctx.fillText(sp.role || 'Category Partner', cx, boxY + 72 * S);
    }
  } else if (count === 2) {
    // 2 Sponsors: Side by side
    const cardW = (maxWidth - 20 * S) / 2;
    loadedSponsors.forEach((sp, idx) => {
      const cardX = cx - maxWidth / 2 + idx * (cardW + 20 * S);
      const itemCx = cardX + cardW / 2;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
      ctx.lineWidth = 1.5 * S;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(cardX, boxY, cardW, boxH, 12 * S);
      else ctx.rect(cardX, boxY, cardW, boxH);
      ctx.fill();
      ctx.stroke();

      if (sp.img) {
        const maxLogoW = 130 * S;
        const maxLogoH = 40 * S;
        const scale = Math.min(maxLogoW / sp.img.width, maxLogoH / sp.img.height);
        const dw = sp.img.width * scale;
        const dh = sp.img.height * scale;
        ctx.drawImage(sp.img, itemCx - dw / 2, boxY + 12 * S + (maxLogoH - dh) / 2, dw, dh);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `600 ${16 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
        const lines = wrapText(ctx, sp.name, cardW - 20 * S, 1);
        drawLines(ctx, lines, itemCx, boxY + 74 * S, 20 * S);
      } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${19 * S}px "Cinzel", Georgia, serif`;
        const lines = wrapText(ctx, sp.name, cardW - 20 * S, 1);
        drawLines(ctx, lines, itemCx, boxY + 42 * S, 20 * S);

        ctx.fillStyle = primaryColor;
        ctx.font = `600 ${14 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
        ctx.fillText(sp.role || 'Partner', itemCx, boxY + 70 * S);
      }
    });
  } else {
    // 3 or more Sponsors: Evenly spaced grid strip
    const displayCount = Math.min(count, 4);
    const gap = 14 * S;
    const cardW = (maxWidth - gap * (displayCount - 1)) / displayCount;

    for (let idx = 0; idx < displayCount; idx++) {
      const sp = loadedSponsors[idx];
      const cardX = cx - maxWidth / 2 + idx * (cardW + gap);
      const itemCx = cardX + cardW / 2;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
      ctx.lineWidth = 1 * S;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(cardX, boxY, cardW, boxH, 10 * S);
      else ctx.rect(cardX, boxY, cardW, boxH);
      ctx.fill();
      ctx.stroke();

      if (sp.img) {
        const maxLogoW = cardW - 16 * S;
        const maxLogoH = 38 * S;
        const scale = Math.min(maxLogoW / sp.img.width, maxLogoH / sp.img.height);
        const dw = sp.img.width * scale;
        const dh = sp.img.height * scale;
        ctx.drawImage(sp.img, itemCx - dw / 2, boxY + 12 * S + (maxLogoH - dh) / 2, dw, dh);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `600 ${14 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
        const lines = wrapText(ctx, sp.name, cardW - 12 * S, 1);
        drawLines(ctx, lines, itemCx, boxY + 72 * S, 16 * S);
      } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${16 * S}px "Cinzel", Georgia, serif`;
        const lines = wrapText(ctx, sp.name, cardW - 12 * S, 1);
        drawLines(ctx, lines, itemCx, boxY + 42 * S, 18 * S);

        ctx.fillStyle = primaryColor;
        ctx.font = `600 ${13 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
        ctx.fillText(sp.role || 'Partner', itemCx, boxY + 70 * S);
      }
    }
  }
};

// ── Master Poster Renderer (4:5 Poster and 9:16 Story) ────────────────────
export const buildPoster = async (nominee, options = {}) => {
  const isStory = options.format === 'story';
  const width = isStory ? STORY_WIDTH : POSTER_WIDTH;
  const height = isStory ? STORY_HEIGHT : POSTER_HEIGHT;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const S = width / 1080;
  const cx = width / 2;

  // Resolve Category Template
  const templateKey = options.category?.poster_template || nominee.poster_template || 'gold_prestige';
  const template = POSTER_TEMPLATES[templateKey] || POSTER_TEMPLATES.gold_prestige;
  const primaryColor = options.category?.poster_theme_color || nominee.poster_theme_color || template.primaryColor;
  const secondaryColor = template.secondaryColor || '#FFDF73';
  const badgeText = options.category?.poster_badge_text || nominee.poster_badge_text || template.badgeText || 'OFFICIAL NOMINEE';
  const categoryName = (options.category?.name || nominee.category_name || 'CREATOR OF THE YEAR').toUpperCase();
  const sponsors = options.sponsors || [];

  // Pre-load images
  const photoUrl = nominee.photo_url ? getAssetUrl(nominee.photo_url) : null;
  const [photo, logoImg] = await Promise.all([
    loadImage(photoUrl),
    loadImage('/brand/logo-md.jpg').then((res) => res || loadImage('/logo.png')),
  ]);

  // 1. Background Gradient
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  template.bgStops.forEach(({ stop, color }) => bg.addColorStop(stop, color));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // 2. Theme Specific Decorative Background Layer
  if (template.drawDecorations) {
    template.drawDecorations(ctx, width, height, S, primaryColor);
  }

  // 3. Dual Framing Borders
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = (template.borderWidth || 14) * S;
  ctx.strokeRect(40 * S, 40 * S, width - 80 * S, height - 80 * S);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2 * S;
  ctx.strokeRect(55 * S, 55 * S, width - 110 * S, height - 110 * S);

  ctx.textAlign = 'center';

  // 4. Header: Logo & Event Title
  const headerY = isStory ? 120 * S : 100 * S;
  if (logoImg) {
    const maxLogoW = 100 * S;
    const maxLogoH = 75 * S;
    const scale = Math.min(maxLogoW / logoImg.width, maxLogoH / logoImg.height);
    const dw = logoImg.width * scale;
    const dh = logoImg.height * scale;
    ctx.drawImage(logoImg, cx - dw / 2, headerY - 20 * S, dw, dh);

    ctx.fillStyle = primaryColor;
    ctx.font = `bold ${28 * S}px "Cinzel", Georgia, serif`;
    ctx.fillText('TELUGU ICON AWARDS 2026', cx, headerY + dh + 15 * S);
  } else {
    ctx.fillStyle = primaryColor;
    ctx.font = `bold ${30 * S}px "Cinzel", Georgia, serif`;
    drawLines(ctx, wrapText(ctx, EVENT.toUpperCase(), width - 180 * S, 2), cx, headerY + 15 * S, 36 * S);
  }

  // Badge Text ("OFFICIAL NOMINEE")
  const badgeY = isStory ? 245 * S : 210 * S;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `600 ${21 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.letterSpacing = `${4 * S}px`;
  ctx.fillText(badgeText.toUpperCase().split('').join(' '), cx, badgeY);
  ctx.letterSpacing = '0px';

  // 5. Nominee Photo in Ring Frame
  const ringRadius = isStory ? 230 * S : 215 * S;
  const ringY = isStory ? 520 * S : 465 * S;

  if (photo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, ringY, ringRadius, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#1c1c1c';
    ctx.fillRect(cx - ringRadius, ringY - ringRadius, ringRadius * 2, ringRadius * 2);
    const side = Math.min(photo.width, photo.height);
    ctx.drawImage(
      photo,
      (photo.width - side) / 2,
      (photo.height - side) / 2,
      side,
      side,
      cx - ringRadius,
      ringY - ringRadius,
      ringRadius * 2,
      ringRadius * 2
    );
    ctx.restore();
  } else {
    drawMonogramAvatar(ctx, cx, ringY, ringRadius, nominee.full_name, primaryColor, S);
  }

  // Outer Gold Framing Ring
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 7 * S;
  ctx.beginPath();
  ctx.arc(cx, ringY, ringRadius + 4 * S, 0, Math.PI * 2);
  ctx.stroke();

  // 6. Nominee Full Name (Auto-scales for long names)
  const nameY = isStory ? 805 * S : 725 * S;
  const fullName = String(nominee.full_name || 'Creator Name').trim();
  const nameSize = fullName.length > 25 ? 42 * S : fullName.length > 18 ? 48 * S : 54 * S;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${nameSize}px "Cinzel", Georgia, serif`;
  const nameLines = wrapText(ctx, fullName, width - 200 * S, 2);
  drawLines(ctx, nameLines, cx, nameY, nameSize * 1.15);

  // Social Handle
  const handleY = nameY + nameLines.length * nameSize * 1.15 - 5 * S;
  if (nominee.social_handle) {
    ctx.fillStyle = secondaryColor;
    ctx.font = `600 ${22 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
    const cleanHandle = nominee.social_handle.startsWith('@') || nominee.social_handle.startsWith('http')
      ? nominee.social_handle
      : `@${nominee.social_handle}`;
    ctx.fillText(cleanHandle, cx, handleY + 12 * S);
  }

  // 7. Category Badge Plaque
  const boxY = handleY + (nominee.social_handle ? 34 * S : 18 * S);
  const boxH = 76 * S;
  const boxW = width - 260 * S;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 2 * S;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(130 * S, boxY, boxW, boxH, 18 * S);
  else ctx.rect(130 * S, boxY, boxW, boxH);
  ctx.fill();
  ctx.stroke();

  // Category Name inside Badge
  const catFontSize = categoryName.length > 36 ? 20 * S : categoryName.length > 26 ? 23 * S : 26 * S;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${catFontSize}px "Plus Jakarta Sans", Arial, sans-serif`;
  const catLines = wrapText(ctx, `NOMINATED FOR: ${categoryName}`, boxW - 40 * S, 1);
  drawLines(ctx, catLines, cx, boxY + 47 * S, 28 * S);

  // Nominee Code Pill
  const codeY = boxY + boxH + 34 * S;
  ctx.fillStyle = primaryColor;
  ctx.font = `700 ${21 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText(`Nominee Code: ${nominee.nominee_code || 'TIC26'}`, cx, codeY);

  // 8. Category-Wise Sponsors Section
  const sponsorSectionY = codeY + 22 * S;
  await drawSponsorsSection(ctx, sponsors, cx, sponsorSectionY, width - 200 * S, S, primaryColor);

  // 9. QR Code & Voting CTA
  const ctaY = isStory ? height - 390 * S : height - 340 * S;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${34 * S}px "Cinzel", Georgia, serif`;
  ctx.fillText('V O T E   N O W', cx, ctaY);

  const qrSize = isStory ? 200 * S : 180 * S;
  const qrTop = ctaY + 16 * S;

  if (options.qrImage) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - qrSize / 2 - 8 * S, qrTop, qrSize + 16 * S, qrSize + 16 * S);
    ctx.drawImage(options.qrImage, cx - qrSize / 2, qrTop + 8 * S, qrSize, qrSize);
  }

  // Scan instruction & canonical short URL
  const qrLabelY = qrTop + qrSize + 36 * S;
  ctx.fillStyle = primaryColor;
  ctx.font = `bold ${21 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText('SCAN QR TO VOTE', cx, qrLabelY);

  const shortUrl = nomineeUrl(nominee).replace(/^https?:\/\//, '');
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = `600 ${20 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
  const urlLines = wrapText(ctx, shortUrl, width - 160 * S, 1);
  drawLines(ctx, urlLines, cx, qrLabelY + 28 * S, 24 * S);

  // 10. Footer Details
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = `${16 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText('100% Verified OTP Public Voting • Telugu Icon Digital & Influencer Awards 2026', cx, height - 58 * S);
  ctx.fillText('16 November 2026 • Shilpakala Vedika, Hyderabad • teluguiconawards.in', cx, height - 34 * S);

  return canvas;
};

// ── ZIP Campaign Kit Builder ──────────────────────────────────────────────
export const buildCampaignKitZip = async ({
  nominee,
  category,
  sponsors = [],
  posterCanvas,
  storyCanvas,
  qrDataUrl,
}) => {
  const zip = new JSZip();
  const slug = nominee.slug || `nominee-${nominee.id}`;
  const code = nominee.nominee_code || 'TIC26';
  const prefix = `Telugu-Icon-Awards-2026-${code}-${slug}`;

  // 1. Personalized Poster PNG (4:5)
  if (posterCanvas) {
    const posterBlob = await new Promise((resolve) => posterCanvas.toBlob(resolve, 'image/png'));
    zip.file(`${prefix}-Official-Poster-4x5.png`, posterBlob);
  }

  // 2. Personalized Story PNG (9:16)
  if (storyCanvas) {
    const storyBlob = await new Promise((resolve) => storyCanvas.toBlob(resolve, 'image/png'));
    zip.file(`${prefix}-Instagram-Story-9x16.png`, storyBlob);
  }

  // 3. High-Res QR Code PNG
  if (qrDataUrl) {
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    zip.file(`${prefix}-Voting-QR.png`, base64Data, { base64: true });
  }

  // 4. Campaign Guide & Ready-to-Post Copy (TXT)
  const fullNominee = {
    ...nominee,
    category_name: category?.name || nominee.category_name,
  };
  const guideText = generateCampaignGuideText(fullNominee, category, sponsors);
  zip.file(`${prefix}-Campaign-Guide-And-Captions.txt`, guideText);

  // Generate ZIP Blob
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return {
    blob: zipBlob,
    filename: `${prefix}-Campaign-Kit.zip`,
  };
};

// ── Plain text campaign guide content ─────────────────────────────────────
const generateCampaignGuideText = (nominee, category, sponsors) => {
  const voteLink = voteUrl(nominee);
  const pageLink = nomineeUrl(nominee);
  const categoryTitle = category?.name || nominee.category_name || 'Creator';

  let sponsorInfo = 'Event Partner: Pracharam Media';
  if (sponsors && sponsors.length > 0) {
    sponsorInfo = sponsors.map((s) => `${s.role || 'Partner'}: ${s.name}`).join('\n');
  }

  return `========================================================================
TELUGU ICON DIGITAL & INFLUENCER AWARDS 2026
OFFICIAL CREATOR CAMPAIGN KIT
========================================================================

NOMINEE PROFILE:
Nominee Name:  ${nominee.full_name}
Nominee Code:  ${nominee.nominee_code || 'TIC26'}
Category:      ${categoryTitle}
Public Page:   ${pageLink}
Voting Link:   ${voteLink}

CATEGORY SPONSORS:
${sponsorInfo}

EVENT DETAILS:
Event:  Telugu Icon Digital & Influencer Awards 2026
Date:   16 November 2026
Venue:  Shilpakala Vedika, Hyderabad
Voting: 100% Public, Mobile OTP Verified (Anti-Bot Protected)

------------------------------------------------------------------------
READY-TO-POST SOCIAL MEDIA CAPTIONS
------------------------------------------------------------------------

[1] WHATSAPP BROADCAST MESSAGE:
🏆 Hey everyone! I'm thrilled to announce that I've been nominated for "${categoryTitle}" at the ${EVENT}!

Please take 30 seconds to support me and cast your OTP-verified vote:
👉 ${voteLink}

Nominee Code: ${nominee.nominee_code || 'TIC26'}
Thank you for believing in me! 🙏✨ ${EVENT_HASHTAGS}

------------------------------------------------------------------------

[2] INSTAGRAM POST CAPTION:
Humbled and honoured to be nominated for "${categoryTitle}" at the ${EVENT}! 🏆✨

Voting is 100% public, verified by mobile OTP. Please tap the link in my bio or scan my official poster QR to vote for me!

Vote here 👉 ${voteLink}
Nominee Code: ${nominee.nominee_code || 'TIC26'}

${EVENT_HASHTAGS} #TeluguCreators #TeluguInfluencers #VoteForMe

------------------------------------------------------------------------

[3] INSTAGRAM STORY / REEL CAPTION:
${nominee.full_name} — Official Nominee for ${categoryTitle}!
Scan the QR code or tap the link sticker to cast your vote!
👉 ${voteLink}
${EVENT_HASHTAGS}

------------------------------------------------------------------------
IMPORTANT CREATOR GUIDELINES:
- Share only your official page, voting link, and verified QR code.
- Every vote requires a real mobile OTP.
- Purchasing bot votes, using VPN scripts, or offering monetary incentives in exchange for votes is monitored by our anti-fraud auditor and will result in immediate disqualification.
========================================================================
`;
};
