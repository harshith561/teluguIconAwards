import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { api } from '../api';

const GALLERY_CATS = [
  { key: '', label: 'All' },
  { key: 'telugu_icon_digital_2026', label: 'Telugu Icon Digital 2026' },
  { key: 'telugu_icon_2026', label: 'Telugu Icon Awards 2026' },
  { key: 'stree_shakti_2025', label: 'Stree Shakti 2025' },
  { key: 'press_events', label: 'Press Events' },
  { key: 'launch_events', label: 'Launch Events' },
  { key: 'behind_scenes', label: 'Behind the Scenes' },
];

export default function GalleryPage() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    setLoading(true);
    const url = filter ? `/gallery?category=${filter}` : '/gallery';
    api.get(url).then((d) => { if (Array.isArray(d)) setItems(d); }).catch(() => {}).finally(() => setLoading(false));
  }, [filter]);

  return (
    <PageTransition>
      <section className="relative py-12 sm:py-20 bg-hero-gradient overflow-hidden px-3 sm:px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,#0a0a0a_100%)]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <p className="section-subtitle">Visual Archive</p>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4">
            <span className="gold-text">Gallery</span>
          </h1>
          <p className="text-white/60 text-xs sm:text-base leading-relaxed">Photos, moments, and milestones from the Telugu Icon ecosystem.</p>
        </div>
      </section>

      <section className="py-10 sm:py-12 bg-ink-900">
        <div className="max-w-7xl mx-auto px-4">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-6 sm:mb-8 justify-center">
            {GALLERY_CATS.map((c) => (
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
            <div className="text-center py-20 text-white/40">Loading gallery...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📸</div>
              <p className="text-white/50 text-lg">Gallery content coming soon.</p>
              <p className="text-white/30 text-sm mt-2">Photos and videos will be uploaded as events unfold.</p>
            </div>
          ) : (
            <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
              {items.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.03 }}
                  className="break-inside-avoid cursor-pointer group"
                  onClick={() => item.item_type === 'image' && setLightbox(item)}
                >
                  {item.item_type === 'image' && (
                    <div className="rounded-xl overflow-hidden border border-white/10 group-hover:border-champagne-500/40 transition-all">
                      <img src={item.url} alt={item.title || ''} className="w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    </div>
                  )}
                  {item.item_type === 'youtube' && (
                    <div className="rounded-xl overflow-hidden border border-white/10 relative">
                      <img src={`https://img.youtube.com/vi/${item.url}/hqdefault.jpg`} alt={item.title || ''} className="w-full object-cover" loading="lazy" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">▶</div>
                      </div>
                    </div>
                  )}
                  {item.title && <p className="text-white/40 text-xs mt-1 px-1 truncate">{item.title}</p>}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl">✕</button>
          <img src={lightbox.url} alt={lightbox.title || ''} className="max-h-[90vh] max-w-full rounded-xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </PageTransition>
  );
}
