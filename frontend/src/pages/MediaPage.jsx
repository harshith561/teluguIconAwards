import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { api } from '../api';

const MEDIA_TYPES = [
  { key: '', label: 'All Updates' },
  { key: 'press_release', label: 'Press Releases' },
  { key: 'news', label: 'Media Coverage' },
  { key: 'announcement', label: 'Official Announcements' },
  { key: 'kit', label: 'Media Kits & Assets' },
];

const FALLBACK_MEDIA = [
  {
    id: 1,
    item_type: 'press_release',
    title: 'Telugu Icon Digital & Influencer Awards 2026 Officially Announced',
    source: 'Press Trust / Official Release',
    published_date: '2026-03-01',
    description: 'Celebrating 40 dynamic creator categories honoring Telugu digital creators across YouTube, Instagram, and emerging platforms with 100% transparent public voting.',
    url: '#',
    thumbnail_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 2,
    item_type: 'news',
    title: 'Hyderabad to Host the Biggest Telugu Digital Creator Gala on August 30',
    source: 'Deccan Chronicle Digital',
    published_date: '2026-03-10',
    description: 'With over 5,000 attendees expected across two mega sessions (10 AM–2 PM & 3 PM–7 PM), the gala brings together top digital icons, jury members, and fans.',
    url: '#',
    thumbnail_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 3,
    item_type: 'announcement',
    title: 'Transparent Public Voting Engine Powered by OTP Verification Launched',
    source: 'TIA Organizing Committee',
    published_date: '2026-03-15',
    description: 'Strict anti-fraud protocols ensure 1 vote per category per verified mobile number, accompanied by real-time public leaderboard auditing.',
    url: '#',
    thumbnail_url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 4,
    item_type: 'kit',
    title: 'Official Media Kit 2026 — Logos, Badges, & Guidelines (PDF & Vector)',
    source: 'Brand Assets Team',
    published_date: '2026-03-18',
    description: 'High-resolution logo pack, typography guides, official brand colors, and certified press badges for print and digital publishing.',
    url: '#',
    thumbnail_url: 'https://images.unsplash.com/photo-1542744094-24638eff58bb?auto=format&fit=crop&w=800&q=80',
  },
];

