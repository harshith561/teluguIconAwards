import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { api } from '../api';

const STATIC_EVENTS = {
  'telugu-icon-awards-2026': {
    slug: 'telugu-icon-awards-2026',
    name: 'Telugu Icon Awards 2026',
    event_date: '2026-08-30',
    year: 2026,
    venue: 'Hyderabad',
    description: 'The Telugu Icon Awards 2026, held on 30 August 2026 in Hyderabad, was a landmark celebration of Telugu excellence across cinema, culture, and entertainment. Organized by Pracharam Media, the event brought together the brightest names in Telugu public life.',
    awardees: [],
  },
  'stree-shakti-pratibha-awards-2025': {
    slug: 'stree-shakti-pratibha-awards-2025',
    name: 'Stree Shakti Pratibha Awards 2025',
    event_date: null,
    year: 2025,
    venue: 'Hyderabad',
    description: 'The Stree Shakti Pratibha Awards 2025 celebrated remarkable women achievers across multiple fields, recognizing their courage, contribution, and leadership. Organized by Pracharam Media.',
    awardees: [],
  },
};

const EVENT_TABS = ['Overview', 'Awardees', 'Gallery', 'Media Coverage'];

export default function PastEventDetail() {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');

  useEffect(() => {
    api.get(`/past-events/${slug}`).then((data) => {
      if (data && data.slug) setEvent(data);
      else if (STATIC_EVENTS[slug]) setEvent(STATIC_EVENTS[slug]);
      else setError('Event not found');
    }).catch(() => {
      if (STATIC_EVENTS[slug]) setEvent(STATIC_EVENTS[slug]);
      else setError('Event not found');
    }).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="min-h-[70vh] flex items-center justify-center text-white/40">Loading...</div>;
  if (error || !event) return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-display text-4xl gold-text mb-4">Event Not Found</h1>
        <Link to="/past-events" className="btn-outline">← Back to Past Events</Link>
      </div>
    </div>
  );

  return (
    <PageTransition>
      <section className="relative py-12 sm:py-20 bg-hero-gradient overflow-hidden px-3 sm:px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,#0a0a0a_100%)]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <Link to="/past-events" className="inline-flex items-center text-white/40 hover:text-champagne-400 transition-colors text-xs sm:text-sm mb-4 sm:mb-6">
            ← Back to Past Events
          </Link>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-champagne-500/15 border border-champagne-500/30 text-champagne-400 text-xs font-semibold mb-3 sm:mb-4">
            {event.year} Archive
          </div>
          <h1 className="font-display text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-3 sm:mb-4">{event.name}</h1>
          <div className="flex items-center justify-center gap-3 sm:gap-4 text-white/40 text-xs sm:text-sm flex-wrap">
            {event.event_date && (
              <span>📅 {new Date(event.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            )}
            {event.venue && <span>📍 {event.venue}</span>}
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="bg-ink-900 border-b border-white/5 sticky top-16 lg:top-20 z-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex overflow-x-auto">
            {EVENT_TABS.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                  activeTab === t ? 'border-champagne-500 text-champagne-400' : 'border-transparent text-white/40 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="py-12 bg-ink-900">
        <div className="max-w-5xl mx-auto px-4">

          {activeTab === 'Overview' && (
            <div className="max-w-3xl">
              <h2 className="font-display text-2xl font-bold gold-text mb-6">About This Event</h2>
              <p className="text-white/70 leading-relaxed text-lg mb-8">{event.description}</p>
              <div className="glass-card p-6">
                <h3 className="font-display text-lg font-bold text-white mb-4">Event Details</h3>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  {event.event_date && <div><span className="text-white/40">Date</span><p className="text-white mt-1">{new Date(event.event_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p></div>}
                  {event.venue && <div><span className="text-white/40">Venue</span><p className="text-white mt-1">{event.venue}</p></div>}
                  <div><span className="text-white/40">Organized by</span><p className="text-white mt-1">Pracharam Media</p></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Awardees' && (
            <div>
              <h2 className="font-display text-2xl font-bold gold-text mb-6">Award Winners</h2>
              {event.awardees && event.awardees.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {event.awardees.map((a) => (
                    <motion.div key={a.id} whileHover={{ y: -2 }} className="glass-card p-5 hover:border-champagne-500/40 transition-all">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-ink-700 to-burgundy-900 flex items-center justify-center mb-3 overflow-hidden">
                        {a.photo_url ? <img src={a.photo_url} alt={a.name} className="w-full h-full object-cover" /> : <span className="text-2xl">🏆</span>}
                      </div>
                      <h3 className="font-semibold text-white mb-1">{a.name}</h3>
                      <p className="text-champagne-400 text-xs font-medium mb-1">{a.category}</p>
                      {a.award_type && <p className="text-white/30 text-xs">{a.award_type}</p>}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-white/40">
                  <div className="text-5xl mb-4">🏆</div>
                  <p>Awardee profiles will be published soon.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Gallery' && (
            <div className="text-center py-16 text-white/40">
              <div className="text-5xl mb-4">📸</div>
              <p className="text-lg text-white/60 mb-2">Photo Gallery</p>
              <p>Event photographs are being archived. Check back soon.</p>
            </div>
          )}

          {activeTab === 'Media Coverage' && (
            <div className="text-center py-16 text-white/40">
              <div className="text-5xl mb-4">📰</div>
              <p className="text-lg text-white/60 mb-2">Media Coverage</p>
              <p>Press releases and news articles are being compiled. Check back soon.</p>
            </div>
          )}
        </div>
      </section>
    </PageTransition>
  );
}
