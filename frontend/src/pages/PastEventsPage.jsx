import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { api } from '../api';

export default function PastEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/past-events').then((data) => {
      if (Array.isArray(data)) setEvents(data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Fallback static data until DB is populated
  const displayEvents = events.length > 0 ? events : [
    {
      id: 1,
      slug: 'telugu-icon-awards-2026',
      name: 'Telugu Icon Awards 2026',
      event_date: '2026-08-30',
      year: 2026,
      venue: 'Hyderabad',
      description: 'The Telugu Icon Awards 2026, held on 30 August 2026 in Hyderabad, recognized outstanding talent across cinema, culture, and entertainment. A landmark celebration of Telugu excellence organized by Pracharam Media.',
    },
    {
      id: 2,
      slug: 'stree-shakti-pratibha-awards-2025',
      name: 'Stree Shakti Pratibha Awards 2025',
      event_date: null,
      year: 2025,
      venue: 'Hyderabad',
      description: 'The Stree Shakti Pratibha Awards 2025 celebrated remarkable women achievers across multiple fields, recognizing their courage, contribution, and leadership. Organized by Pracharam Media.',
    },
  ];

  return (
    <PageTransition>
      <section className="relative py-12 sm:py-20 bg-hero-gradient overflow-hidden px-3 sm:px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,#0a0a0a_100%)]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <p className="section-subtitle">Our Legacy</p>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4">
            <span className="gold-text">Past</span> <span className="text-white">Events</span>
          </h1>
          <p className="text-white/60 max-w-xl mx-auto text-xs sm:text-base leading-relaxed">
            A permanent archive of excellence. Every event, every icon, every moment — preserved here for Telugu digital history.
          </p>
        </div>
      </section>

      <section className="py-10 sm:py-16 bg-ink-900">
        <div className="max-w-5xl mx-auto px-4">
          {loading ? (
            <div className="text-center text-white/40 py-16 sm:py-20 text-sm">Loading past events...</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-5 sm:gap-8">
              {displayEvents.map((ev, i) => (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link to={`/past-events/${ev.slug}`} className="group block glass-card overflow-hidden hover:border-champagne-500/40 transition-all duration-300">
                    {/* Event Poster Placeholder */}
                    <div className="aspect-[16/9] bg-gradient-to-br from-burgundy-900 to-ink-800 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(180,120,40,0.15),transparent)]" />
                      <div className="text-center px-8">
                        <div className="text-5xl mb-3">🏆</div>
                        <div className="font-display text-champagne-400 font-bold text-lg leading-tight">{ev.name}</div>
                      </div>
                      <div className="absolute top-3 right-3 bg-champagne-500/20 border border-champagne-500/40 text-champagne-300 text-xs font-bold px-3 py-1 rounded-full">
                        {ev.year}
                      </div>
                    </div>
                    <div className="p-6">
                      <h2 className="font-display text-xl font-bold text-white group-hover:text-champagne-400 transition-colors mb-2">{ev.name}</h2>
                      <div className="flex items-center gap-3 text-white/40 text-xs mb-3">
                        {ev.event_date && <span>📅 {new Date(ev.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
                        {ev.venue && <span>📍 {ev.venue}</span>}
                      </div>
                      <p className="text-white/50 text-sm leading-relaxed line-clamp-3">{ev.description}</p>
                      <div className="mt-4 inline-flex items-center text-champagne-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                        View Archive →
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Awardee Archive CTA */}
      <section className="py-16 bg-ink-800/50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="section-subtitle">Archive</p>
          <h2 className="section-title">Awardee Directory</h2>
          <p className="text-white/50 mb-6">Search and discover every winner from every Telugu Icon event — a permanent record of digital excellence.</p>
          <Link to="/awardees" className="btn-gold">Browse Awardee Archive</Link>
        </div>
      </section>
    </PageTransition>
  );
}
