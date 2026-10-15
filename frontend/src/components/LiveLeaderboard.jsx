import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { api, getAssetUrl } from '../api';
import OtpVote from './OtpVote';

export default function LiveLeaderboard({ categorySlug, maxItems = 10, showFilters = true }) {
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState(categorySlug || '');
  const [nominees, setNominees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [votingNominee, setVotingNominee] = useState(null);

  useEffect(() => {
    if (showFilters) {
      api.get('/categories').then((d) => {
        if (Array.isArray(d)) setCategories(d);
      }).catch(() => {});
    }
  }, [showFilters]);

  const fetchNominees = () => {
    setLoading(true);
    const url = selectedCat ? `/nominees?category=${selectedCat}` : '/nominees';
    api.get(url)
      .then((data) => {
        if (Array.isArray(data)) {
          setNominees(data.slice(0, maxItems));
          setLastUpdated(new Date());
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNominees();
    const interval = setInterval(fetchNominees, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, [selectedCat, maxItems]);

  const totalVotes = nominees.reduce((acc, n) => acc + (Number(n.vote_count) || 0), 0);

  return (
    <div className="card-gold p-6 md:p-8 rounded-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h3 className="font-display text-xl md:text-2xl font-bold text-white">
              Live Verified <span className="gold-text">Leaderboard</span>
            </h3>
          </div>
          <p className="text-white/40 text-xs mt-1">
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • Auto-refreshes every 30s
          </p>
        </div>

        {showFilters && categories.length > 0 && (
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="px-4 py-2 rounded-xl bg-ink-800 border border-white/10 text-white text-xs font-medium focus:border-champagne-500 focus:outline-none"
          >
            <option value="">All Categories (Overall Top)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* List */}
      {loading && nominees.length === 0 ? (
        <div className="text-center py-16 text-white/40">
          <div className="w-8 h-8 border-2 border-champagne-500/30 border-t-champagne-500 rounded-full animate-spin mx-auto mb-2" />
          Fetching live standings...
        </div>
      ) : nominees.length === 0 ? (
        <div className="text-center py-12 text-white/40 text-sm">
          No active nominees found for this selection.
        </div>
      ) : (
        <div className="divide-y divide-white/5 my-4">
          {nominees.map((nom, idx) => {
            const votes = Number(nom.vote_count) || 0;
            const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
            const isTop3 = idx < 3;
            const rankBadgeColor =
              idx === 0
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-ink-900'
                : idx === 1
                ? 'bg-gradient-to-r from-slate-200 to-zinc-400 text-ink-900'
                : idx === 2
                ? 'bg-gradient-to-r from-amber-700 to-amber-900 text-white'
                : 'bg-white/10 text-white/60';

            return (
              <motion.div
                key={nom.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-4 flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${rankBadgeColor}`}>
                    #{idx + 1}
                  </span>

                  <img
                    src={getAssetUrl(nom.photo_url) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                    alt={nom.full_name}
                    className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                  />

                  <div className="min-w-0">
                    <Link to={`/nominee/${nom.slug || nom.id}`} className="hover:text-champagne-400">
                      <div className="font-bold text-white text-sm truncate group-hover:text-champagne-400 transition-colors">
                        {nom.full_name}
                      </div>
                    </Link>
                    <div className="flex items-center gap-2 text-[11px] text-white/40 truncate">
                      <span>{nom.social_handle || '@creator'}</span>
                      {nom.category_name && (
                        <>
                          <span>•</span>
                          <span className="text-champagne-400/80 truncate">{nom.category_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-sm md:text-base font-bold text-champagne-400">
                      {votes.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider">
                      Verified Votes
                    </div>
                  </div>

                  <button
                    onClick={() => setVotingNominee(nom)}
                    className="px-3.5 py-1.5 rounded-xl bg-champagne-500/10 hover:bg-champagne-500/20 text-champagne-400 border border-champagne-500/30 text-xs font-semibold transition-all hover:scale-105"
                  >
                    Vote
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Transparency Note */}
      <div className="mt-6 pt-4 border-t border-white/5 text-[11px] text-white/40 flex items-center justify-between gap-4">
        <span>🛡️ 100% Anti-Fraud Verified: 1 vote per category per Indian mobile number.</span>
        <Link to="/vote" className="text-champagne-400 hover:underline font-semibold shrink-0">
          Cast Your Vote →
        </Link>
      </div>

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
                  fetchNominees();
                  setTimeout(() => setVotingNominee(null), 2500);
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
