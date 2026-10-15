import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { api } from '../api';

const VIDEO_CATS = [
  { key: '', label: 'All' },
  { key: 'event_highlights', label: 'Event Highlights' },
  { key: 'creator_stories', label: 'Creator Stories' },
  { key: 'nominee_videos', label: 'Nominee Videos' },
  { key: 'voting_campaign', label: 'Voting Campaign' },
  { key: 'sponsor_videos', label: 'Sponsor Videos' },
  { key: 'previous_events', label: 'Previous Events' },
  { key: 'press_events', label: 'Press Events' },
];

export default function VideoHubPage() {
  const [videos, setVideos] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(null);

  useEffect(() => {
    setLoading(true);
    const url = filter ? `/media/videos?category=${filter}` : '/media/videos';
    api.get(url).then((d) => { if (Array.isArray(d)) setVideos(d); }).catch(() => {}).finally(() => setLoading(false));
  }, [filter]);

  return (
    <PageTransition>
      <section className="relative py-12 sm:py-20 bg-hero-gradient overflow-hidden px-3 sm:px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,#0a0a0a_100%)]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <p className="section-subtitle">Watch the Journey</p>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4">
            <span className="gold-text">Video</span> <span className="text-white">Hub</span>
          </h1>
          <p className="text-white/60 text-xs sm:text-base leading-relaxed">Event highlights, creator stories, nominee videos, and more.</p>
        </div>
      </section>

      <section className="py-10 sm:py-12 bg-ink-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap gap-2 mb-6 sm:mb-8 justify-center">
            {VIDEO_CATS.map((c) => (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 ${
                  filter === c.key ? 'bg-champagne-500 text-ink-900' : 'bg-ink-800 text-white/60 border border-white/10 hover:border-champagne-500/40'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-20 text-white/40">Loading videos...</div>
          ) : videos.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🎬</div>
              <p className="text-white/50 text-lg">Videos coming soon.</p>
              <p className="text-white/30 text-sm mt-2">Watch this space for event highlights and creator stories.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((v, i) => (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card overflow-hidden group cursor-pointer hover:border-champagne-500/40 transition-all"
                  onClick={() => setPlaying(v)}
                >
                  <div className="aspect-video bg-gradient-to-br from-ink-800 to-burgundy-900 relative overflow-hidden">
                    {v.youtube_id && (
                      <img
                        src={`https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`}
                        alt={v.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    )}
                    {!v.youtube_id && v.thumbnail_url && (
                      <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" loading="lazy" />
                    )}
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/10 transition-all">
                      <div className="w-14 h-14 rounded-full bg-red-600/90 flex items-center justify-center text-white text-xl shadow-lg group-hover:scale-110 transition-transform">▶</div>
                    </div>
                    {v.duration && <div className="absolute bottom-2 right-2 bg-black/70 text-white/80 text-xs px-2 py-0.5 rounded">{v.duration}</div>}
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-champagne-400 uppercase tracking-wider mb-1">
                      {VIDEO_CATS.find(c => c.key === v.category)?.label || v.category}
                    </div>
                    <h3 className="font-semibold text-white text-sm leading-tight group-hover:text-champagne-300 transition-colors">{v.title}</h3>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Video Player Modal */}
      {playing && playing.youtube_id && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setPlaying(null)}>
          <button className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl z-10">✕</button>
          <div className="w-full max-w-4xl aspect-video" onClick={(e) => e.stopPropagation()}>
            <iframe
              className="w-full h-full rounded-xl"
              src={`https://www.youtube.com/embed/${playing.youtube_id}?autoplay=1`}
              title={playing.title}
              frameBorder="0"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </PageTransition>
  );
}
