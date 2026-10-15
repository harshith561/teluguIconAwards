// Vercel Routing Middleware - Individual Nominee Pages & Direct Voting add-on
//
// WHY THIS EXISTS
// The site is a client-rendered SPA. WhatsApp, Facebook, X and Telegram build
// share previews by fetching the URL and reading the raw HTML - they never run
// JavaScript, so React never gets a chance to set the tags. Before this, every
// nominee link previewed as the generic site title with no image.
//
// This middleware serves the built index.html for nominee routes with real,
// per-nominee <title>, meta description, canonical URL, Open Graph and Twitter
// card tags fetched from the API, plus JSON-LD. It also serves robots.txt and a
// sitemap.xml generated live from the approved nominee list.
//
// Every matched path is answered here, so nothing depends on chaining to the
// origin - if the API is unreachable the middleware falls through to the SPA
// shell rather than taking the site down.
//
// DEPLOY
//   - This file sits in `frontend/` because the Vercel project's Root Directory
//     is set to `frontend`. Vercel only picks up Routing Middleware from the
//     root of the project root directory, so it must live here, not at the
//     repo root.
//   - Output Directory stays `dist` (Vite preset default).
//   - No env vars are required. API_BASE falls back to the Railway backend and
//     the public origin is taken from the incoming request.

const API_BASE = (process.env.API_BASE_URL || 'https://awards-production-13eb.up.railway.app/api').replace(/\/+$/, '');
const EVENT = 'Telugu Icon Digital & Influencer Awards 2026';

// Public origin for canonical URLs, Open Graph URLs and the sitemap.
//
// Derived from the incoming request so it always matches the host actually
// being served: production, a preview deploy, or a second Vercel project all
// self-correct instead of emitting links to some other deployment. Set
// VITE_SITE_URL only to force canonical URLs to a different origin (e.g. the
// real custom domain) while previewing from elsewhere.
const siteUrlFor = (request) => {
  const override = (process.env.VITE_SITE_URL || '').trim().replace(/\/+$/, '');
  if (override) return override;
  try {
    return new URL(request.url).origin;
  } catch (_) {
    return '';
  }
};

const escapeHtml = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

