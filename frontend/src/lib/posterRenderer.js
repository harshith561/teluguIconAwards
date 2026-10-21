import JSZip from 'jszip';
import { getAssetUrl, API_BASE, api } from '../api';
import { nomineeUrl, qrUrl, voteUrl, EVENT, EVENT_HASHTAGS } from './nomineeCampaign';

// ── Dynamic Filename Utilities ─────────────────────────────────────────────
// Requirement: CandidateName_FunctionName.png
export const sanitizeFilenamePart = (value, fallback) => {
  const sanitized = String(value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[. ]+$/g, '')
    .replace(/^_+|_+$/g, '');
  return sanitized || fallback;
};

export const createPosterFilename = (candidateName, functionName) => {
  const candidate = sanitizeFilenamePart(candidateName, 'Nominee');
  const awardFunction = sanitizeFilenamePart(functionName, 'Award_Category');
  return `${candidate}_${awardFunction}.png`;
};

export const POSTER_WIDTH = 1080;
export const POSTER_HEIGHT = 1620; // 2:3 ratio matching 682x1024 master artwork
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

// ── Multi-Stage Image Loader (CORS anonymous -> proxy) ────────────────────
export const loadImage = (src, timeoutMs = 6000) => {
  if (!src || typeof src !== 'string') return Promise.resolve(null);
  const cleanSrc = src.trim();
  if (!cleanSrc) return Promise.resolve(null);

  const tryLoad = (url) =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

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

  // Stage 1: Anonymous CORS load
  return tryLoad(cleanSrc).then((img) => {
    if (img) return img;

    // Stage 2: If direct CORS failed and this is an external HTTP/HTTPS URL,
    // route through the backend proxy (/api/proxy-image?url=...) which serves with CORS headers.
    // Note: We deliberately do NOT fall back to loading without CORS, because drawing a non-CORS
    // image onto an HTML canvas taints it and causes toDataURL() / toBlob() to throw SecurityError.
    if (cleanSrc.startsWith('http://') || cleanSrc.startsWith('https://')) {
      const proxyBase = API_BASE === '/api' ? '/api' : (API_BASE ? API_BASE.replace(/\/+$/, '') : '/api');
      const proxied = `${proxyBase}/proxy-image?url=${encodeURIComponent(cleanSrc)}`;
      return tryLoad(proxied);
    }
    return null;
  });
};

// ── Neutral Nominee Portrait Fallback (When photo is unavailable) ─────────
// Renders an elegant luxury 3D gold avatar silhouette so missing photos look prestigious rather than empty
export const drawNeutralPortraitFallback = (ctx, cx, cy, radius, color, S) => {
  const grad = ctx.createRadialGradient(cx, cy, 10 * S, cx, cy, radius);
  grad.addColorStop(0, '#1c150e');
  grad.addColorStop(0.5, '#120d08');
  grad.addColorStop(1, '#080503');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Elegant default golden avatar silhouette
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 2 * S, 0, Math.PI * 2);
  ctx.clip();

  // Avatar Head
  const headRadius = radius * 0.32;
  const headCy = cy - radius * 0.18;
  const avatarGrad = ctx.createLinearGradient(cx, headCy - headRadius, cx, cy + radius);
  avatarGrad.addColorStop(0, '#FFF2BF');
  avatarGrad.addColorStop(0.4, '#D4AF37');
  avatarGrad.addColorStop(1, '#8A6412');

  ctx.fillStyle = avatarGrad;
  ctx.beginPath();
  ctx.arc(cx, headCy, headRadius, 0, Math.PI * 2);
  ctx.fill();

  // Avatar Bust / Shoulders
  const bustCy = cy + radius * 0.48;
  const bustRx = radius * 0.68;
  const bustRy = radius * 0.46;
  ctx.beginPath();
  ctx.ellipse(cx, bustCy, bustRx, bustRy, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Subtle luxury inner golden trim
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
  ctx.lineWidth = 1.5 * S;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
};

// Backward-compatible alias that adheres strictly to the neutral fallback standard
export const drawMonogramAvatar = (ctx, cx, cy, radius, name, color, S) => {
  return drawNeutralPortraitFallback(ctx, cx, cy, radius, color, S);
};

