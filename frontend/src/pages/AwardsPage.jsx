import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import { api } from '../api';

export default function AwardsPage() {
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/categories')
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const jury = useMemo(() => categories.filter((c) => c.type === 'jury'), [categories]);
  const selfNomination = useMemo(() => categories.filter((c) => c.type === 'self_nomination'), [categories]);

  const filtered = useMemo(() => {
    let list = categories;
    if (activeTab === 'jury') list = jury;
    if (activeTab === 'self') list = selfNomination;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
      );
    }
    return list;
  }, [categories, jury, selfNomination, activeTab, search]);

  return (
    <PageTransition>
      {/* Hero */}
      <section className="relative py-12 sm:py-20 bg-gradient-to-br from-[#330000] via-[#820000] to-[#3d0000] text-center overflow-hidden px-3 sm:px-4">
        <div className="relative max-w-5xl mx-auto">
          <div className="text-[10px] tracking-[3px] sm:tracking-[4px] text-[#f1d99a] font-black uppercase mb-2">The Categories</div>
          <h1 className="font-serif-luxury text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-[#fff7e8] mb-3 sm:mb-4">
            {selfNomination.length} Public Categories{jury.length > 0 ? <span className="text-[#f1d99a]"> + {jury.length} Special Awards.</span> : '.'}
          </h1>
          <p className="text-[#f6e9d5] max-w-2xl mx-auto text-xs sm:text-base mb-6 sm:mb-8 leading-relaxed">
            {jury.length > 0
              ? `Every award clearly identifies its decision method: ${selfNomination.length} People’s Choice categories decided by public voting, and ${jury.length} Special Awards decided by the official jury.`
              : 'Every award category is decided by verified public voting.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-center items-center">
            <div className="inline-flex rounded border border-[rgba(216,181,107,0.3)] bg-black/40 p-1 flex-wrap justify-center">
              {[
                { key: 'all', label: `All Awards (${categories.length})` },
                { key: 'self', label: `Public Voting (${selfNomination.length})` },
                // Hidden when every category is publicly voted - an empty tab
                // reads as broken rather than as "none configured".
                ...(jury.length > 0 ? [{ key: 'jury', label: `Jury Awards (${jury.length})` }] : []),
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded text-[11px] sm:text-xs font-semibold transition-all ${
                    activeTab === t.key
                      ? 'bg-[#d8b56b] text-[#160505]'
                      : 'text-[#cdbda9] hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Search award category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 text-xs rounded bg-black/40 border border-[rgba(216,181,107,0.3)] text-white placeholder-white/40 focus:outline-none focus:border-[#d8b56b] w-full sm:w-64"
            />
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-10 sm:py-16 bg-[#160505]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-3.5 sm:p-4 rounded border border-[rgba(216,181,107,0.3)] bg-[#250909] text-xs text-[#f1d99a] mb-6 sm:mb-10 text-center leading-relaxed">
            📌 <strong>Nomination Rule:</strong> Each creator/influencer may self-nominate in a maximum of <strong>3 categories only</strong>, and each selected category must be genuinely relevant to their digital presence.
          </div>

          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filtered.map((cat, i) => (
              <motion.div
                key={cat.id || cat.slug}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.5) }}
                className="card-preview p-4 sm:p-6 flex flex-col justify-between group hover:border-[#d8b56b] transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                    <span className="badge-gold">
                      {!cat.voting_open
                        ? '👑 JURY AWARD · JURY SELECTED'
                        : '🗳 PEOPLE\'S CHOICE · PUBLIC VOTING'}
                    </span>
                    <span className="text-xs text-[#a99888] font-mono">#{String(cat.sort_order || i + 1).padStart(2, '0')}</span>
                  </div>
                  <h3 className="font-serif-luxury text-lg sm:text-xl font-bold text-[#f1d99a] group-hover:text-white transition-colors mb-2">
                    {cat.name}
                  </h3>
                  <p className="text-[#d7c8b8] text-xs leading-relaxed mb-4">
                    {cat.description || (!cat.voting_open
                      ? 'Special recognition selected by the official jury; not open for self-nomination or public voting.'
                      : 'Eligible for creator self-nomination and public voting, subject to category relevance and verification.')}
                  </p>
                </div>

                <div className="pt-3 sm:pt-4 border-t border-[rgba(216,181,107,0.15)] flex items-center justify-between">
                  {!cat.voting_open ? (
                    <span className="text-[11px] text-[#a99888] italic">Official Jury Decision</span>
                  ) : (
                    <Link to="/nominate" className="btn-gold text-xs py-1.5 px-3">
                      Self-Nominate →
                    </Link>
                  )}
                  <Link to={`/category/${cat.slug}`} className="text-white/40 hover:text-white text-xs">
                    View Details
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {loading && (
            <div className="text-center text-[#a99888] py-16 sm:py-20 text-sm">
              Loading award categories...
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center text-[#a99888] py-16 sm:py-20 text-sm">
              No categories match your search.
            </div>
          )}
        </div>
      </section>

      {/* How it works info */}
      <section className="py-10 sm:py-20 bg-[#120404] border-t border-[rgba(216,181,107,0.2)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <div className="text-[10px] tracking-[3px] sm:tracking-[4px] text-[#d8b56b] font-black uppercase mb-1">Structure</div>
            <h2 className="section-title text-xl sm:text-3xl md:text-4xl">How the Awards Work</h2>
            <p className="text-[#a99888] text-xs sm:text-sm max-w-2xl mx-auto mt-2">
              Fifty People’s Choice categories are decided by creator-led campaigns and public votes.
              Ten Jury &amp; Special Recognition Awards are selected by the official jury.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {[
              { n: '01', t: 'Self-Nominate', d: 'Creators submit their self-nomination in up to 3 categories that best fit their content and audience.' },
              { n: '02', t: 'Get Verified', d: 'Our team verifies every nomination — profile, digital presence and supporting content.' },
              { n: '03', t: 'Campaign Kit', d: 'Approved creators receive official badges, voting links, QR codes and campaign posters.' },
              { n: '04', t: 'Public Voting', d: 'Audiences vote with OTP verification, culminating in live winner announcements on stage.' },
            ].map((s) => (
              <div key={s.n} className="card-preview p-4 sm:p-6 text-center">
                <div className="text-2xl sm:text-3xl font-black text-[#d8b56b] font-serif-luxury mb-1.5 sm:mb-2">{s.n}</div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-1.5 sm:mb-2">{s.t}</h3>
                <p className="text-[#d7c8b8] text-xs leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 sm:mt-10 p-4 sm:p-6 card-preview max-w-3xl mx-auto text-center">
            <p className="text-[#d7c8b8] text-xs leading-relaxed">
              👑 <strong className="text-white">Jury &amp; Special Recognition Awards</strong> are evaluated by the official jury on contribution,
              influence, originality, impact and achievement — announced live at the awards ceremony on
              <span className="text-[#f1d99a] font-bold"> 16 November 2026</span> at Shilpakala Vedika, Hyderabad.
            </p>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}