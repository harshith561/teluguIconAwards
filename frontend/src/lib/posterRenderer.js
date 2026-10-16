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
      { stop: 0, color: '#161109' },
      { stop: 0.4, color: '#0d0905' },
      { stop: 1, color: '#040302' },
    ],
    borderWidth: 2,
    drawDecorations: (ctx, w, h, S, color) => {
      // Corner ornamental luxury brackets
      const inset = 36 * S;
      const len = 28 * S;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 * S;

      // Top Left
      ctx.beginPath();
      ctx.moveTo(inset, inset + len);
      ctx.lineTo(inset, inset);
      ctx.lineTo(inset + len, inset);
      ctx.stroke();

      // Top Right
      ctx.beginPath();
      ctx.moveTo(w - inset - len, inset);
      ctx.lineTo(w - inset, inset);
      ctx.lineTo(w - inset, inset + len);
      ctx.stroke();

      // Bottom Left
      ctx.beginPath();
      ctx.moveTo(inset, h - inset - len);
      ctx.lineTo(inset, h - inset);
      ctx.lineTo(inset + len, h - inset);
      ctx.stroke();

      // Bottom Right
      ctx.beginPath();
      ctx.moveTo(w - inset - len, h - inset);
      ctx.lineTo(w - inset, h - inset);
      ctx.lineTo(w - inset, h - inset - len);
      ctx.stroke();

      // Corner accent pips
      ctx.fillStyle = color;
      const pip = 3 * S;
      [
        [inset, inset],
        [w - inset, inset],
        [inset, h - inset],
        [w - inset, h - inset],
      ].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, pip, 0, Math.PI * 2);
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
      { stop: 0, color: '#1a0b26' },
      { stop: 0.45, color: '#0e0414' },
      { stop: 1, color: '#040107' },
    ],
    borderWidth: 2,
    drawDecorations: (ctx, w, h, S, color) => {
      const radGlow = ctx.createRadialGradient(w / 2, 420 * S, 60 * S, w / 2, 420 * S, 360 * S);
      radGlow.addColorStop(0, 'rgba(192, 132, 252, 0.16)');
      radGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = radGlow;
      ctx.fillRect(0, 160 * S, w, 560 * S);
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
      { stop: 0, color: '#051f16' },
      { stop: 0.45, color: '#02120d' },
      { stop: 1, color: '#010604' },
    ],
    borderWidth: 2,
    drawDecorations: (ctx, w, h, S, color) => {
      const radGlow = ctx.createRadialGradient(w / 2, 420 * S, 60 * S, w / 2, 420 * S, 360 * S);
      radGlow.addColorStop(0, 'rgba(16, 185, 129, 0.16)');
      radGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = radGlow;
      ctx.fillRect(0, 160 * S, w, 560 * S);
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
      { stop: 0, color: '#240611' },
      { stop: 0.45, color: '#120208' },
      { stop: 1, color: '#050103' },
    ],
    borderWidth: 2,
    drawDecorations: (ctx, w, h, S, color) => {
      const radGlow = ctx.createRadialGradient(w / 2, 420 * S, 60 * S, w / 2, 420 * S, 360 * S);
      radGlow.addColorStop(0, 'rgba(244, 63, 94, 0.16)');
      radGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = radGlow;
      ctx.fillRect(0, 160 * S, w, 560 * S);
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
      { stop: 0, color: '#061722' },
      { stop: 0.45, color: '#030c12' },
      { stop: 1, color: '#010406' },
    ],
    borderWidth: 2,
    drawDecorations: (ctx, w, h, S, color) => {
      const radGlow = ctx.createRadialGradient(w / 2, 420 * S, 60 * S, w / 2, 420 * S, 360 * S);
      radGlow.addColorStop(0, 'rgba(56, 189, 248, 0.16)');
      radGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = radGlow;
      ctx.fillRect(0, 160 * S, w, 560 * S);
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
      { stop: 0, color: '#081226' },
      { stop: 0.45, color: '#040814' },
      { stop: 1, color: '#010308' },
    ],
    borderWidth: 2,
    drawDecorations: (ctx, w, h, S, color) => {
      const radGlow = ctx.createRadialGradient(w / 2, 420 * S, 60 * S, w / 2, 420 * S, 360 * S);
      radGlow.addColorStop(0, 'rgba(96, 165, 250, 0.16)');
      radGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = radGlow;
      ctx.fillRect(0, 160 * S, w, 560 * S);
    },
  },
};

// ── Rounded Rectangle Helper (Cross-browser Canvas Polyfill) ───────────────
export const drawRoundedRect = (ctx, x, y, width, height, radius) => {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }
  ctx.closePath();
};

