import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { api } from '../api';

export default function AwardeesPage() {
  const [awardees, setAwardees] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ event_id: '', year: '', category: '', name: '' });
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/past-events').then((d) => { if (Array.isArray(d)) setPastEvents(d); }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.event_id) params.set('event_id', filters.event_id);
    if (filters.year)     params.set('year', filters.year);
    if (filters.category) params.set('category', filters.category);
    if (search)           params.set('name', search);
    api.get(`/awardees?${params.toString()}`).then((d) => {
      if (Array.isArray(d)) setAwardees(d);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [filters, search]);

  const years = [...new Set(pastEvents.map(e => e.year))].sort((a,b) => b - a);

  return (
    <PageTransition>
      <section className="relative py-12 sm:py-20 bg-hero-gradient overflow-hidden px-3 sm:px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,#0a0a0a_100%)]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <p className="section-subtitle">Hall of Fame</p>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4">
            <span className="gold-text">Awardee</span> <span className="text-white">Archive</span>
          </h1>
          <p className="text-white/60 max-w-xl mx-auto text-xs sm:text-base leading-relaxed">
            Every winner. Every icon. Every moment of recognition — preserved in a permanent searchable archive.
          </p>
        </div>
      </section>

      <section className="py-10 sm:py-12 bg-ink-900">
        <div className="max-w-6xl mx-auto px-4">
          {/* Search & Filters */}
          <div className="glass-card p-3.5 sm:p-5 mb-6 sm:mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                className="bg-ink-800 border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-champagne-500/60 transition-colors"
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="bg-ink-800 border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-champagne-500/60 transition-colors"
                value={filters.event_id}
                onChange={(e) => setFilters({ ...filters, event_id: e.target.value })}
              >
                <option value="">All Events</option>
                {pastEvents.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <select
                className="bg-ink-800 border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-champagne-500/60 transition-colors"
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              >
                <option value="">All Years</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <button
                onClick={() => { setFilters({ event_id: '', year: '', category: '', name: '' }); setSearch(''); }}
                className="btn-outline !py-2.5 text-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Results */}
          {loading ? (
            <div className="text-center py-20 text-white/40">Loading awardees...</div>
          ) : awardees.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🏆</div>
              <p className="text-white/50 text-lg">No awardees found.</p>
              <p className="text-white/30 text-sm mt-2">Awardee profiles will be published after events conclude.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {awardees.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  className="glass-card p-5 text-center hover:border-champagne-500/40 transition-all group"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-ink-700 to-burgundy-900 flex items-center justify-center mb-3 mx-auto overflow-hidden">
                    {a.photo_url ? <img src={a.photo_url} alt={a.name} className="w-full h-full object-cover" /> : <span className="text-2xl">🏆</span>}
                  </div>
                  <h3 className="font-semibold text-white text-sm group-hover:text-champagne-400 transition-colors mb-1 leading-tight">{a.name}</h3>
                  <p className="text-champagne-400 text-xs font-medium mb-1 leading-tight">{a.category}</p>
                  <p className="text-white/30 text-xs">{a.event_name} · {a.year}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </PageTransition>
  );
}
