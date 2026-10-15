import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import OtpVote from '../components/OtpVote';
import { api, getAssetUrl } from '../api';

export default function VotePage() {
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [nominees, setNominees] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedNominee, setSelectedNominee] = useState(null);
  const [votedNominee, setVotedNominee] = useState(null);

  // Direct voting URL support (add-on req. 10): /vote/<slug> redirects here with
  // ?nominee=<slug>&category=<slug>, so the nominee and its category are
  // pre-selected instead of making the voter browse and search.
  const preNominee = searchParams.get('nominee');
  const preCategory = searchParams.get('category');

  const requestedNominee = useMemo(
    () => nominees.find((n) => String(n.slug) === preNominee || String(n.id) === preNominee) || null,
    [nominees, preNominee]
  );

  useEffect(() => {
    api.get('/categories').then((data) => {
      if (Array.isArray(data)) {
        // Gated on voting_open only. Filtering by type here hid categories
        // that the API happily accepts votes for.
        const open = data.filter((c) => c.voting_open);
        setCategories(open);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      setSelectedNominee(null);
      setVotedNominee(null);
      // The category is stored by slug, which is what the nominees endpoint
      // filters on.
      api.get(`/nominees?category=${encodeURIComponent(selectedCategory)}`).then((data) => {
        if (Array.isArray(data)) setNominees(data);
      }).catch(() => {});
    }
  }, [selectedCategory]);

  // Pick the requested category once the list loads.
  useEffect(() => {
    if (!categories.length) return;
    const wanted = categories.find((c) => String(c.slug) === preCategory || String(c.id) === preCategory);
    setSelectedCategory(wanted ? wanted.slug : categories[0].slug);
  }, [categories, preCategory]);

  // Land on the requested nominee as soon as its category is loaded.
  useEffect(() => {
    if (requestedNominee && selectedCategory) setSelectedNominee(requestedNominee.id);
  }, [requestedNominee, selectedCategory]);

  const currentNominee = nominees.find((n) => n.id === selectedNominee) || null;

  return (
    <PageTransition>
      <section className="relative py-12 sm:py-20 bg-hero-gradient overflow-hidden px-3 sm:px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,#0a0a0a_100%)]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <p className="section-subtitle">10 October – 15 November 2026</p>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4">
            <span className="gold-text">Every Vote Counts.</span> <span className="text-white">Every Vote Is Visible.</span>
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto text-xs sm:text-base leading-relaxed">
            Public voting opens October 10 and closes November 15 at 11:59 PM. Verified vote counts are publicly displayed through November 11. From November 12, public totals are hidden while voting continues securely.
          </p>
        </div>
      </section>

      <section className="py-10 sm:py-16 bg-ink-900">
        <div className="max-w-4xl mx-auto px-4">
          {votedNominee ? (
            <div className="glass-card p-5 sm:p-8">
              <div className="text-center">
                <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">🏆</div>
                <h2 className="font-display text-xl sm:text-3xl font-bold gold-text mb-2 sm:mb-3">YOUR VOICE. YOUR ICON.</h2>
                <p className="text-white/60 text-xs sm:text-base mb-6">
                  You voted for <span className="text-champagne-400 font-semibold">{votedNominee}</span> in the
                  Telugu Icon Digital & Influencer Awards 2026.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                  <button onClick={() => setVotedNominee(null)} className="btn-gold">Vote in Another Category</button>
                  <a href="/nominees" className="btn-outline">Explore Nominees</a>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="glass-card p-4 sm:p-6 md:p-8 mb-4 sm:mb-6">
                <label className="block text-xs sm:text-sm text-white/60 mb-2">Select Category</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 max-h-72 overflow-y-auto pr-2">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategory(c.slug)}
                      className={`text-left px-3 py-2 sm:px-4 sm:py-3 rounded-xl border text-xs sm:text-sm transition-all duration-300 ${
                        selectedCategory === c.slug
                          ? 'border-champagne-500 bg-champagne-500/10 text-champagne-300'
                          : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      🏆 {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {categories.length > 0 && (
                <div className="glass-card p-6 sm:p-8 mb-6">
                  <h2 className="font-display text-2xl font-bold text-white mb-1">Shortlisted creators</h2>
                  {requestedNominee && currentNominee?.id === requestedNominee.id && (
                    <p className="text-champagne-400 text-xs mb-4">
                      ✓ {requestedNominee.full_name} is pre-selected for you — just enter your mobile number to vote.
                    </p>
                  )}
                  {nominees.length > 0 ? (
                    <div className="space-y-3">
                      {nominees.map((n) => (
                        <motion.div
                          key={n.id}
                          whileHover={{ scale: 1.01 }}
                          onClick={() => setSelectedNominee(n.id)}
                          className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-300 ${
                            selectedNominee === n.id
                              ? 'border-champagne-500 bg-champagne-500/10'
                              : 'border-white/10 hover:border-white/30 bg-ink-800/50'
                          }`}
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-ink-700 to-burgundy-900 flex items-center justify-center overflow-hidden">
                              {n.photo_url ? (
                                <img src={getAssetUrl(n.photo_url)} alt={n.full_name} className="w-full h-full object-cover" />
                              ) : (
                                <span>🏆</span>
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-white">{n.full_name}</div>
                              <div className="text-white/40 text-xs">{n.nominee_code || ''} • Official Nominee</div>
                            </div>
                          </div>
                          {selectedNominee === n.id && <span className="text-champagne-400 text-xl">✓</span>}
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/40 text-center py-8">No shortlisted creators yet in this category. Check back soon!</p>
                  )}
                </div>
              )}

              {currentNominee && (
                <div className="glass-card p-6 sm:p-8">
                  <h2 className="font-display text-xl font-bold text-white mb-1">
                    Cast your vote for {currentNominee.full_name}
                  </h2>
                  <p className="text-champagne-400 text-xs mb-4">{currentNominee.category_name}</p>
                  <OtpVote nominee={currentNominee} onVoted={() => setVotedNominee(currentNominee.full_name)} />
                </div>
              )}

              {categories.length === 0 && (
                <div className="text-center text-white/40 py-20 glass-card">
                  Voting categories are being prepared. Please check back soon!
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className="py-20 bg-ink-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="section-subtitle">The Voting Journey</p>
            <h2 className="section-title">How Voting Works</h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              Secure, verified and fair — every vote shapes the People's Choice Icon Awards.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '🎯', t: 'Select a Category', d: 'Pick one of the 50 People\'s Choice categories open for public voting.' },
              { icon: '⭐', t: 'Choose Your Creator', d: 'Browse the shortlisted nominees and pick the creator you want to support.' },
              { icon: '📱', t: 'Enter Your Mobile', d: 'A valid 10-digit Indian mobile number is required to verify each vote.' },
              { icon: '🔐', t: 'Verify with OTP', d: 'Receive a one-time code and confirm that you\'re a real, unique voter.' },
              { icon: '🗳️', t: 'Cast Your Vote', d: 'One verified mobile = one vote per category. Your vote is recorded securely.' },
              { icon: '📣', t: 'Share & Support', d: 'Share the nominee\'s profile on WhatsApp, Instagram and YouTube to grow their support.' },
            ].map((s, i) => (
              <motion.div
                key={s.t}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="glass-card p-6 text-center group hover:border-champagne-500/40 hover:bg-white/[0.07] transition-all duration-300"
              >
                <div className="text-4xl mb-3">{s.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-champagne-300 transition-colors">{s.t}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{s.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-ink-900">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="section-subtitle">Fair Play</p>
            <h2 className="section-title">Voting Rules</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              'One verified mobile number = one vote per category.',
              'Each vote requires OTP verification to confirm a real, unique voter.',
              'You can vote in every category — once per category per verified number.',
              'Anti-bot, rate-limiting and duplicate-vote protection run throughout voting.',
              'Suspicious or fraudulent voting is flagged for manual review and excluded from final counts.',
              'Exact live vote counts are not displayed publicly while voting is active.',
              'Voting open/close is controlled by the organizing team; results are announced live on the grand night.',
              'Winning nominees are re-verified against the final tally before any announcement.',
            ].map((r) => (
              <div key={r} className="glass-card p-5 flex items-start group hover:border-champagne-500/40 transition-all duration-300">
                <span className="text-champagne-400 mr-3 shrink-0">✓</span>
                <span className="text-white/60 text-sm leading-relaxed">{r}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageTransition>
  );
}