// ── Robust Text Helper for General Lines ──────────────────────────────────
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
  return lines;
};

export const drawLines = (ctx, lines, centerX, startY, lineHeight) => {
  lines.forEach((line, index) => {
    ctx.fillText(line, centerX, startY + index * lineHeight);
  });
};

// ── Nominee Full Name: Complete, Untruncated, Dynamic Layout Engine ────────
// Critical Requirement 2:
// - Always displays the COMPLETE, UNTRUNCATED full name from nominee data.
// - Never cuts off or adds ellipsis ('...').
// - Dynamically adjusts font size and allows natural wrapping (up to 3 balanced lines).
// - Supports Telugu script and English.
export const fitNomineeName = (ctx, fullName, maxWidth, S) => {
  const name = String(fullName || 'Creator Name').trim();
  const words = name.split(/\s+/).filter(Boolean);
  if (!words.length) {
    return { lines: ['Creator Name'], fontSize: 44 * S, lineHeight: 52 * S, totalHeight: 52 * S };
  }

  // Target font sizes from large (48px) down to minimum readable (28px)
  const fontSizesToTry = [
    48 * S, 44 * S, 40 * S, 36 * S, 33 * S, 30 * S, 28 * S
  ];

  for (const fontSize of fontSizesToTry) {
    ctx.font = `bold ${fontSize}px "Cinzel", "Noto Sans Telugu", "Gautami", Georgia, serif`;
    const singleWidth = ctx.measureText(name).width;

    // Fits comfortably in 1 line
    if (singleWidth <= maxWidth) {
      return {
        lines: [name],
        fontSize,
        lineHeight: fontSize * 1.18,
        totalHeight: fontSize * 1.18,
      };
    }

    // Attempt 2-line balanced wrap
    const lines = [];
    let cur = '';
    for (const w of words) {
      const candidate = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(candidate).width > maxWidth && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = candidate;
      }
    }
    if (cur) lines.push(cur);

    if (lines.length <= 2 && lines.every((l) => ctx.measureText(l).width <= maxWidth)) {
      return {
        lines,
        fontSize,
        lineHeight: fontSize * 1.16,
        totalHeight: lines.length * fontSize * 1.16,
      };
    }

    // Attempt 3-line balanced wrap for long official/company/multi-word names
    if (lines.length <= 3 && lines.every((l) => ctx.measureText(l).width <= maxWidth)) {
      return {
        lines,
        fontSize,
        lineHeight: fontSize * 1.14,
        totalHeight: lines.length * fontSize * 1.14,
      };
    }
  }

  // Fallback at minimum font size: distribute into lines without truncation
  const minFont = 26 * S;
  ctx.font = `bold ${minFont}px "Cinzel", "Noto Sans Telugu", "Gautami", Georgia, serif`;
  const fallbackLines = [];
  let curLine = '';
  for (const w of words) {
    const candidate = curLine ? `${curLine} ${w}` : w;
    if (ctx.measureText(candidate).width > maxWidth && curLine) {
      fallbackLines.push(curLine);
      curLine = w;
    } else {
      curLine = candidate;
    }
  }
  if (curLine) fallbackLines.push(curLine);

  return {
    lines: fallbackLines,
    fontSize: minFont,
    lineHeight: minFont * 1.15,
    totalHeight: fallbackLines.length * minFont * 1.15,
  };
};

// ── Category Text: Complete, Untruncated Plaque Wrapping ───────────────────
export const fitCategoryText = (ctx, categoryName, maxWidth, S) => {
  const cat = String(categoryName || 'CREATOR OF THE YEAR').trim().toUpperCase();
  const words = cat.split(/\s+/).filter(Boolean);

  const fontSizes = [23 * S, 20 * S, 18 * S, 16 * S];
  for (const fontSize of fontSizes) {
    ctx.font = `bold ${fontSize}px "Plus Jakarta Sans", Arial, sans-serif`;
    if (ctx.measureText(cat).width <= maxWidth) {
      return { lines: [cat], fontSize, lineHeight: fontSize * 1.25, totalHeight: fontSize * 1.25 };
    }

    // Try 2 lines
    const lines = [];
    let cur = '';
    for (const w of words) {
      const candidate = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(candidate).width > maxWidth && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = candidate;
      }
    }
    if (cur) lines.push(cur);

    if (lines.length <= 2 && lines.every((l) => ctx.measureText(l).width <= maxWidth)) {
      return { lines, fontSize, lineHeight: fontSize * 1.22, totalHeight: lines.length * fontSize * 1.22 };
    }
  }

  // Fallback 15px multi-line
  const minFont = 15 * S;
  ctx.font = `bold ${minFont}px "Plus Jakarta Sans", Arial, sans-serif`;
  const fallbackLines = [];
  let cur = '';
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(candidate).width > maxWidth && cur) {
      fallbackLines.push(cur);
      cur = w;
    } else {
      cur = candidate;
    }
  }
  if (cur) fallbackLines.push(cur);

  return {
    lines: fallbackLines,
    fontSize: minFont,
    lineHeight: minFont * 1.2,
    totalHeight: fallbackLines.length * minFont * 1.2,
  };
};