export default function MediaPage() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = filter ? `/media?type=${filter}` : '/media';
    api.get(url)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setItems(data);
        } else {
          const filtered = filter ? FALLBACK_MEDIA.filter((m) => m.item_type === filter) : FALLBACK_MEDIA;
          setItems(filtered);
        }
      })
      .catch(() => {
        const filtered = filter ? FALLBACK_MEDIA.filter((m) => m.item_type === filter) : FALLBACK_MEDIA;
        setItems(filtered);
      })
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <PageTransition>
      {/* Hero */}
      <section className="relative py-12 sm:py-20 bg-hero-gradient overflow-hidden px-3 sm:px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,#0a0a0a_100%)]" />
        <div className="relative max-w-5xl mx-auto text-center">
          <p className="section-subtitle">Press & Public Relations</p>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4">
            <span className="gold-text">Media & Press</span> Center
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto text-xs sm:text-base leading-relaxed">
            Access official press statements, high-resolution media kits, announcements, and coverage from the Telugu Icon ecosystem.
          </p>

          <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-3 sm:gap-4">
            <a
              href="#press-kit"
              className="px-4 py-2 sm:px-6 sm:py-2.5 rounded-full bg-champagne-500 text-ink-900 font-semibold text-xs sm:text-sm hover:bg-champagne-400 transition-all shadow-gold"
            >
              Download Press Kit
            </a>
            <a
              href="#media-accreditation"
              className="px-4 py-2 sm:px-6 sm:py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white font-medium text-xs sm:text-sm border border-white/10 transition-all"
            >
              Press Accreditation
            </a>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 bg-ink-900 min-h-screen">
        <div className="max-w-7xl mx-auto px-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-10 justify-center">
            {MEDIA_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  filter === t.key
                    ? 'bg-champagne-500 text-ink-900 shadow-gold'
                    : 'bg-ink-800 text-white/60 border border-white/10 hover:border-champagne-500/40 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-20 text-white/40">
              <div className="w-10 h-10 border-4 border-champagne-500/30 border-t-champagne-500 rounded-full animate-spin mx-auto mb-4" />
              Loading media releases...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item, idx) => (
                <motion.div
                  key={item.id || idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="card-gold p-6 flex flex-col justify-between group hover:border-champagne-500/50 transition-all"
                >
                  <div>
                    {item.thumbnail_url && (
                      <div className="w-full h-44 rounded-xl overflow-hidden mb-5 bg-ink-800">
                        <img
                          src={item.thumbnail_url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-white/40 mb-3">
                      <span className="uppercase tracking-wider text-champagne-400/90 font-semibold px-2 py-0.5 rounded bg-champagne-500/10 border border-champagne-500/20">
                        {item.item_type?.replace('_', ' ') || 'Update'}
                      </span>
                      <span>{item.published_date ? new Date(item.published_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '2026'}</span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-white mb-2 leading-snug group-hover:text-champagne-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-white/60 text-sm leading-relaxed mb-4">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-white/40 italic">{item.source || 'Telugu Icon PR'}</span>
                    <a
                      href={item.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-champagne-400 hover:text-champagne-300 flex items-center gap-1"
                    >
                      Read Release →
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Downloadable Assets Section */}
          <div id="press-kit" className="mt-20 p-8 md:p-12 rounded-3xl bg-gradient-to-br from-ink-800 to-ink-950 border border-champagne-500/20 shadow-gold">
            <div className="max-w-3xl">
              <span className="text-xs font-bold uppercase tracking-widest text-champagne-400 bg-champagne-500/10 px-3 py-1 rounded-full border border-champagne-500/20">
                Official Assets
              </span>
              <h2 className="font-display text-2xl md:text-4xl font-bold mt-4 mb-3 text-white">
                Download Press Kits & Identity Packs
              </h2>
              <p className="text-white/60 text-sm md:text-base mb-6 leading-relaxed">
                Authorized digital assets for journalists, broadcasters, nominated creators, and brand partners. Includes vector logos, typography specs, color palettes, and official press releases.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-ink-900/80 border border-white/5">
                  <div className="text-champagne-400 text-2xl mb-2">📁</div>
                  <div className="font-bold text-white text-sm">Official Logo (PNG)</div>
                  <div className="text-xs text-white/40 mb-3">Full-colour lockup, 1400 × 467</div>
                  <div className="flex items-center gap-3">
                    <a href="/logo.png" download="telugu-icon-awards-2026-logo.png" className="text-xs font-semibold text-champagne-400 hover:underline">
                      Download PNG ↓
                    </a>
                    <a href="/brand/telugu-icon-logo.jpg" download="telugu-icon-awards-2026-logo.jpg" className="text-xs font-semibold text-champagne-400/70 hover:text-champagne-300 hover:underline">
                      JPEG
                    </a>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-ink-900/80 border border-white/5">
                  <div className="text-champagne-400 text-2xl mb-2">📄</div>
                  <div className="font-bold text-white text-sm">Fact Sheet 2026</div>
                  <div className="text-xs text-white/40 mb-3">Stats, category lists, jury & venue details</div>
                  <a href="#" onClick={(e) => { e.preventDefault(); alert('Fact sheet PDF will download once generated.'); }} className="text-xs font-semibold text-champagne-400 hover:underline">
                    Download PDF (2 MB) ↓
                  </a>
                </div>

                <div className="p-4 rounded-xl bg-ink-900/80 border border-white/5">
                  <div className="text-champagne-400 text-2xl mb-2">🎨</div>
                  <div className="font-bold text-white text-sm">Nominee Badge Kit</div>
                  <div className="text-xs text-white/40 mb-3">Social media vote campaign overlays</div>
                  <a href="/nominee-kit" className="text-xs font-semibold text-champagne-400 hover:underline">
                    Generate Kit →
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Press Contact */}
          <div id="media-accreditation" className="mt-12 p-8 rounded-2xl bg-ink-800/60 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Media Accreditation & Inquiries</h3>
              <p className="text-sm text-white/60">For press passes, broadcast rights, or executive interviews:</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="mailto:press@teluguiconawards.com"
                className="px-5 py-2.5 rounded-xl bg-champagne-500/10 border border-champagne-500/30 text-champagne-400 text-sm font-medium hover:bg-champagne-500/20 transition-all"
              >
                press@teluguiconawards.com
              </a>
              <a
                href="/contact"
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all"
              >
                Contact PR Desk
              </a>
            </div>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