// ── Procedural 3D Golden Awards Trophy (Standing Star Column) ─────────────
export const drawProcedural3DTrophy = (ctx, x, y, w, h, primaryColor = '#D4AF37') => {
  ctx.save();
  ctx.translate(x, y);
  const sx = w / 100;
  const sy = h / 200;
  ctx.scale(sx, sy);

  // 1. Soft gold radial glow behind star
  const glow = ctx.createRadialGradient(50, 32, 5, 50, 32, 45);
  glow.addColorStop(0, 'rgba(255, 235, 150, 0.5)');
  glow.addColorStop(0.5, 'rgba(212, 175, 55, 0.2)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(50, 32, 45, 0, Math.PI * 2);
  ctx.fill();

  // 2. Stepped Pedestal Base (Black & Gold)
  // Sub-base
  ctx.fillStyle = '#0a0805';
  drawRoundedRect(ctx, 20, 185, 60, 14, 2);
  ctx.fill();
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Gold trim tier
  const goldGrad = ctx.createLinearGradient(25, 0, 75, 0);
  goldGrad.addColorStop(0, '#8A6412');
  goldGrad.addColorStop(0.3, '#FFF5BA');
  goldGrad.addColorStop(0.7, primaryColor);
  goldGrad.addColorStop(1, '#5A4109');
  ctx.fillStyle = goldGrad;
  ctx.beginPath();
  ctx.moveTo(25, 185);
  ctx.lineTo(75, 185);
  ctx.lineTo(70, 175);
  ctx.lineTo(30, 175);
  ctx.closePath();
  ctx.fill();

  // Upper pedestal cylinder
  drawRoundedRect(ctx, 32, 162, 36, 13, 2);
  ctx.fill();

  // 3. Spiraling Twisted Dual-Ribbon Gold Column
  const ribbonCount = 5;
  for (let r = 0; r < ribbonCount; r++) {
    const t0 = 60 + r * 20;
    const t1 = t0 + 20;
    const isOdd = r % 2 === 1;

    const rGrad = ctx.createLinearGradient(35, t0, 65, t1);
    if (isOdd) {
      rGrad.addColorStop(0, '#5A4109');
      rGrad.addColorStop(0.5, '#D4AF37');
      rGrad.addColorStop(1, '#FFF5BA');
    } else {
      rGrad.addColorStop(0, '#FFF5BA');
      rGrad.addColorStop(0.5, '#FCD34D');
      rGrad.addColorStop(1, '#8A6412');
    }

    ctx.fillStyle = rGrad;
    ctx.beginPath();
    ctx.moveTo(42, t0);
    ctx.bezierCurveTo(24, t0 + 10, 26, t1 - 10, 48, t1);
    ctx.lineTo(58, t1);
    ctx.bezierCurveTo(36, t1 - 10, 34, t0 + 10, 52, t0);
    ctx.closePath();
    ctx.fill();

    // Opposite strand
    ctx.beginPath();
    ctx.moveTo(58, t0);
    ctx.bezierCurveTo(76, t0 + 10, 74, t1 - 10, 52, t1);
    ctx.lineTo(42, t1);
    ctx.bezierCurveTo(64, t1 - 10, 66, t0 + 10, 48, t0);
    ctx.closePath();
    ctx.fill();
  }

  // Column collar node under the star
  ctx.fillStyle = goldGrad;
  ctx.beginPath();
  ctx.ellipse(50, 56, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4. Faceted 5-Pointed Golden Star on Top
  const starCx = 50;
  const starCy = 30;
  const outerR = 24;
  const innerR = 10;
  const points = 5;

  // Star Points Calculation
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    pts.push([starCx + r * Math.cos(angle), starCy + r * Math.sin(angle)]);
  }

  // Draw faceted star triangles with alternating gold gradients
  for (let i = 0; i < pts.length; i++) {
    const next = (i + 1) % pts.length;
    const triGrad = ctx.createLinearGradient(starCx, starCy, pts[i][0], pts[i][1]);
    if (i % 2 === 0) {
      triGrad.addColorStop(0, '#FFF5BA');
      triGrad.addColorStop(0.5, '#FCD34D');
      triGrad.addColorStop(1, '#D4AF37');
    } else {
      triGrad.addColorStop(0, '#8A6412');
      triGrad.addColorStop(0.7, '#D4AF37');
      triGrad.addColorStop(1, '#FFF5BA');
    }
    ctx.fillStyle = triGrad;
    ctx.beginPath();
    ctx.moveTo(starCx, starCy);
    ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.lineTo(pts[next][0], pts[next][1]);
    ctx.closePath();
    ctx.fill();
  }

  // 5. Star Specular Highlights & Diamond Sparkles
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(starCx, starCy, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Diamond Sparkle Ray Top-Right
  const sparkX = starCx + 16;
  const sparkY = starCy - 14;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(sparkX, sparkY - 9);
  ctx.lineTo(sparkX + 2, sparkY - 2);
  ctx.lineTo(sparkX + 9, sparkY);
  ctx.lineTo(sparkX + 2, sparkY + 2);
  ctx.lineTo(sparkX, sparkY + 9);
  ctx.lineTo(sparkX - 2, sparkY + 2);
  ctx.lineTo(sparkX - 9, sparkY);
  ctx.lineTo(sparkX - 2, sparkY - 2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
};

// ── 6 Official Categories Tier Definitions (Matching Reference Poster) ────
export const OFFICIAL_CATEGORIES_TIERS = [
  { icon: '★', label: 'GOLD', sub: 'Title Partner', iconColor: '#FFDF73' },
  { icon: '◆', label: 'SILVER', sub: 'Co Powered By', iconColor: '#E2E8F0' },
  { icon: '🏆', label: 'CATEGORY', sub: 'PARTNER', iconColor: '#F59E0B' },
  { icon: '▶', label: 'MEDIA', sub: 'PARTNER', iconColor: '#EF4444' },
  { icon: '✈', label: 'DIGITAL', sub: 'PARTNER', iconColor: '#38BDF8' },
  { icon: '🌐', label: 'TRAVEL', sub: 'PARTNER', iconColor: '#10B981' },
];

// ── Master 16 Sponsor Slot Positions on 682 x 1024 Base Canvas ─────────────
export const SPONSOR_SLOTS = [
  // Row 0
  { index: 0, name: 'Growth', x: 51, y: 560, w: 136, h: 44 },
  { index: 1, name: 'CMR', x: 197, y: 560, w: 136, h: 44 },
  { index: 2, name: 'VEGA', x: 349, y: 560, w: 136, h: 44 },
  { index: 3, name: 'EUPHORIA', x: 495, y: 560, w: 136, h: 44 },
  // Row 1
  { index: 4, name: 'PRIYA GOLD', x: 51, y: 612, w: 136, h: 44 },
  { index: 5, name: 'happi', x: 197, y: 612, w: 136, h: 44 },
  { index: 6, name: 'Srichakra', x: 349, y: 612, w: 136, h: 44 },
  { index: 7, name: 'MAHAA NEWS', x: 495, y: 612, w: 136, h: 44 },
  // Row 2
  { index: 8, name: 'NEXGEN INFRA', x: 51, y: 664, w: 136, h: 44 },
  { index: 9, name: 'mediafx', x: 197, y: 664, w: 136, h: 44 },
  { index: 10, name: 'DESIGNO', x: 349, y: 664, w: 136, h: 44 },
  { index: 11, name: 'KLIX', x: 495, y: 664, w: 136, h: 44 },
  // Row 3
  { index: 12, name: "VEERU'S", x: 51, y: 716, w: 136, h: 44 },
  { index: 13, name: 'SBI', x: 197, y: 716, w: 136, h: 44 },
  { index: 14, name: 'SOUTH INDIA', x: 349, y: 716, w: 136, h: 44 },
  { index: 15, name: 'KLM', x: 495, y: 716, w: 136, h: 44 },
];

// ── 16 Official Reference Sponsor Brands (Matching Reference Poster) ───────
export const REFERENCE_SPONSORS = [
  { id: 'ref-0', sponsor_id: 'ref-0', slotIndex: 0, name: 'Growth', sub: '', tagline: 'INNOVATE • INSPIRE • ACHIEVE', color: '#00875A', is_active: 1 },
  { id: 'ref-1', sponsor_id: 'ref-1', slotIndex: 1, name: 'CMR', sub: 'SHOPPING MALL', tagline: 'The joy of life', color: '#0052CC', is_active: 1 },
  { id: 'ref-2', sponsor_id: 'ref-2', slotIndex: 2, name: 'VEGA', sub: 'JEWELLERS', tagline: 'ANDHRA PRADESH | TELANGANA | USA', color: '#B38728', is_active: 1 },
  { id: 'ref-3', sponsor_id: 'ref-3', slotIndex: 3, name: 'EUPHORIA', sub: '', tagline: 'GET YOUR GLOW ON!', color: '#FFAB00', is_active: 1 },
  { id: 'ref-4', sponsor_id: 'ref-4', slotIndex: 4, name: 'PRIYA GOLD', sub: '', tagline: 'Edible Oils', color: '#DE350B', is_active: 1 },
  { id: 'ref-5', sponsor_id: 'ref-5', slotIndex: 5, name: 'happi', sub: '', tagline: 'Mobiles | Accessories | Service', color: '#FF5630', is_active: 1 },
  { id: 'ref-6', sponsor_id: 'ref-6', slotIndex: 6, name: 'Srichakra', sub: 'MILKS', tagline: '', color: '#36B37E', is_active: 1 },
  { id: 'ref-7', sponsor_id: 'ref-7', slotIndex: 7, name: 'MAHAA NEWS', sub: '', tagline: '', color: '#BF2600', is_active: 1 },
  { id: 'ref-8', sponsor_id: 'ref-8', slotIndex: 8, name: 'NEXGEN INFRA', sub: '', tagline: 'Developers & Promoters', color: '#0052CC', is_active: 1 },
  { id: 'ref-9', sponsor_id: 'ref-9', slotIndex: 9, name: 'mediafx', sub: '', tagline: '#1 Telugu & English GenZ Mobile App', color: '#6554C0', is_active: 1 },
  { id: 'ref-10', sponsor_id: 'ref-10', slotIndex: 10, name: 'DESIGNO', sub: '', tagline: '', color: '#172B4D', is_active: 1 },
  { id: 'ref-11', sponsor_id: 'ref-11', slotIndex: 11, name: 'KLIX', sub: '', tagline: 'FASHION | ACCESSORIES', color: '#0065FF', is_active: 1 },
  { id: 'ref-12', sponsor_id: 'ref-12', slotIndex: 12, name: "VEERU'S", sub: '', tagline: 'MULTI CUISINE RESTAURANT', color: '#172B4D', is_active: 1 },
  { id: 'ref-13', sponsor_id: 'ref-13', slotIndex: 13, name: 'SBI', sub: '', tagline: 'The banker to every indian', color: '#00A3BF', is_active: 1 },
  { id: 'ref-14', sponsor_id: 'ref-14', slotIndex: 14, name: 'SOUTH INDIA', sub: 'shopping mall', tagline: 'Textiles | Jewellery', color: '#403294', is_active: 1 },
  { id: 'ref-15', sponsor_id: 'ref-15', slotIndex: 15, name: 'KLM', sub: 'FASHION MALL', tagline: 'KEEP LOVING MORE', color: '#FF8B00', is_active: 1 },
];

// ── Section 1: "OUR OFFICIAL CATEGORIES" Strip ─────────────────────────────
export const drawOfficialCategoriesSection = (ctx, cx, startY, maxWidth, S, primaryColor) => {
  const lineY = startY;

  // Title: "—— OUR OFFICIAL CATEGORIES ——"
  ctx.textAlign = 'center';
  ctx.fillStyle = primaryColor || '#D4AF37';
  ctx.font = `bold ${12 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.letterSpacing = `${2 * S}px`;
  const headingText = 'OUR OFFICIAL CATEGORIES';
  const headingW = ctx.measureText(headingText).width;

  const ruleW = (maxWidth - headingW - 40 * S) / 2;
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
  ctx.lineWidth = 1 * S;

  // Left rule line
  ctx.beginPath();
  ctx.moveTo(cx - maxWidth / 2, lineY);
  ctx.lineTo(cx - headingW / 2 - 16 * S, lineY);
  ctx.stroke();

  // Heading text
  ctx.textBaseline = 'middle';
  ctx.fillText(headingText, cx, lineY);

  // Right rule line
  ctx.beginPath();
  ctx.moveTo(cx + headingW / 2 + 16 * S, lineY);
  ctx.lineTo(cx + maxWidth / 2, lineY);
  ctx.stroke();

  ctx.letterSpacing = '0px';
  ctx.textBaseline = 'alphabetic';

  // 6 Tier Cards
  const cardsY = lineY + 12 * S;
  const cardH = 50 * S;
  const count = OFFICIAL_CATEGORIES_TIERS.length;
  const gap = 8 * S;
  const cardW = (maxWidth - gap * (count - 1)) / count;
  const startX = cx - maxWidth / 2;

  for (let i = 0; i < count; i++) {
    const tier = OFFICIAL_CATEGORIES_TIERS[i];
    const cX = startX + i * (cardW + gap);

    // Dark Card with Gold Border
    ctx.fillStyle = 'rgba(10, 8, 6, 0.88)';
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 1 * S;
    drawRoundedRect(ctx, cX, cardsY, cardW, cardH, 8 * S);
    ctx.fill();
    ctx.stroke();

    // Card Icon
    ctx.textAlign = 'center';
    ctx.font = `bold ${13 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
    ctx.fillStyle = tier.iconColor;
    ctx.fillText(tier.icon, cX + cardW / 2, cardsY + 16 * S);

    // Label 1
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${9 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
    ctx.fillText(tier.label, cX + cardW / 2, cardsY + 30 * S);

    // Sub-label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = `500 ${7.5 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
    ctx.fillText(tier.sub, cX + cardW / 2, cardsY + 42 * S);
  }

  return cardsY + cardH;
};

// ── Dynamic Sponsor Logo Drawer (Transparent, No White Cards) ──────────────
// Strictly NO white rectangular boxes. Logos are drawn transparently with object-fit: contain directly over the background.
export const drawSponsorCard = (ctx, sponsor, x, y, w, h, scale) => {
  if (!sponsor || !sponsor.img || !sponsor.img.width || !sponsor.img.height) return;

  const padX = 6 * scale;
  const padY = 4 * scale;
  const maxW = Math.max(10, w - padX * 2);
  const maxH = Math.max(10, h - padY * 2);
  const scaleFactor = Math.min(maxW / sponsor.img.width, maxH / sponsor.img.height);
  const dw = sponsor.img.width * scaleFactor;
  const dh = sponsor.img.height * scaleFactor;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;

  ctx.drawImage(sponsor.img, dx, dy, dw, dh);
};

// ── Section 2: "OUR PROUD SPONSORS" Dynamic Multi-Count Engine ────────────
// Handles 0, 1, 2, 3-5, 6-10, and >10 sponsors dynamically without omitting any valid logos.
export const drawDynamicSponsorsSection = (
  ctx,
  validSponsors,
  cx,
  startY,
  maxWidth,
  scale,
  primaryColor
) => {
  // If zero sponsors: completely omit section without leaving empty blocks or cards
  if (!validSponsors || validSponsors.length === 0) {
    return startY;
  }

  // Draw heading: "—— OUR PROUD SPONSORS ——"
  const lineY = startY + 10 * scale;
  ctx.textAlign = 'center';
  ctx.fillStyle = primaryColor || '#D4AF37';
  ctx.font = `bold ${11.5 * scale}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.letterSpacing = `${2 * scale}px`;
  const headingText = 'OUR PROUD SPONSORS';
  const headingW = ctx.measureText(headingText).width;

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
  ctx.lineWidth = 1 * scale;

  // Left rule
  ctx.beginPath();
  ctx.moveTo(cx - maxWidth / 2, lineY);
  ctx.lineTo(cx - headingW / 2 - 14 * scale, lineY);
  ctx.stroke();

  // Heading text
  ctx.textBaseline = 'middle';
  ctx.fillText(headingText, cx, lineY);

  // Right rule
  ctx.beginPath();
  ctx.moveTo(cx + headingW / 2 + 14 * scale, lineY);
  ctx.lineTo(cx + maxWidth / 2, lineY);
  ctx.stroke();

  ctx.letterSpacing = '0px';
  ctx.textBaseline = 'alphabetic';

  const gridStartY = lineY + 12 * scale;
  const count = validSponsors.length;

  if (count === 1) {
    // 1 Sponsor: Centered single logo with ample breathing room
    const cardW = 280 * scale;
    const cardH = 68 * scale;
    const cardX = cx - cardW / 2;
    drawSponsorCard(ctx, validSponsors[0], cardX, gridStartY, cardW, cardH, scale);
    return gridStartY + cardH;
  }

  if (count === 2) {
    // 2 Sponsors: Balanced side-by-side arrangement
    const cardW = 250 * scale;
    const cardH = 62 * scale;
    const gapX = 24 * scale;
    const startX = cx - (cardW * 2 + gapX) / 2;
    drawSponsorCard(ctx, validSponsors[0], startX, gridStartY, cardW, cardH, scale);
    drawSponsorCard(ctx, validSponsors[1], startX + cardW + gapX, gridStartY, cardW, cardH, scale);
    return gridStartY + cardH;
  }

  if (count === 3) {
    // 3 Sponsors: 3 balanced logos in 1 row
    const cardW = 175 * scale;
    const cardH = 54 * scale;
    const gapX = 16 * scale;
    const startX = cx - (cardW * 3 + gapX * 2) / 2;
    for (let i = 0; i < 3; i++) {
      drawSponsorCard(ctx, validSponsors[i], startX + i * (cardW + gapX), gridStartY, cardW, cardH, scale);
    }
    return gridStartY + cardH;
  }

  if (count === 4) {
    // 4 Sponsors: 4 balanced logos in 1 row
    const cardW = 132 * scale;
    const cardH = 48 * scale;
    const gapX = 12 * scale;
    const startX = cx - (cardW * 4 + gapX * 3) / 2;
    for (let i = 0; i < 4; i++) {
      drawSponsorCard(ctx, validSponsors[i], startX + i * (cardW + gapX), gridStartY, cardW, cardH, scale);
    }
    return gridStartY + cardH;
  }

  if (count === 5) {
    // 5 Sponsors: 1 balanced, prominent row of 5 logos
    const cardW = 102 * scale;
    const cardH = 58 * scale;
    const gapX = 12 * scale;
    const rowW = 5 * cardW + 4 * gapX;
    const startX = cx - rowW / 2;
    for (let i = 0; i < 5; i++) {
      drawSponsorCard(ctx, validSponsors[i], startX + i * (cardW + gapX), gridStartY, cardW, cardH, scale);
    }
    return gridStartY + cardH;
  }

  if (count === 6) {
    // 6 Sponsors: 1 balanced row of 6 logos
    const cardW = 86 * scale;
    const cardH = 56 * scale;
    const gapX = 10 * scale;
    const rowW = 6 * cardW + 5 * gapX;
    const startX = cx - rowW / 2;
    for (let i = 0; i < 6; i++) {
      drawSponsorCard(ctx, validSponsors[i], startX + i * (cardW + gapX), gridStartY, cardW, cardH, scale);
    }
    return gridStartY + cardH;
  }

  if (count >= 7 && count <= 12) {
    // 7 to 12 Sponsors: Up to 6 in row 1, up to 6 in row 2 (6 and 6 layout)
    const cols = 6;
    const cardH = 50 * scale;
    const gapX = 10 * scale;
    const gapY = 8 * scale;
    const cardW = Math.floor((maxWidth - (cols - 1) * gapX) / cols);
    const numRows = Math.ceil(count / cols);

    for (let r = 0; r < numRows; r++) {
      const startIdx = r * cols;
      const endIdx = Math.min(count, startIdx + cols);
      const itemsInRow = endIdx - startIdx;
      const rowW = itemsInRow * cardW + (itemsInRow - 1) * gapX;
      const rowStartX = cx - rowW / 2;
      const rowY = gridStartY + r * (cardH + gapY);

      for (let c = 0; c < itemsInRow; c++) {
        const sp = validSponsors[startIdx + c];
        const cardX = rowStartX + c * (cardW + gapX);
        drawSponsorCard(ctx, sp, cardX, rowY, cardW, cardH, scale);
      }
    }
    return gridStartY + numRows * cardH + (numRows - 1) * gapY;
  }

  // More than 12 Sponsors: Dynamic 6-column grid
  const cols = 6;
  const numRows = Math.ceil(count / cols);
  const gapX = 8 * scale;
  const gapY = 6 * scale;
  const cardW = Math.floor((maxWidth - (cols - 1) * gapX) / cols);
  const cardH = Math.max(34 * scale, Math.min(48 * scale, Math.floor(160 * scale / numRows)));

  for (let r = 0; r < numRows; r++) {
    const startIndex = r * cols;
    const endIndex = Math.min(count, startIndex + cols);
    const itemsInRow = endIndex - startIndex;
    const rowW = itemsInRow * cardW + (itemsInRow - 1) * gapX;
    const rowStartX = cx - rowW / 2;
    const rowY = gridStartY + r * (cardH + gapY);

    for (let c = 0; c < itemsInRow; c++) {
      const sp = validSponsors[startIndex + c];
      const cardX = rowStartX + c * (cardW + gapX);
      drawSponsorCard(ctx, sp, cardX, rowY, cardW, cardH, scale);
    }
  }

  return gridStartY + numRows * cardH + (numRows - 1) * gapY;
};

// Backward-compatible alias for drawProudSponsorsSection
export const drawProudSponsorsSection = async (
  ctx,
  sponsors,
  posterRefImg,
  cx,
  startY,
  maxWidth,
  scale,
  primaryColor
) => {
  return drawDynamicSponsorsSection(ctx, sponsors, cx, startY, maxWidth, scale, primaryColor);
};

// ── Master Poster Renderer (2:3 Poster and 9:16 Story) ────────────────────
export const buildPoster = async (nominee, options = {}) => {
  const isStory = options.format === 'story';
  const width = isStory ? STORY_WIDTH : POSTER_WIDTH;
  const height = isStory ? STORY_HEIGHT : POSTER_HEIGHT;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const S = width / 1080;
  const scale = width / 682;
  const offsetY = isStory ? Math.round((height - 1620) / 2) : 0;
  const cx = width / 2;
  const maxContentW = 590 * scale;

  // Resolve Category Template & Branding Tokens
  const templateKey = options.category?.poster_template || nominee?.poster_template || 'gold_prestige';
  const template = POSTER_TEMPLATES[templateKey] || POSTER_TEMPLATES.gold_prestige;
  const primaryColor = options.category?.poster_theme_color || nominee?.poster_theme_color || template.primaryColor || '#D4AF37';
  const categoryName = (options.category?.name || nominee?.category_name || 'TELUGU YOUTUBER OF THE YEAR').toUpperCase();

  // Pre-load assets: Nominee photo, Master poster
  const photoUrl = nominee?.photo_url ? getAssetUrl(nominee.photo_url) : null;
  const [photo, masterPosterImg] = await Promise.all([
    loadImage(photoUrl),
    loadImage('/brand/master-poster.jpg')
      .then((res) => res || loadImage('/brand/poster-reference.jpg'))
      .then((res) => res || loadImage('/brand/reference-poster.jpg'))
      .then((res) => res || loadImage('/brand/poster-template.jpg')),
  ]);

  // Pre-load genuine scannable QR Code
  let qrImg = options.qrImage;
  if (!qrImg && nominee) {
    const qrValue = qrUrl(nominee);
    try {
      const qrData = await qrDataUrl(qrValue, 640);
      qrImg = await loadImage(qrData);
    } catch (_) {
      qrImg = await loadImage(`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrValue)}&size=640x640&margin=8&format=png`);
    }
  }

  // Filter and preload active sponsors with valid logos
  const rawSponsors = Array.isArray(options.sponsors)
    ? options.sponsors
    : (Array.isArray(options.allSponsors) ? options.allSponsors : []);

  const excludedIds = options.excludedSponsorIds instanceof Set
    ? options.excludedSponsorIds
    : new Set(Array.isArray(options.excludedSponsorIds) ? options.excludedSponsorIds : []);

  const activeSponsors = rawSponsors.filter((s) => {
    if (!s) return false;
    const isMasterActive = s.is_active === 1 || s.is_active === true || s.is_active === '1' || s.is_active === undefined;
    if (!isMasterActive) return false;
    if (s.excluded_from_poster) return false;
    const sId = s.id;
    if (sId !== undefined && (excludedIds.has(sId) || excludedIds.has(String(sId)))) return false;
    if (s.name && excludedIds.has(s.name)) return false;
    return Boolean(s.logo_url || s.logo || s.img || s.image_id);
  });

  const sponsorsWithImages = await Promise.all(
    activeSponsors.map(async (sp) => {
      if (sp.img && sp.img.complete && sp.img.naturalWidth > 0) return sp;
      const url = sp.logo_url || sp.logo || (sp.image_id ? `/api/images/${sp.image_id}/file` : null);
      const img = url ? await loadImage(getAssetUrl(url)) : null;
      return { ...sp, img };
    })
  );

  const validSponsors = sponsorsWithImages.filter((s) => s.img && s.img.width > 0 && s.img.height > 0);

  // 1. Clear Canvas & Draw Complete Master Golden Background
  ctx.clearRect(0, 0, width, height);

  const bgImgW = masterPosterImg?.naturalWidth || masterPosterImg?.width || 687;
  const bgImgH = masterPosterImg?.naturalHeight || masterPosterImg?.height || 1024;

  if (masterPosterImg) {
    if (isStory) {
      // 9:16 Instagram Story (1080 x 1920)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#0c0805');
      bgGrad.addColorStop(0.2, '#070503');
      bgGrad.addColorStop(0.8, '#050302');
      bgGrad.addColorStop(1, '#000000');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw full master poster centered vertically
      ctx.drawImage(masterPosterImg, 0, 0, bgImgW, bgImgH, 0, offsetY, width, bgImgH * scale);
    } else {
      // 2:3 Official Poster (1080 x 1620)
      ctx.drawImage(masterPosterImg, 0, 0, bgImgW, bgImgH, 0, 0, width, height);
    }
    // Note: Absolutely NO artificial black overlay panel or screen!
    // The background is 100% clean. The spiral star trophy on the right stands proudly,
    // and golden ambient sparkles flow across the poster.
  } else {
    // Procedural header fallback when master poster background is missing
    const headerTopY = isStory ? 60 * S : 34 * S;
    ctx.textAlign = 'center';
    ctx.fillStyle = primaryColor;
    ctx.font = `bold ${24 * S}px "Cinzel", Georgia, serif`;
    ctx.letterSpacing = `${3 * S}px`;
    ctx.fillText('TELUGU ICON AWARDS 2026', cx, headerTopY + 24 * S);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = `600 ${11 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
    ctx.letterSpacing = `${2 * S}px`;
    ctx.fillText('HONORING INFLUENCE. CELEBRATING EXCELLENCE.', cx, headerTopY + 44 * S);

    ctx.fillStyle = primaryColor;
    ctx.font = `bold ${14 * S}px "Cinzel", Georgia, serif`;
    ctx.fillText('TELUGU ICON DIGITAL & INFLUENCER AWARDS 2026', cx, headerTopY + 64 * S);
    ctx.letterSpacing = '0px';

    const badgeY = headerTopY + 74 * S;
    const badgeH = 28 * S;
    const badgeW = 220 * S;
    const badgeGrad = ctx.createLinearGradient(cx - badgeW / 2, badgeY, cx + badgeW / 2, badgeY + badgeH);
    badgeGrad.addColorStop(0, '#FFE58F');
    badgeGrad.addColorStop(0.5, '#F5BA38');
    badgeGrad.addColorStop(1, '#D4AF37');
    ctx.fillStyle = badgeGrad;
    drawRoundedRect(ctx, cx - badgeW / 2, badgeY, badgeW, badgeH, badgeH / 2);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1A0C00';
    ctx.font = `bold ${12.5 * S}px "Plus Jakarta Sans", Arial, sans-serif`;
    ctx.fillText('★  OFFICIAL NOMINEE  ★', cx, badgeY + badgeH / 2);
    ctx.textBaseline = 'alphabetic';

    const trophyX = isStory ? 740 * S : 720 * S;
    const trophyY = isStory ? 280 * S : 165 * S;
    drawProcedural3DTrophy(ctx, trophyX, trophyY, isStory ? 210 * S : 185 * S, isStory ? 430 * S : 340 * S, primaryColor);
  }

  // 2. Nominee Photo in Glowing Double Gold Concentric Ring
  // When using clean background template:
  // "★ OFFICIAL NOMINEE ★" ends at y=335px.
  // We position the circular portrait at cy=418px with radius=68px,
  // leaving the standing spiral star trophy on the right (x > 440) completely unobscured.
  const photoCx = cx;
  const photoCy = (masterPosterImg ? 418 * scale : 262 * scale) + offsetY;
  const photoRadius = (masterPosterImg ? 68 * scale : 79 * scale);

  if (photo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(photoCx, photoCy, photoRadius, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#111111';
    ctx.fillRect(photoCx - photoRadius, photoCy - photoRadius, photoRadius * 2, photoRadius * 2);

    const side = Math.min(photo.width, photo.height);
    ctx.drawImage(
      photo,
      (photo.width - side) / 2,
      (photo.height - side) / 2,
      side,
      side,
      photoCx - photoRadius,
      photoCy - photoRadius,
      photoRadius * 2,
      photoRadius * 2
    );
    ctx.restore();

    // Inner Gold Concentric Ring
    const ringGrad = ctx.createLinearGradient(
      photoCx - photoRadius,
      photoCy - photoRadius,
      photoCx + photoRadius,
      photoCy + photoRadius
    );
    ringGrad.addColorStop(0, '#FFF5BA');
    ringGrad.addColorStop(0.35, '#FCD34D');
    ringGrad.addColorStop(0.7, '#D4AF37');
    ringGrad.addColorStop(1, '#8A6412');
    ctx.strokeStyle = ringGrad;
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.arc(photoCx, photoCy, photoRadius + 1.5 * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Outer Soft Halo Ring
    ctx.strokeStyle = 'rgba(255, 223, 115, 0.45)';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.arc(photoCx, photoCy, photoRadius + 5.5 * scale, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Neutral luxury portrait fallback with prestigious gold avatar silhouette when photo is unavailable
    drawNeutralPortraitFallback(ctx, photoCx, photoCy, photoRadius, primaryColor, scale);

    // Inner Gold Concentric Ring
    const ringGrad = ctx.createLinearGradient(
      photoCx - photoRadius,
      photoCy - photoRadius,
      photoCx + photoRadius,
      photoCy + photoRadius
    );
    ringGrad.addColorStop(0, '#FFF5BA');
    ringGrad.addColorStop(0.35, '#FCD34D');
    ringGrad.addColorStop(0.7, '#D4AF37');
    ringGrad.addColorStop(1, '#8A6412');
    ctx.strokeStyle = ringGrad;
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.arc(photoCx, photoCy, photoRadius + 1.5 * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Outer Soft Halo Ring
    ctx.strokeStyle = 'rgba(255, 223, 115, 0.45)';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.arc(photoCx, photoCy, photoRadius + 5.5 * scale, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 3. Nominee Full Name (Rendered in radiant gold without artificial black smudges)
  const fullNameToDisplay = nominee?.full_name || 'Creator Name';
  const nameCenterY = (masterPosterImg ? 512 * scale : 364 * scale) + offsetY;
  const nameMaxW = masterPosterImg ? 390 * scale : 440 * scale;
  const nameLayout = fitNomineeName(ctx, fullNameToDisplay, nameMaxW, scale);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#F6D389';
  ctx.font = `bold ${nameLayout.fontSize}px "Cinzel", "Playfair Display", Georgia, serif`;
  ctx.textBaseline = 'middle';

  if (nameLayout.lines.length === 1) {
    ctx.fillText(nameLayout.lines[0], photoCx, nameCenterY);
  } else {
    const totalH = nameLayout.totalHeight;
    const startY = nameCenterY - totalH / 2 + nameLayout.lineHeight / 2;
    nameLayout.lines.forEach((line, idx) => {
      ctx.fillText(line, photoCx, startY + idx * nameLayout.lineHeight);
    });
  }
  ctx.textBaseline = 'alphabetic';

  // 4. Category Plaque: "NOMINATED FOR <CATEGORY>"
  const plaqueW = Math.min(maxContentW, masterPosterImg ? 400 * scale : 442 * scale);
  const plaqueH = 38 * scale;
  const plaqueX = photoCx - plaqueW / 2;
  const plaqueY = (masterPosterImg ? 546 * scale : 396 * scale) + offsetY;

  // Translucent luxury dark glass pill with gold border (No opaque black box)
  ctx.fillStyle = 'rgba(12, 8, 4, 0.72)';
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.85)';
  ctx.lineWidth = 1.2 * scale;
  drawRoundedRect(ctx, plaqueX, plaqueY, plaqueW, plaqueH, 10 * scale);
  ctx.fill();
  ctx.stroke();

  // "NOMINATED FOR" label above plaque
  ctx.textAlign = 'center';
  ctx.fillStyle = '#D4AF37';
  ctx.font = `bold ${8.5 * scale}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.letterSpacing = `${2 * scale}px`;
  ctx.fillText('NOMINATED FOR', photoCx, plaqueY - 7 * scale);
  ctx.letterSpacing = '0px';

  // Category title inside plaque
  const catLayout = fitCategoryText(ctx, categoryName, plaqueW - 32 * scale, scale);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFF8E7';
  ctx.font = `bold ${Math.max(catLayout.fontSize, 15 * scale)}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText(categoryName, photoCx, plaqueY + plaqueH / 2);
  ctx.textBaseline = 'alphabetic';

  // Procedural fallback only: Draw official categories strip if background image is absent
  if (!masterPosterImg) {
    const catSectionY = plaqueY + plaqueH + 16 * scale;
    drawOfficialCategoriesSection(ctx, cx, catSectionY, maxContentW, scale, primaryColor);
  }

  // 5. Bottom Event Footer (ONLY Date and Venue/Address, per user specification)
  const footerH = 34 * scale;
  const footerY = (isStory ? height - offsetY - footerH - 18 * scale : height - footerH - 18 * scale);
  const footerW = Math.min(maxContentW, 560 * scale);
  const footerX = cx - footerW / 2;

  const eventDate = (options.event?.date || '16 NOVEMBER 2026').toUpperCase();
  const eventVenue = (options.event?.venue || 'SHILPAKALA VEDIKA, HYDERABAD').toUpperCase();
  const eventBannerText = `📅  ${eventDate}   |   📍  ${eventVenue}`;

  ctx.fillStyle = 'rgba(15, 10, 6, 0.85)';
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.75)';
  ctx.lineWidth = 1.2 * scale;
  drawRoundedRect(ctx, footerX, footerY, footerW, footerH, 17 * scale);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFF8E7';
  ctx.font = `bold ${10.5 * scale}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.letterSpacing = `${1 * scale}px`;
  ctx.fillText(eventBannerText, cx, footerY + footerH / 2);
  ctx.letterSpacing = '0px';
  ctx.textBaseline = 'alphabetic';

  // 6. Dynamic Sponsor Section (between Category Plaque and QR Section)
  const sponsorSectionStartY = (masterPosterImg ? 606 * scale : 544 * scale) + offsetY;
  let sponsorSectionEndY = sponsorSectionStartY;

  if (validSponsors.length > 0) {
    sponsorSectionEndY = drawDynamicSponsorsSection(ctx, validSponsors, cx, sponsorSectionStartY, maxContentW, scale, primaryColor);
  }

  // 7. Voting QR Code Section (auto-centered in remaining space above the footer)
  const qrBottomLimit = footerY - 8 * scale;
  const availableQrSpace = Math.max(70 * scale, qrBottomLimit - sponsorSectionEndY);
  const isZeroSponsors = validSponsors.length === 0;

  let qrCardSize = isZeroSponsors ? 110 * scale : (validSponsors.length <= 2 ? 82 * scale : 72 * scale);
  let ctaTitleFontSize = isZeroSponsors ? 17 * scale : (validSponsors.length <= 4 ? 14.5 * scale : 13.5 * scale);
  let ctaSubFontSize = isZeroSponsors ? 10.5 * scale : 9.5 * scale;

  let titleGap = (isZeroSponsors ? 16 : 12) * scale;
  let subGap = (isZeroSponsors ? 10 : 8) * scale;
  let totalQrHeight = ctaTitleFontSize + titleGap + ctaSubFontSize + subGap + qrCardSize;

  if (totalQrHeight > availableQrSpace - 8 * scale) {
    const scaleFactor = Math.max(0.65, (availableQrSpace - 8 * scale) / totalQrHeight);
    qrCardSize = Math.max(54 * scale, qrCardSize * scaleFactor);
    ctaTitleFontSize *= scaleFactor;
    ctaSubFontSize *= scaleFactor;
    titleGap *= scaleFactor;
    subGap *= scaleFactor;
    totalQrHeight *= scaleFactor;
  }

  const qrTopGap = Math.max(6 * scale, (availableQrSpace - totalQrHeight) / 2);

  const ctaTitleY = sponsorSectionEndY + qrTopGap + ctaTitleFontSize;
  ctx.textAlign = 'center';
  ctx.fillStyle = primaryColor || '#D4AF37';
  ctx.font = `bold ${ctaTitleFontSize}px "Cinzel", "Playfair Display", Georgia, serif`;
  ctx.letterSpacing = `${2 * scale}px`;
  ctx.fillText('SCAN TO VIEW & VOTE', cx, ctaTitleY);
  ctx.letterSpacing = '0px';

  const ctaSubY = ctaTitleY + titleGap;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = `600 ${ctaSubFontSize}px "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.fillText('Discover the Nominee & Cast Your Official Vote', cx, ctaSubY);

  const qrCardX = cx - qrCardSize / 2;
  const qrCardY = ctaSubY + subGap;

  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, qrCardX, qrCardY, qrCardSize, qrCardSize, 8 * scale);
  ctx.fill();
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.65)';
  ctx.lineWidth = 1.2 * scale;
  ctx.stroke();

  if (qrImg) {
    const pad = 5 * scale;
    ctx.drawImage(qrImg, qrCardX + pad, qrCardY + pad, qrCardSize - pad * 2, qrCardSize - pad * 2);
  }

  return canvas;
};

// ── ZIP Campaign Kit Builder ──────────────────────────────────────────────
export const buildCampaignKitZip = async ({
  nominee,
  category,
  sponsors = [],
  posterCanvas,
  storyCanvas,
  posterBlob: directPosterBlob,
  storyBlob: directStoryBlob,
  qrDataUrl,
}) => {
  const zip = new JSZip();
  const slug = nominee.slug || `nominee-${nominee.id}`;
  const code = nominee.nominee_code || 'TIC26';
  const prefix = `Telugu-Icon-Awards-2026-${code}-${slug}`;

  // Dynamic poster filename: CandidateName_FunctionName.png (Requirement 15)
  const posterFilename = createPosterFilename(
    nominee.full_name,
    category?.name || nominee.category_name
  );

  // Safe canvas to blob export helper
  const canvasToBlobSafe = (canvas, mime = 'image/png') => {
    return new Promise((resolve) => {
      if (!canvas || typeof canvas.toBlob !== 'function') {
        resolve(null);
        return;
      }
      try {
        canvas.toBlob((blob) => resolve(blob), mime);
      } catch (err) {
        console.error('Canvas export to blob error:', err);
        resolve(null);
      }
    });
  };

  // 1. Personalized Poster PNG — filename: CandidateName_FunctionName.png
  const finalPosterBlob = directPosterBlob || (posterCanvas ? await canvasToBlobSafe(posterCanvas, 'image/png') : null);
  if (finalPosterBlob) {
    zip.file(posterFilename, finalPosterBlob);
  }

  // 2. Personalized Story PNG (9:16)
  const finalStoryBlob = directStoryBlob || (storyCanvas ? await canvasToBlobSafe(storyCanvas, 'image/png') : null);
  if (finalStoryBlob) {
    zip.file(`${prefix}-Instagram-Story-9x16.png`, finalStoryBlob);
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