// ── Dynamic Tag Layout: Automatic Multi-Row Pill Arrangement ──────────────
// Requirement 4: Neatly arranges handle, nominee code, platforms, and approved hashtags.
export const drawDynamicTags = (ctx, tags, cx, startY, maxWidth, S, primaryColor) => {
  const validTags = (tags || []).filter((t) => typeof t === 'string' && t.trim().length > 0);
  if (!validTags.length) return startY;

  ctx.font = `600 ${12.5 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
  const pillPaddingH = 14 * S;
  const pillHeight = 26 * S;
  const pillGap = 8 * S;
  const rowGap = 7 * S;

  // Measure pills
  const measured = validTags.map((tag) => {
    const textW = ctx.measureText(tag).width;
    return {
      text: tag,
      width: textW + pillPaddingH * 2,
    };
  });

  // Group into balanced rows that fit within maxWidth
  const rows = [];
  let currentRow = [];
  let currentRowWidth = 0;

  for (const item of measured) {
    const projectedWidth = currentRow.length === 0
      ? item.width
      : currentRowWidth + pillGap + item.width;

    if (projectedWidth <= maxWidth) {
      currentRow.push(item);
      currentRowWidth = projectedWidth;
    } else {
      if (currentRow.length) rows.push({ items: currentRow, totalWidth: currentRowWidth });
      currentRow = [item];
      currentRowWidth = item.width;
    }
  }
  if (currentRow.length) rows.push({ items: currentRow, totalWidth: currentRowWidth });

  // Render rows
  let curY = startY;
  for (const row of rows) {
    let startX = cx - row.totalWidth / 2;

    for (const item of row.items) {
      // Pill Background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
      ctx.lineWidth = 1 * S;
      drawRoundedRect(ctx, startX, curY, item.width, pillHeight, pillHeight / 2);
      ctx.fill();
      ctx.stroke();

      // Pill Text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 ${12.5 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
      ctx.fillText(item.text, startX + item.width / 2, curY + pillHeight / 2);
      ctx.textBaseline = 'alphabetic'; // Reset

      startX += item.width + pillGap;
    }
    curY += pillHeight + rowGap;
  }

  return curY;
};

// ── Vector Golden Trophy Cup Drawer (Guaranteed crisp fallback image) ──────
export const drawTrophyCup = (ctx, x, y, w, h, primaryColor = '#D4AF37') => {
  ctx.save();
  ctx.translate(x, y);
  const scaleX = w / 100;
  const scaleY = h / 100;
  ctx.scale(scaleX, scaleY);

  // 1. Soft gold radial glow
  const glow = ctx.createRadialGradient(50, 45, 10, 50, 45, 45);
  glow.addColorStop(0, 'rgba(255, 223, 115, 0.35)');
  glow.addColorStop(1, 'rgba(212, 175, 55, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(50, 45, 45, 0, Math.PI * 2);
  ctx.fill();

  // 2. Gold Linear Gradients
  const goldGrad = ctx.createLinearGradient(20, 20, 80, 80);
  goldGrad.addColorStop(0, '#FFF5BA');
  goldGrad.addColorStop(0.35, '#FCD34D');
  goldGrad.addColorStop(0.7, primaryColor || '#D4AF37');
  goldGrad.addColorStop(1, '#8A6412');

  const stemGrad = ctx.createLinearGradient(40, 58, 60, 58);
  stemGrad.addColorStop(0, '#8A6412');
  stemGrad.addColorStop(0.5, '#FFF5BA');
  stemGrad.addColorStop(1, '#8A6412');

  const darkGold = '#5A4109';

  // 3. Cup Handles (Left and Right ornate arches)
  ctx.fillStyle = goldGrad;
  // Left Handle
  ctx.beginPath();
  ctx.moveTo(28, 26);
  ctx.bezierCurveTo(12, 26, 10, 50, 27, 53);
  ctx.bezierCurveTo(30, 54, 32, 50, 30, 47);
  ctx.bezierCurveTo(21, 44, 22, 33, 29, 32);
  ctx.closePath();
  ctx.fill();

  // Right Handle
  ctx.beginPath();
  ctx.moveTo(72, 26);
  ctx.bezierCurveTo(88, 26, 90, 50, 73, 53);
  ctx.bezierCurveTo(70, 54, 68, 50, 70, 47);
  ctx.bezierCurveTo(79, 44, 78, 33, 71, 32);
  ctx.closePath();
  ctx.fill();

  // 4. Cup Chalice Body
  ctx.fillStyle = goldGrad;
  ctx.beginPath();
  ctx.moveTo(28, 22);
  ctx.lineTo(72, 22);
  ctx.bezierCurveTo(72, 48, 57, 58, 53, 59);
  ctx.bezierCurveTo(47, 59, 28, 48, 28, 22);
  ctx.closePath();
  ctx.fill();

  // Cup Rim
  ctx.fillStyle = '#FFF5BA';
  ctx.beginPath();
  ctx.ellipse(50, 22, 22, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = darkGold;
  ctx.beginPath();
  ctx.ellipse(50, 22, 18.5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 5. Star Emblem Embossed on Chalice Front
  ctx.fillStyle = '#FFFDF0';
  ctx.beginPath();
  const starPts = [
    [50, 31], [52.2, 36.8], [58.5, 37], [53.5, 41],
    [55.4, 47], [50, 43.4], [44.6, 47], [46.5, 41],
    [41.5, 37], [47.8, 36.8]
  ];
  ctx.moveTo(starPts[0][0], starPts[0][1]);
  for (let i = 1; i < starPts.length; i++) {
    ctx.lineTo(starPts[i][0], starPts[i][1]);
  }
  ctx.closePath();
  ctx.fill();

  // 6. Stem & Node
  ctx.fillStyle = stemGrad;
  ctx.beginPath();
  ctx.moveTo(46, 58);
  ctx.lineTo(54, 58);
  ctx.lineTo(53, 71);
  ctx.lineTo(47, 71);
  ctx.closePath();
  ctx.fill();

  // Sphere node on stem
  ctx.fillStyle = goldGrad;
  ctx.beginPath();
  ctx.arc(50, 64, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // 7. Stepped Pedestal Base
  ctx.fillStyle = goldGrad;
  ctx.beginPath();
  ctx.moveTo(41, 71);
  ctx.lineTo(59, 71);
  ctx.lineTo(62, 76);
  ctx.lineTo(38, 76);
  ctx.closePath();
  ctx.fill();

  // Base tier 1
  drawRoundedRect(ctx, 33, 76, 34, 7, 2);
  ctx.fill();

  // Base tier 2
  ctx.fillStyle = darkGold;
  drawRoundedRect(ctx, 30, 83, 40, 4.5, 1.5);
  ctx.fill();

  // 8. Diamond Sparkle on top-right rim
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(68, 18);
  ctx.lineTo(70, 12);
  ctx.lineTo(72, 18);
  ctx.lineTo(78, 20);
  ctx.lineTo(72, 22);
  ctx.lineTo(70, 28);
  ctx.lineTo(68, 22);
  ctx.lineTo(62, 20);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
};

// ── Multi-Stage Image Loader (CORS anonymous -> direct -> proxy) ──────────
export const loadImage = (src, timeoutMs = 6000) => {
  if (!src) return Promise.resolve(null);

  const tryLoad = (url, useCors) =>
    new Promise((resolve) => {
      const img = new Image();
      if (useCors) {
        img.crossOrigin = 'anonymous';
      }
      let timer = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
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
      img.src = url;
    });

  // Stage 1: Anonymous CORS
  return tryLoad(src, true).then((img) => {
    if (img) return img;
    // Stage 2: Direct non-CORS fallback
    return tryLoad(src, false).then((nonCorsImg) => {
      if (nonCorsImg) return nonCorsImg;
      // Stage 3: Proxy fallback for external URLs
      if (typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://'))) {
        const proxied = `/api/proxy-image?url=${encodeURIComponent(src)}`;
        return tryLoad(proxied, true);
      }
      return null;
    });
  });
};

// ── Nominee Monogram Avatar (When photo is missing) ────────────────────────
const drawMonogramAvatar = (ctx, cx, cy, radius, name, color, S) => {
  const grad = ctx.createRadialGradient(cx, cy, 20 * S, cx, cy, radius);
  grad.addColorStop(0, '#261b11');
  grad.addColorStop(0.6, '#17100b');
  grad.addColorStop(1, '#080503');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Outer laurel frame inside ring
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5 * S;
  ctx.stroke();

  // Draw majestic golden trophy cup in avatar center
  const cupSize = radius * 1.05;
  drawTrophyCup(ctx, cx - cupSize / 2, cy - cupSize / 2 - 10 * S, cupSize, cupSize, color);

  // Nominee Initials
  const initials = String(name || 'TI')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'TI';

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${22 * S}px "Cinzel", Georgia, serif`;
  ctx.fillText(initials, cx, cy + radius * 0.58);
  ctx.textBaseline = 'alphabetic'; // Reset
};

