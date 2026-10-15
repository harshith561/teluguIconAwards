import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import OtpVote from '../components/OtpVote';
import { api, getAssetUrl } from '../api';

export default function CategoryDetail() {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [nominees, setNominees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [votingNominee, setVotingNominee] = useState(null);

  useEffect(() => {
    setLoading(true);
    // Fetch category info and nominees
    Promise.all([
      api.get(`/categories/${slug}`).catch(() => null),
      api.get(`/nominees?category=${slug}`).catch(() => []),
    ]).then(([catData, nomData]) => {
      if (catData && !catData.message) {
        setCategory(catData);
      }
      if (Array.isArray(nomData)) {
        setNominees(nomData);
      }
    }).finally(() => setLoading(false));
  }, [slug]);

  const refreshVotes = () => {
    api.get(`/nominees?category=${slug}`).then((d) => {
      if (Array.isArray(d)) setNominees(d);
    }).catch(() => {});
  };

  const totalVotes = nominees.reduce((acc, n) => acc + (Number(n.vote_count) || 0), 0);

  return (
    <PageTransition>
      {/* Category Hero */}
      <section className="relative py-12 sm:py-20 bg-hero-gradient overflow-hidden px-3 sm:px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,#0a0a0a_100%)]" />
        <div className="relative max-w-5xl mx-auto">
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 text-xs md:text-sm text-white/40 mb-4 sm:mb-6">
            <Link to="/" className="hover:text-champagne-400">Home</Link>
            <span>/</span>
            <Link to="/awards" className="hover:text-champagne-400">Categories</Link>
            <span>/</span>
            <span className="text-white/80 truncate">{category?.name || slug}</span>
          </nav>

          {loading ? (
            <div className="py-12 text-center text-white/40">Loading category details...</div>
          ) : (
            <div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <span className="text-2xl sm:text-3xl">{category?.icon || '🏆'}</span>
                <span className="px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-champagne-500/10 text-champagne-400 border border-champagne-500/20 uppercase tracking-wider">
                  {category?.voting_open !== false ? "People's Choice (Public Vote)" : 'Grand Jury Selection'}
                </span>
                {category?.voting_open !== false && (
                  <span className="px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Live Voting Active
                  </span>
                )}
              </div>

              <h1 className="font-display text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-3 sm:mb-4 leading-tight">
                {category?.name || slug.replace(/-/g, ' ').toUpperCase()}
              </h1>
              <p className="text-white/60 text-xs sm:text-base md:text-lg max-w-3xl leading-relaxed mb-6">
                {category?.description || 'Honoring the most engaging, creative, and impactful Telugu digital creators shaping the landscape in this category.'}
              </p>

              {/* Category Sponsor Strip */}
              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-champagne-500/10 border border-champagne-500/30 flex items-center justify-center text-champagne-400 text-base sm:text-lg">
                    ⭐
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-xs text-white/40 uppercase tracking-wider font-semibold">Category Partner</div>
                    <div className="text-xs sm:text-sm font-bold text-white">Presented by Official Telugu Icon Partner</div>
                  </div>
                </div>
                <Link
                  to="/sponsors#partner-form"
                  className="px-4 py-2 rounded-xl bg-champagne-500/10 hover:bg-champagne-500/20 text-champagne-400 border border-champagne-500/30 text-xs font-semibold transition-all"
                >
                  Sponsor this Category →
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Main Nominees & Leaderboard */}
      <section className="py-14 bg-ink-900 min-h-screen">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Nominees Grid (2 Cols) */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold font-display text-white">Official Nominees</h2>
                  <p className="text-white/40 text-xs mt-1">Verified nominees competing for the 2026 Icon trophy.</p>
                </div>
                <Link
                  to={`/nominate?category=${category?.id || ''}`}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium transition-all"
                >
                  + Nominate Someone
                </Link>
              </div>

              {loading ? (
                <div className="text-center py-20 text-white/40">Loading nominees...</div>
              ) : nominees.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-ink-800/40 border border-white/5">
                  <p className="text-white/50 text-base mb-4">Nominations are currently being shortlisted for this category.</p>
                  <Link to="/nominate" className="btn-gold inline-block text-xs">Submit Nomination</Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {nominees.map((nom, idx) => (
                    <motion.div
                      key={nom.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="card-gold p-5 flex flex-col justify-between group hover:border-champagne-500/50"
                    >
                      <div>
                        <div className="flex items-start gap-4 mb-4">
                          <div className="relative shrink-0">
                            <img
                              src={getAssetUrl(nom.photo_url) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
                              alt={nom.full_name}
                              className="w-16 h-16 rounded-2xl object-cover border border-champagne-500/30 group-hover:scale-105 transition-transform"
                            />
                            <span className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-champagne-500 text-ink-900 text-xs font-bold flex items-center justify-center shadow">
                              #{idx + 1}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <Link to={`/nominee/${nom.slug || nom.id}`} className="hover:text-champagne-400">
                              <h3 className="font-display font-bold text-white text-base truncate">{nom.full_name}</h3>
                            </Link>
                            <p className="text-xs text-white/40 truncate">{nom.social_handle || '@creator'}</p>
                            {nom.followers_count && (
                              <div className="text-[11px] text-champagne-400 font-medium mt-1">
                                {nom.followers_count} Followers
                              </div>
                            )}
                          </div>
                        </div>

                        {nom.bio && (
                          <p className="text-white/60 text-xs line-clamp-2 mb-4 leading-relaxed">
                            {nom.bio}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs text-white/40">Verified Votes</div>
                          <div className="text-sm font-bold text-champagne-400">
                            {(Number(nom.vote_count) || 0).toLocaleString('en-IN')}
                          </div>
                        </div>

                        <button
                          onClick={() => setVotingNominee(nom)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-champagne-400 to-burgundy-600 text-ink-900 font-bold text-xs hover:opacity-95 shadow-gold transition-all"
                        >
                          Vote Now
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Leaderboard Sidebar (1 Col) */}
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-ink-800/80 border border-white/10 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <h3 className="font-display font-bold text-white text-lg">Category Leaderboard</h3>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Live
                  </span>
                </div>
                <p className="text-white/40 text-xs mb-6">
                  Based on OTP-verified public votes. Refreshes in real-time.
                </p>

                {nominees.length === 0 ? (
                  <p className="text-white/30 text-xs italic">Awaiting voting start.</p>
                ) : (
                  <div className="space-y-4">
                    {nominees.slice(0, 5).map((n, i) => {
                      const votes = Number(n.vote_count) || 0;
                      const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                      return (
                        <div key={n.id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white font-medium truncate max-w-[160px]">
                              {i + 1}. {n.full_name}
                            </span>
                            <span className="text-champagne-400 font-bold">{votes.toLocaleString()} ({pct}%)</span>
                          </div>
                          <div className="w-full h-2 bg-ink-900 rounded-full overflow-hidden border border-white/5">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, delay: i * 0.1 }}
                              className={`h-full rounded-full ${
                                i === 0 ? 'bg-gradient-to-r from-champagne-400 to-burgundy-500' : 'bg-white/30'
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-8 pt-4 border-t border-white/5 text-center">
                  <div className="text-[11px] text-white/40 mb-3">
                    Total category votes recorded: <strong className="text-white">{totalVotes.toLocaleString('en-IN')}</strong>
                  </div>
                  <Link
                    to="/vote"
                    className="w-full block py-2.5 rounded-xl bg-champagne-500/10 hover:bg-champagne-500/20 text-champagne-400 border border-champagne-500/30 text-xs font-semibold transition-all"
                  >
                    View All Categories Leaderboard →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Voting Modal */}
      <AnimatePresence>
        {votingNominee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-ink-800 rounded-3xl border border-champagne-500/30 p-6 md:p-8 shadow-2xl"
            >
              <button
                onClick={() => setVotingNominee(null)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white"
              >
                ✕
              </button>

              <OtpVote
                nominee={votingNominee}
                onVoted={() => {
                  refreshVotes();
                  setTimeout(() => setVotingNominee(null), 2500);
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
