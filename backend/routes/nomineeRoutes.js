const router = require('express').Router();
const { pool } = require('../config/database');
const { cached } = require('../utils/cache');
const { hasColumn } = require('../utils/nomineeIdentity');

// Achievements + social URLs are optional add-on columns (see
// migration-nominee-pages.sql). Probe once so the public API still works on a
// database that has not been migrated yet.
let profileColumnsPromise = null;
async function profileColumns() {
  if (!profileColumnsPromise) {
    profileColumnsPromise = (async () => {
      const columns = [];
      for (const column of ['achievements', 'youtube_url', 'instagram_url', 'facebook_url', 'website_url', 'other_profile_url']) {
        // eslint-disable-next-line no-await-in-loop
        if (await hasColumn('nominees', column)) columns.push(column);
      }
      return columns;
    })();
  }
  return profileColumnsPromise;
}

router.get('/', async (req, res) => {
  try {
    const { category, status, featured } = req.query;
    const key = `nominees:${category || ''}|${status || ''}|${featured || ''}`;
    const extras = await profileColumns();
    const rows = await cached(key, 30, async () => {
      let sql = `SELECT n.id, n.full_name, n.slug, n.bio, n.photo_url, n.social_handle, n.followers_count,
                        n.featured, n.status, n.nominee_code, n.vote_count, n.category_id,
                        c.name AS category_name, c.slug AS category_slug${extras.map((c) => `, n.${c}`).join('')}
                 FROM nominees n
                 JOIN categories c ON n.category_id = c.id
                 LEFT JOIN nominations nom ON n.nomination_id = nom.id
                 WHERE 1=1`;
      const params = [];
      // Accept either a category slug or a numeric category id.
      if (category) { sql += ' AND (c.slug = ? OR CAST(c.id AS CHAR) = ?)'; params.push(category, String(category)); }
      if (status) { sql += ' AND n.status = ?'; params.push(status); }
      if (featured) { sql += ' AND n.featured = 1'; }
      sql += " AND n.status = 'approved' AND (n.nomination_id IS NULL OR nom.status = 'shortlisted') ORDER BY n.vote_count DESC, n.featured DESC, n.id ASC";
      const [rows] = await pool.query(sql, params);
      return rows;
    });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/featured', async (req, res) => {
  try {
    const rows = await cached('nominees:featured', 30, async () => {
      const [rows] = await pool.query(
        `SELECT n.id, n.full_name, n.slug, n.bio, n.photo_url, n.social_handle, n.followers_count,
                n.nominee_code, n.vote_count, c.name AS category_name
         FROM nominees n
         JOIN categories c ON n.category_id = c.id
         LEFT JOIN nominations nom ON n.nomination_id = nom.id
         WHERE n.featured = 1 AND n.status = 'approved' AND (n.nomination_id IS NULL OR nom.status = 'shortlisted')
         ORDER BY n.vote_count DESC LIMIT 12`
      );
      return rows;
    });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id/poster-data', async (req, res) => {
  try {
    const { id } = req.params;
    const isNumeric = /^\d+$/.test(id);
    let nomineeSql = `SELECT n.id, n.full_name, n.slug, n.bio, n.photo_url, n.social_handle,
                             n.followers_count, n.featured, n.status, n.nominee_code, n.vote_count,
                             n.category_id, c.name AS category_name, c.slug AS category_slug,
                             c.poster_template, c.poster_theme_color, c.poster_badge_text, c.poster_tagline
                        FROM nominees n
                        JOIN categories c ON n.category_id = c.id
                       WHERE `;
    const nomineeParams = [];
    if (isNumeric) {
      nomineeSql += '(n.id = ? OR n.slug = ?) LIMIT 1';
      nomineeParams.push(parseInt(id, 10), id);
    } else {
      nomineeSql += 'n.slug = ? LIMIT 1';
      nomineeParams.push(id);
    }

    const [nominees] = await pool.query(nomineeSql, nomineeParams);
    if (!nominees.length) return res.status(404).json({ message: 'Nominee not found' });

    const nominee = nominees[0];

    // Fetch active sponsors specifically mapped to this category
    let [sponsors] = await pool.query(
      `SELECT cs.id AS association_id, cs.role, cs.sort_order AS display_order,
              s.id, s.id AS sponsor_id, s.name, s.tier, s.image_id,
              COALESCE(CASE WHEN s.image_id IS NOT NULL THEN CONCAT('/api/images/', s.image_id, '/file') ELSE NULL END, s.logo_url) AS logo_url,
              s.website_url, s.tagline, COALESCE(s.is_active, 1) AS is_active
         FROM category_sponsors cs
         JOIN sponsors s ON cs.sponsor_id = s.id
        WHERE cs.category_id = ? AND s.is_active = 1
        ORDER BY cs.sort_order ASC, s.sort_order ASC, s.id ASC`,
      [nominee.category_id]
    );

    // Fetch all active global sponsors (Title Partner, Powered By, Co-Powered By, etc.)
    const [globalSpons] = await pool.query(
      `SELECT NULL AS association_id,
              CASE
                WHEN tier = 'title_partner' THEN 'Title Partner'
                WHEN tier = 'powered_by' THEN 'Powered By'
                WHEN tier = 'co_powered_by' THEN 'Co-Powered By'
                ELSE 'Official Partner'
              END AS role,
              sort_order AS display_order,
              id, id AS sponsor_id, name, tier, image_id,
              COALESCE(CASE WHEN image_id IS NOT NULL THEN CONCAT('/api/images/', image_id, '/file') ELSE NULL END, logo_url) AS logo_url,
              website_url, tagline, is_active
         FROM sponsors
        WHERE is_active = 1
        ORDER BY CASE tier
          WHEN 'title_partner' THEN 1
          WHEN 'powered_by' THEN 2
          WHEN 'co_powered_by' THEN 3
          ELSE 4
        END ASC, sort_order ASC, id ASC`
    );

    // Merge: include all category sponsors + all global sponsors without duplicate sponsor IDs
    const combinedSpons = [...sponsors];
    for (const gs of globalSpons) {
      const exists = combinedSpons.some((r) => (r.sponsor_id || r.id) === gs.id);
      if (!exists) {
        combinedSpons.push(gs);
      }
    }

    // Sort by tier precedence: Title Partner > Powered By > Co-Powered By > Category Partner
    combinedSpons.sort((a, b) => {
      const tierRank = (t) => {
        if (t === 'title_partner') return 1;
        if (t === 'powered_by') return 2;
        if (t === 'co_powered_by') return 3;
        return 4;
      };
      return tierRank(a.tier) - tierRank(b.tier) || (a.sort_order || 0) - (b.sort_order || 0);
    });

    sponsors = combinedSpons;

    const warnings = [];
    if (!nominee.photo_url) {
      warnings.push('Nominee photo is missing. An elegant monogram avatar will be rendered.');
    }
    sponsors.forEach((sp) => {
      if (!sp.logo_url) {
        warnings.push(`Sponsor "${sp.name}" has no logo uploaded. Golden trophy cup badge will be rendered.`);
      }
    });

    res.json({
      nominee: {
        id: nominee.id,
        full_name: nominee.full_name,
        slug: nominee.slug,
        nominee_code: nominee.nominee_code,
        photo_url: nominee.photo_url,
        social_handle: nominee.social_handle,
        followers_count: nominee.followers_count,
        category_id: nominee.category_id,
        category_name: nominee.category_name,
      },
      category: {
        id: nominee.category_id,
        name: nominee.category_name,
        slug: nominee.category_slug,
        poster_template: nominee.poster_template || 'gold_prestige',
        poster_theme_color: nominee.poster_theme_color || '#D4AF37',
        poster_badge_text: nominee.poster_badge_text || 'OFFICIAL NOMINEE',
        poster_tagline: nominee.poster_tagline || 'Telugu Icon Awards 2026',
      },
      sponsors,
      event: {
        name: 'Telugu Icon Digital & Influencer Awards 2026',
        short_name: 'Telugu Icon Awards 2026',
        brand_title: 'TELUGU ICON',
        brand_subtitle: 'DIGITAL & INFLUENCER AWARDS 2026',
        date: '16 November 2026',
        venue: 'Shilpakala Vedika, Hyderabad',
        organizer: 'Presented by Pracharam Media',
        hashtags: '#TeluguIconAwards2026 #TIA2026',
      },
      validation: {
        has_photo: Boolean(nominee.photo_url),
        sponsors_count: sponsors.length,
        warnings,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const isNumeric = /^\d+$/.test(id);
    const rows = await cached(`nominee:${id}`, 30, async () => {
      let sql;
      let params;
      if (isNumeric) {
        // Try by numeric ID first, then fall back to slug
        sql = `SELECT n.*, c.name AS category_name, c.slug AS category_slug, c.description AS category_description, c.voting_open,
                      c.poster_template, c.poster_theme_color, c.poster_badge_text, c.poster_tagline
               FROM nominees n
               JOIN categories c ON n.category_id = c.id
               LEFT JOIN nominations nom ON n.nomination_id = nom.id
               WHERE (n.id = ? OR n.slug = ?)
                 AND n.status = 'approved'
                 AND (n.nomination_id IS NULL OR nom.status = 'shortlisted')
               LIMIT 1`;
        params = [parseInt(id, 10), id];
      } else {
        // Slug lookup
        sql = `SELECT n.*, c.name AS category_name, c.slug AS category_slug, c.description AS category_description, c.voting_open,
                      c.poster_template, c.poster_theme_color, c.poster_badge_text, c.poster_tagline
               FROM nominees n
               JOIN categories c ON n.category_id = c.id
               LEFT JOIN nominations nom ON n.nomination_id = nom.id
               WHERE n.slug = ?
                 AND n.status = 'approved'
                 AND (n.nomination_id IS NULL OR nom.status = 'shortlisted')
               LIMIT 1`;
        params = [id];
      }
      const [rows] = await pool.query(sql, params);
      return rows;
    });
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Nominee not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;