// ── Category Sponsors Section (Always Guaranteed Logo or Trophy Cup Image) ─
const drawSponsorsSection = async (ctx, sponsors, cx, startY, maxWidth, S, primaryColor) => {
  ctx.textAlign = 'center';

  const count = sponsors && sponsors.length ? sponsors.length : 0;

  // 1. Prominent Section Header
  ctx.fillStyle = primaryColor;
  ctx.font = `bold ${12.5 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.letterSpacing = `${3 * S}px`;
  const headerText = count > 1
    ? `OFFICIAL CATEGORY PARTNERS`
    : count === 1
    ? (sponsors[0].role || 'CATEGORY PARTNER').toUpperCase()
    : 'OFFICIAL CATEGORY PARTNER';
  ctx.fillText(headerText, cx, startY);
  ctx.letterSpacing = '0px';

  const boxY = startY + 12 * S;
  const boxH = 74 * S;

  if (count === 0) {
    // Default Official Presenter Plaque - Clean Centered Typographic (No image or cup)
    const cardW = Math.min(maxWidth * 0.88, 480 * S);
    const cardX = cx - cardW / 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 1.2 * S;
    drawRoundedRect(ctx, cardX, boxY, cardW, boxH, 14 * S);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${16 * S}px "Cinzel", Georgia, serif`;
    ctx.fillText('TELUGU ICON AWARDS 2026', cx, boxY + 31 * S);

    ctx.fillStyle = primaryColor;
    ctx.font = `600 ${11.5 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
    ctx.fillText('Official Presenter • Telugu Digital Space', cx, boxY + 51 * S);

    return boxY + boxH + 10 * S;
  }

  // Pre-load sponsor logos if valid image URLs exist
  const loadedSponsors = await Promise.all(
    sponsors.map(async (sp) => {
      const url = sp.logo_url ? getAssetUrl(sp.logo_url) : null;
      const img = url ? await loadImage(url) : null;
      return { ...sp, img };
    })
  );

  if (count === 1) {
    const sp = loadedSponsors[0];
    const cardW = Math.min(maxWidth * 0.88, 500 * S);
    const cardX = cx - cardW / 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 1.3 * S;
    drawRoundedRect(ctx, cardX, boxY, cardW, boxH, 14 * S);
    ctx.fill();
    ctx.stroke();

    if (sp.img) {
      // If a real uploaded sponsor logo exists, display logo on left and text on right
      const imgBoxX = cardX + 14 * S;
      const imgBoxY = boxY + 10 * S;
      const imgBoxW = 86 * S;
      const imgBoxH = 54 * S;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
      ctx.lineWidth = 1 * S;
      drawRoundedRect(ctx, imgBoxX, imgBoxY, imgBoxW, imgBoxH, 10 * S);
      ctx.fill();
      ctx.stroke();

      const maxLogoW = imgBoxW - 12 * S;
      const maxLogoH = imgBoxH - 12 * S;
      const scale = Math.min(maxLogoW / sp.img.width, maxLogoH / sp.img.height);
      const dw = sp.img.width * scale;
      const dh = sp.img.height * scale;
      ctx.drawImage(
        sp.img,
        imgBoxX + (imgBoxW - dw) / 2,
        imgBoxY + (imgBoxH - dh) / 2,
        dw,
        dh
      );

      const textX = imgBoxX + imgBoxW + 16 * S;
      ctx.textAlign = 'left';

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${17 * S}px "Cinzel", "Plus Jakarta Sans", Georgia, serif`;
      const cleanName = String(sp.name || 'Category Sponsor').trim();
      ctx.fillText(cleanName, textX, boxY + 28 * S);

      ctx.fillStyle = primaryColor;
      ctx.font = `700 ${11.5 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
      const roleText = (sp.role || 'Category Partner').toUpperCase();
      ctx.fillText(roleText, textX, boxY + 46 * S);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = `500 ${10.5 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
      const subText = sp.tagline || (sp.tier ? `Official ${sp.tier.replace(/_/g, ' ')} partner` : 'Official Telugu Icon Category Sponsor');
      ctx.fillText(subText, textX, boxY + 61 * S);
      ctx.textAlign = 'center';
    } else {
      // NO IMAGE / NO CUP: User requested clean typographic mention without any image or trophy cup
      ctx.textAlign = 'center';

      // Line 1: Sponsor Name
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${18 * S}px "Cinzel", "Plus Jakarta Sans", Georgia, serif`;
      const cleanName = String(sp.name || 'Category Sponsor').trim();
      ctx.fillText(cleanName, cx, boxY + 27 * S);

      // Line 2: Role
      ctx.fillStyle = primaryColor;
      ctx.font = `700 ${11.5 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
      ctx.letterSpacing = `${1.5 * S}px`;
      const roleText = (sp.role || 'Category Partner').toUpperCase();
      ctx.fillText(roleText, cx, boxY + 45 * S);
      ctx.letterSpacing = '0px';

      // Line 3: Tagline or official tier
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.font = `500 ${10.5 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
      const subText = sp.tagline || (sp.tier ? `Official ${sp.tier.replace(/_/g, ' ')} partner` : 'Official Telugu Icon Category Sponsor');
      ctx.fillText(subText, cx, boxY + 61 * S);
    }
  } else {
    // 2 or 3 sponsors in a row
    const displayCount = Math.min(count, 3);
    const gap = 12 * S;
    const multiCardH = 76 * S;
    const cardW = (Math.min(maxWidth, 580 * S) - gap * (displayCount - 1)) / displayCount;

    for (let idx = 0; idx < displayCount; idx++) {
      const sp = loadedSponsors[idx];
      const cardX = cx - (displayCount * cardW + (displayCount - 1) * gap) / 2 + idx * (cardW + gap);
      const itemCx = cardX + cardW / 2;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.32)';
      ctx.lineWidth = 1 * S;
      drawRoundedRect(ctx, cardX, boxY, cardW, multiCardH, 12 * S);
      ctx.fill();
      ctx.stroke();

      if (sp.img) {
        const imgH = 32 * S;
        const imgTop = boxY + 8 * S;
        const maxLogoW = cardW - 20 * S;
        const scale = Math.min(maxLogoW / sp.img.width, imgH / sp.img.height);
        const dw = sp.img.width * scale;
        const dh = sp.img.height * scale;
        ctx.drawImage(sp.img, itemCx - dw / 2, imgTop + (imgH - dh) / 2, dw, dh);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${12 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
        ctx.fillText(sp.name, itemCx, boxY + 50 * S);

        ctx.fillStyle = primaryColor;
        ctx.font = `600 ${10 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
        ctx.fillText(sp.role || 'Partner', itemCx, boxY + 65 * S);
      } else {
        // No cup: clean centered typographic plaque
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${13 * S}px "Cinzel", "Plus Jakarta Sans", Arial, sans-serif`;
        ctx.fillText(sp.name, itemCx, boxY + 30 * S);

        ctx.fillStyle = primaryColor;
        ctx.font = `700 ${10.5 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
        ctx.fillText((sp.role || 'Partner').toUpperCase(), itemCx, boxY + 48 * S);

        if (sp.tagline || sp.tier) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.font = `500 ${9.5 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
          ctx.fillText(sp.tagline || sp.tier.replace(/_/g, ' '), itemCx, boxY + 63 * S);
        }
      }
    }
  }

  return boxY + boxH + 10 * S;
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

  // Resolve Category Template & Branding Tokens
  const templateKey = options.category?.poster_template || nominee.poster_template || 'gold_prestige';
  const template = POSTER_TEMPLATES[templateKey] || POSTER_TEMPLATES.gold_prestige;
  const primaryColor = options.category?.poster_theme_color || nominee.poster_theme_color || template.primaryColor;
  const secondaryColor = template.secondaryColor || '#FFDF73';
  const badgeText = options.category?.poster_badge_text || nominee.poster_badge_text || 'OFFICIAL NOMINEE';
  const categoryName = (options.category?.name || nominee.category_name || 'CREATOR OF THE YEAR').toUpperCase();
  const sponsors = options.sponsors || [];

  // Pre-load images
  const photoUrl = nominee.photo_url ? getAssetUrl(nominee.photo_url) : null;
  const [photo, logoImg] = await Promise.all([
    loadImage(photoUrl),
    loadImage('/brand/logo-md.jpg').then((res) => res || loadImage('/logo.png')),
  ]);

  // 1. Atmospheric Luxury Background Gradient
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  template.bgStops.forEach(({ stop, color }) => bg.addColorStop(stop, color));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Soft Radial Spotlight behind creator photo
  const photoY = isStory ? 490 * S : 370 * S;
  const spotlight = ctx.createRadialGradient(cx, photoY, 40 * S, cx, photoY, 420 * S);
  spotlight.addColorStop(0, 'rgba(212, 175, 55, 0.12)');
  spotlight.addColorStop(1, 'transparent');
  ctx.fillStyle = spotlight;
  ctx.fillRect(0, photoY - 350 * S, width, 700 * S);

  // 2. Theme Specific Decorative Background Layer
  if (template.drawDecorations) {
    template.drawDecorations(ctx, width, height, S, primaryColor);
  }

  // 3. Dual Hairline Luxury Frame
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 1.5 * S;
  ctx.strokeRect(30 * S, 30 * S, width - 60 * S, height - 60 * S);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1 * S;
  ctx.strokeRect(42 * S, 42 * S, width - 84 * S, height - 84 * S);

  ctx.textAlign = 'center';

  // 4. Header: Single Unified Event Brand Lockup
  const headerY = isStory ? 80 * S : 60 * S;
  let headerBottomY = headerY;

  if (logoImg) {
    const maxLogoW = 135 * S;
    const maxLogoH = 55 * S;
    const scale = Math.min(maxLogoW / logoImg.width, maxLogoH / logoImg.height);
    const dw = logoImg.width * scale;
    const dh = logoImg.height * scale;
    ctx.drawImage(logoImg, cx - dw / 2, headerY, dw, dh);

    // Event Title
    ctx.fillStyle = primaryColor;
    ctx.font = `bold ${16 * S}px "Cinzel", Georgia, serif`;
    ctx.letterSpacing = `${2.5 * S}px`;
    ctx.fillText('TELUGU ICON DIGITAL & INFLUENCER AWARDS 2026', cx, headerY + dh + 18 * S);
    ctx.letterSpacing = '0px';

    headerBottomY = headerY + dh + 24 * S;
  } else {
    ctx.fillStyle = primaryColor;
    ctx.font = `bold ${22 * S}px "Cinzel", Georgia, serif`;
    ctx.letterSpacing = `${3 * S}px`;
    ctx.fillText('TELUGU ICON AWARDS 2026', cx, headerY + 22 * S);
    ctx.letterSpacing = '0px';

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = `600 ${12 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
    ctx.letterSpacing = `${2 * S}px`;
    ctx.fillText('DIGITAL & INFLUENCER AWARDS', cx, headerY + 42 * S);
    ctx.letterSpacing = '0px';

    headerBottomY = headerY + 46 * S;
  }

  // Official Nomination Ribbon Badge (Single, prominent, uncrowded)
  const ribbonText = `★  ${(badgeText || 'OFFICIAL NOMINEE').toUpperCase()}  ★`;
  ctx.font = `700 ${11.5 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.letterSpacing = `${3 * S}px`;
  const ribbonW = ctx.measureText(ribbonText).width + 30 * S;
  const ribbonH = 26 * S;
  const ribbonY = headerBottomY + 8 * S;

  ctx.fillStyle = 'rgba(212, 175, 55, 0.1)';
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
  ctx.lineWidth = 1 * S;
  drawRoundedRect(ctx, cx - ribbonW / 2, ribbonY, ribbonW, ribbonH, ribbonH / 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = secondaryColor;
  ctx.textBaseline = 'middle';
  ctx.fillText(ribbonText, cx, ribbonY + ribbonH / 2);
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = '0px';

  // 5. Nominee Photo in Double Concentric Luxury Ring Frame
  const ringRadius = isStory ? 195 * S : 148 * S;
  const ringY = isStory ? 470 * S : 335 * S;

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

  // Concentric Outer Gold Frame
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 4 * S;
  ctx.beginPath();
  ctx.arc(cx, ringY, ringRadius + 3 * S, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 223, 115, 0.5)';
  ctx.lineWidth = 1.5 * S;
  ctx.beginPath();
  ctx.arc(cx, ringY, ringRadius + 7 * S, 0, Math.PI * 2);
  ctx.stroke();

  // 6. Nominee Full Name (CRITICAL REQUIREMENT: COMPLETE, UNTRUNCATED)
  // Generous margin bottom under the avatar ring (user requirement: add margin under avatar)
  const avatarMarginBottom = isStory ? 58 * S : 50 * S;
  const nameStartY = ringY + ringRadius + 7 * S + avatarMarginBottom;
  const maxContentW = width - 200 * S;
  const nameLayout = fitNomineeName(ctx, nominee.full_name, maxContentW, S);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${nameLayout.fontSize}px "Cinzel", "Noto Sans Telugu", "Gautami", Georgia, serif`;
  ctx.textBaseline = 'top';
  drawLines(ctx, nameLayout.lines, cx, nameStartY, nameLayout.lineHeight);
  ctx.textBaseline = 'alphabetic'; // Reset to standard

  const nameBottomY = nameStartY + nameLayout.lines.length * nameLayout.lineHeight;

  // 7. Award Category Plaque (COMPLETE, UNTRUNCATED)
  const plaqueGap = 16 * S;
  const plaquePillW = Math.min(width - 220 * S, 760 * S);
  const plaquePillX = cx - plaquePillW / 2;
  const plaquePillY = nameBottomY + plaqueGap;

  const catLayout = fitCategoryText(ctx, categoryName, plaquePillW - 48 * S, S);
  const plaquePillH = 34 * S + catLayout.totalHeight;

  // Plaque Glass Container
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.38)';
  ctx.lineWidth = 1.5 * S;
  drawRoundedRect(ctx, plaquePillX, plaquePillY, plaquePillW, plaquePillH, 16 * S);
  ctx.fill();
  ctx.stroke();

  // Plaque Sub-label
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = `bold ${10.5 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.letterSpacing = `${3 * S}px`;
  ctx.fillText('NOMINATED FOR', cx, plaquePillY + 18 * S);
  ctx.letterSpacing = '0px';

  // Category Title (1 or 2 lines without ellipsis)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${catLayout.fontSize}px "Plus Jakarta Sans", Arial, sans-serif`;
  drawLines(ctx, catLayout.lines, cx, plaquePillY + 24 * S + catLayout.fontSize, catLayout.lineHeight);

  const plaqueBottomY = plaquePillY + plaquePillH;

  // 8. Dynamic Tag Layout (Requirement 4)
  // Gather and deduplicate all valid campaign tags
  const validTags = [];
  if (nominee.social_handle) {
    const handle = nominee.social_handle.startsWith('@') ? nominee.social_handle : `@${nominee.social_handle}`;
    validTags.push(handle);
  }
  if (nominee.nominee_code) {
    validTags.push(`Code: ${nominee.nominee_code}`);
  }
  if (nominee.platform) {
    validTags.push(nominee.platform);
  }
  validTags.push('#TeluguIconAwards2026');

  // Append any caller-specified tags
  if (Array.isArray(options.tags)) {
    options.tags.forEach((t) => {
      if (t && !validTags.includes(t)) validTags.push(t);
    });
  }

  const tagsStartY = plaqueBottomY + 14 * S;
  const tagsBottomY = drawDynamicTags(ctx, validTags, cx, tagsStartY, maxContentW, S, primaryColor);

  // 9. Category Sponsors or Presenter Section
  const sponsorStartY = tagsBottomY + 8 * S;
  const sponsorBottomY = await drawSponsorsSection(ctx, sponsors, cx, sponsorStartY, maxContentW, S, primaryColor);

  // 10. Luxury Bottom Section: QR Code & Call to Action (Requirement 6)
  // Carefully positioned with clear quiet zone and high-fashion typography
  const ctaY = isStory ? height - 440 * S : Math.max(height - 380 * S, sponsorBottomY + 16 * S);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${23 * S}px "Cinzel", Georgia, serif`;
  ctx.letterSpacing = `${2.5 * S}px`;
  ctx.fillText('SCAN TO VIEW & VOTE', cx, ctaY);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = secondaryColor;
  ctx.font = `600 ${13 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText('Discover the Nominee & Cast Your Official Vote', cx, ctaY + 20 * S);

  // White Card with High-Contrast Quiet Zone for QR Code
  const qrSize = isStory ? 180 * S : 144 * S;
  const qrCardPadding = 10 * S;
  const qrCardW = qrSize + qrCardPadding * 2;
  const qrCardH = qrSize + qrCardPadding * 2;
  const qrCardTop = ctaY + 30 * S;

  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, cx - qrCardW / 2, qrCardTop, qrCardW, qrCardH, 12 * S);
  ctx.fill();

  if (options.qrImage) {
    ctx.drawImage(options.qrImage, cx - qrSize / 2, qrCardTop + qrCardPadding, qrSize, qrSize);
  }

  // Canonical Destination & Verification Badge (No chopped URL!)
  const destBadgeY = qrCardTop + qrCardH + 18 * S;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = `600 ${13 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText('teluguiconawards.in • 100% Verified OTP Public Voting', cx, destBadgeY);

  // 11. Luxury Event Footer
  const footerY = height - 26 * S;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
  ctx.font = `500 ${11.5 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText('16 November 2026 • Shilpakala Vedika, Hyderabad • Official Campaign Kit', cx, footerY);

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