// og:image must be an absolute URL or the preview is dropped entirely.
// Uploads are served by the API host, so relative paths are prefixed there.
const mediaUrl = (photoUrl, siteUrl) => {
  if (!photoUrl) return `${siteUrl}/og-default.jpg`;
  if (/^https?:\/\//i.test(photoUrl)) return photoUrl;
  const origin = API_BASE.replace(/\/api$/, '');
  return `${origin}${photoUrl.startsWith('/') ? '' : '/'}${photoUrl}`;
};

const fetchNominee = async (slugOrId) => {
  try {
    const res = await fetch(`${API_BASE}/nominees/${encodeURIComponent(slugOrId)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body && body.id ? body : null;
  } catch (_) {
    return null;
  }
};

const fetchIndexHtml = async (request) => {
  const url = new URL('/index.html', request.url);
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch (_) {
    return null;
  }
};

// Replace the tag if the shell already has one, otherwise append before </head>.
const upsertTag = (html, pattern, tag) =>
  pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `  ${tag}\n</head>`);

const injectMeta = (html, nominee, canonicalSlug, siteUrl) => {
  const canonical = `${siteUrl}/nominee/${canonicalSlug}`;
  const title = `${nominee.full_name} — ${nominee.category_name} Nominee | ${EVENT}`;
  const description = `${nominee.full_name} is an Official Nominee for ${nominee.category_name} at the ${EVENT}. Vote now — it takes 30 seconds.`;
  const image = mediaUrl(nominee.photo_url, siteUrl);
  const code = nominee.nominee_code || 'TIC26';

  let out = html;

  out = upsertTag(out, /<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  out = upsertTag(out, /<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${escapeHtml(description)}">`);
  out = upsertTag(out, /<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${canonical}">`);

  // Strip the generic defaults from index.html first so the nominee values win
  // and nothing is duplicated.
  out = out.replace(/<meta\s+property="og:[^>]*>/gi, '');
  out = out.replace(/<meta\s+name="twitter:[^>]*>/gi, '');

  const tags = [
    `<meta property="og:type" content="profile">`,
    `<meta property="og:site_name" content="${escapeHtml(EVENT)}">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    `<meta property="og:image:alt" content="${escapeHtml(`${nominee.full_name} — Official Nominee`)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(image)}">`,
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: nominee.full_name,
    description: nominee.bio || description,
    image: nominee.photo_url ? mediaUrl(nominee.photo_url, siteUrl) : undefined,
    url: canonical,
    identifier: code,
    award: EVENT,
    jobTitle: `Official Nominee — ${nominee.category_name}`,
  };

  out = out.replace(
    '</head>',
    `  ${tags.join('\n  ')}\n  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n</head>`
  );

  return out;
};

const notFoundPage = (siteUrl) => `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, follow">
<title>Nominee Page Not Available | ${escapeHtml(EVENT)}</title>
<meta name="description" content="This nominee page is not available.">
<link rel="canonical" href="${siteUrl}/nominees">
</head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0a;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;padding:24px">
  <div>
    <div style="font-size:56px">🔍</div>
    <h1 style="font-size:28px;margin:16px 0 8px;color:#D4AF37">Nominee Page Not Available</h1>
    <p style="color:rgba(255,255,255,.55);max-width:420px;margin:0 auto 24px">
      This page goes live once the nomination is approved, and is taken down if the nomination is withdrawn.
    </p>
    <a href="${siteUrl}/nominees" style="display:inline-block;padding:12px 24px;border-radius:12px;background:#D4AF37;color:#0a0a0a;font-weight:700;text-decoration:none">Browse All Nominees</a>
  </div>
</body></html>`;

const robotsTxt = (siteUrl) => `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api

Sitemap: ${siteUrl}/sitemap.xml
`;

const buildSitemap = async (siteUrl) => {
  const staticPaths = ['/', '/awards', '/vote', '/nominees', '/nominate', '/about', '/faq', '/contact', '/sponsors'];
  let nomineeEntries = '';
  try {
    const res = await fetch(`${API_BASE}/nominees`, { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list)) {
        nomineeEntries = list
          .filter((n) => n && n.slug)
          .map((n) => `<url><loc>${siteUrl}/nominee/${n.slug}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`)
          .join('');
      }
    }
  } catch (_) {
    // Still a valid sitemap without nominee entries.
  }
  const statics = staticPaths
    .map((p) => `<url><loc>${siteUrl}${p}</loc><changefreq>monthly</changefreq><priority>${p === '/' ? '1.0' : '0.6'}</priority></url>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${statics}${nomineeEntries}</urlset>`;
};

const htmlResponse = (body, status, cacheControl) =>
  new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': cacheControl,
    },
  });

export const config = {
  matcher: ['/nominee/:path*', '/vote/:path*', '/sitemap.xml', '/robots.txt'],
};

export default async function middleware(request) {
  const { pathname } = new URL(request.url);
  const siteUrl = siteUrlFor(request);

  if (pathname === '/robots.txt') {
    return new Response(robotsTxt(siteUrl), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
    });
  }

  if (pathname === '/sitemap.xml') {
    return new Response(await buildSitemap(siteUrl), {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  }

  const match = pathname.match(/^\/(?:nominee|vote)\/([^/]+)\/?$/);
  if (!match) return undefined;

  const slug = decodeURIComponent(match[1]);
  const nominee = await fetchNominee(slug);

  // API unreachable / nominee archived: a real 404 is the correct answer for a
  // crawler and better than a soft-200 on a dead link.
  if (!nominee) {
    return htmlResponse(notFoundPage(siteUrl), 404, 'public, max-age=0, s-maxage=300');
  }

  const shell = await fetchIndexHtml(request);
  if (!shell) {
    // The app shell could not be read - serve a usable page rather than a 500.
    return htmlResponse(
      `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(EVENT)}</title>`
      + `<link rel="canonical" href="${siteUrl}/nominees"></head>`
      + '<body style="font-family:system-ui,sans-serif;background:#0a0a0a;color:#fff;text-align:center;padding:80px 24px">'
      + '<h1 style="color:#D4AF37">Please try again shortly</h1>'
      + `<p><a style="color:#D4AF37" href="${siteUrl}">Back to ${escapeHtml(EVENT)}</a></p>`
      + '</body></html>',
      503,
      'public, max-age=0, s-maxage=60'
    );
  }

  return htmlResponse(
    injectMeta(shell, nominee, nominee.slug || slug, siteUrl),
    200,
    'public, max-age=0, s-maxage=600, stale-while-revalidate=86400'
  );
}
