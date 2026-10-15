import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { api, getAssetUrl } from '../api';

export default function NomineesPage() {
  const [nominees, setNominees] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/nominees').then((data) => {
      if (Array.isArray(data)) setNominees(data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = nominees.filter((n) =>
    n.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (n.category_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageTransition>
      <section className="relative py-12 sm:py-20 bg-hero-gradient overflow-hidden px-3 sm:px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,#0a0a0a_100%)]" />
        <div className="relative max-w-5xl mx-auto text-center">
          <p className="section-subtitle">The Stars</p>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4">
            <span className="gold-text">Nominees</span> <span className="text-white">Showcase</span>
          </h1>
          <p className="text-white/60 mb-6 sm:mb-8 text-xs sm:text-base leading-relaxed">Discover the creators nominated for the 2026 Telugu Icon Awards.</p>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nominees or categories..."
            className="input-field max-w-md mx-auto text-xs sm:text-sm"
          />
        </div>
      </section>

      <section className="py-10 sm:py-16 bg-ink-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-16 sm:py-20 text-white/40 text-sm">Loading nominees...</div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filtered.map((n, i) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link to={`/nominee/${n.slug || n.id}`} className="group block">
                    <div className="glass-card overflow-hidden group-hover:border-champagne-500/40 transition-all duration-300">
                      <div className="aspect-[16/10] bg-gradient-to-br from-ink-700 to-burgundy-900 relative overflow-hidden">
                        {n.photo_url ? (
                          <img src={getAssetUrl(n.photo_url)} alt={n.full_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-7xl">🏆</div>
                        )}
                        {n.featured && (
                          <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-champagne-500 text-ink-900 text-xs font-bold">
                            ⭐ Featured
                          </span>
                        )}
                      </div>
                      <div className="p-5">
                        <div className="flex items-baseline justify-between mb-1">
                          <h3 className="font-semibold text-white group-hover:text-champagne-400 transition-colors truncate">{n.full_name}</h3>
                          <span className="text-white/30 text-xs ml-2 shrink-0">{n.nominee_code}</span>
                        </div>
                        <p className="text-white/40 text-sm mb-3">{n.category_name}</p>
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-champagne-400 text-sm">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
                            </svg>
                            View Profile
                          </span>
                          <span className="text-white/40 text-xs">{n.vote_count.toLocaleString()} votes</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center text-white/40 py-20 glass-card">
              No nominees found{search ? ' matching your search' : ' yet'}.
              {!search && <div className="mt-4"><a href="/nominate" className="btn-gold">Nominate a Creator</a></div>}
            </div>
          )}
        </div>
      </section>

      <section className="relative py-20 bg-hero-gradient overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,#0a0a0a_100%)]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="section-subtitle">The Nominee Campaign Kit</p>
            <h2 className="section-title">Your Nomination. Your Audience. Your Campaign.</h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              Every approved nominee receives a complete digital campaign kit — everything you need to rally your
              community and climb the People's Choice standings.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
            {[
              { icon: '🖼️', t: 'Official Poster' },
              { icon: '🔗', t: 'Unique Voting Link' },
              { icon: '📸', t: 'Instagram Story Template' },
              { icon: '💬', t: 'WhatsApp Status Template' },
              { icon: '▶️', t: 'YouTube Community Copy' },
              { icon: '🎬', t: 'Video Announcement Template' },
              { icon: '🔳', t: 'Shareable QR Code' },
            ].map((k) => (
              <div key={k.t} className="glass-card p-5 text-center group hover:border-champagne-500/40 hover:bg-white/[0.07] transition-all duration-300">
                <div className="text-3xl mb-2">{k.icon}</div>
                <div className="text-white/70 text-xs font-medium group-hover:text-champagne-300 transition-colors">{k.t}</div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/nominate" className="btn-gold">Claim Your Campaign Kit</a>
            <Link to="/vote" className="btn-outline">Vote for an Icon</Link>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}