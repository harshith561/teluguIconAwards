import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { api } from '../api';

const TIERS = [
  {
    key: 'title_partner',
    label: 'Title Partner',
    badge: '👑',
    desc: 'The ultimate stage. Total branding ownership of the Telugu Icon Digital & Influencer Awards Ceremony.',
    features: ['Stage naming rights', 'Red carpet branding', 'Full-campaign integration', 'Winner announcement rights'],
  },
  {
    key: 'gold',
    label: 'Gold Partner',
    badge: '🥇',
    desc: 'Premium visibility across all event touchpoints.',
    features: ['Logo on main stage', 'Social media campaigns', 'Nominee kit branding', 'Backstage access'],
  },
  {
    key: 'silver',
    label: 'Silver Partner',
    badge: '🥈',
    desc: 'Strategic brand visibility for growing brands.',
    features: ['Logo placement', 'Digital banners', 'Category sponsorship option', 'VIP seating'],
  },
  {
    key: 'bronze',
    label: 'Bronze Partner',
    badge: '🥉',
    desc: 'Support the celebration of Telugu digital community.',
    features: ['Logo listing', 'Event brochure mention', 'Social media thanks', 'Standard seating'],
  },
  {
    key: 'media_partner',
    label: 'Media Partner',
    badge: '📡',
    desc: 'Broadcast and digital media collaboration.',
    features: ['Cross-promotion', 'Live coverage rights', 'Press mentions', 'Interview opportunities'],
  },
];

export default function SponsorsPage() {
  const [sponsors, setSponsors] = useState([]);

  useEffect(() => {
    api.get('/sponsors').then((data) => {
      if (Array.isArray(data)) setSponsors(data);
    }).catch(() => {});
  }, []);

  return (
    <PageTransition>
      <section className="relative py-12 sm:py-20 bg-hero-gradient overflow-hidden px-3 sm:px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,#0a0a0a_100%)]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <p className="section-subtitle">Partner With Us</p>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4">
            <span className="gold-text">Sponsors</span> <span className="text-white">& Partners</span>
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto text-xs sm:text-base leading-relaxed">
            Join the movement celebrating Telugu digital excellence and reach millions of engaged viewers worldwide.
          </p>
        </div>
      </section>

      <section className="py-10 sm:py-16 bg-ink-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {TIERS.map((tier, i) => (
              <motion.div
                key={tier.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`glass-card p-4 sm:p-6 group hover:bg-white/[0.07] hover:border-champagne-500/40 transition-all duration-300 ${
                  tier.key === 'title_partner' ? 'bg-champagne-500/10 border-champagne-500/40' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-4xl">{tier.badge}</span>
                  {tier.key === 'title_partner' && (
                    <span className="text-[10px] uppercase tracking-wider px-3 py-1 rounded-full bg-champagne-500 text-ink-900 font-bold">Premium</span>
                  )}
                </div>
                <h3 className="font-display text-2xl font-bold text-white mb-2">{tier.label}</h3>
                <p className="text-white/50 text-sm mb-4">{tier.desc}</p>
                <ul className="space-y-2 mb-6">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start text-sm text-white/60">
                      <span className="text-champagne-400 mr-2">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <a href="/contact" className="btn-outline w-full text-center">Become a Sponsor</a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-ink-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="section-subtitle">Category Activation</p>
            <h2 className="section-title">A Category in Your Name</h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              Own a full People's Choice category as a Category Partner — here's how your brand travels
              through the entire event journey.
            </p>
          </div>
          <div className="grid lg:grid-cols-5 gap-6 items-stretch">
            <div className="lg:col-span-2 glass-card p-6 flex flex-col justify-center text-center group hover:border-champagne-500/40 transition-all duration-300">
              <span className="text-5xl mb-4">🍔</span>
              <h3 className="font-display text-2xl font-bold text-white mb-1">Best Food Creator</h3>
              <p className="text-white/40 text-sm mb-4">People's Choice Category</p>
              <div className="border-t border-dashed border-white/15 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Powered By</p>
                <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-champagne-500/10 border border-champagne-500/40">
                  <span className="text-xl">🏷️</span>
                  <span className="font-display font-bold gold-text">[YOUR BRAND]</span>
                </div>
              </div>
            </div>
            <div className="lg:col-span-3 space-y-4">
              {[
                { icon: '🏆', t: 'On the Category Page', d: 'Your logo and "Powered by" line sit beside the category across the Awards explorer.' },
                { icon: '⭐', t: 'On Every Nominee Page', d: 'Your brand appears on each nominee profile campaigning within that category.' },
                { icon: '🗳️', t: 'On the Voting Screen', d: 'Voters see your brand at the moment they cast their vote.' },
                { icon: '📲', t: 'In Social Posts & Campaigns', d: 'Nominee posters, story templates and campaign assets carry your identity.' },
                { icon: '🎤', t: 'At the Winner Announcement', d: 'Your brand presents the trophy live on the grand night, 16 November 2026.' },
              ].map((s, i) => (
                <motion.div
                  key={s.t}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-4 glass-card p-4 group hover:border-champagne-500/40 hover:bg-white/[0.07] transition-all duration-300"
                >
                  <span className="text-2xl shrink-0">{s.icon}</span>
                  <div>
                    <div className="text-white font-semibold text-sm mb-0.5 group-hover:text-champagne-300 transition-colors">{s.t}</div>
                    <p className="text-white/50 text-xs leading-relaxed">{s.d}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-ink-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="section-subtitle">Brand Visibility</p>
            <h2 className="section-title">Put Your Brand at the Centre of Telugu Digital Culture</h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              Sponsors travel across every touchpoint of the awards — from the website to nominee campaigns,
              the event floor and beyond.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { icon: '🌐', t: 'Website', d: 'Homepage, Awards & voting pages' },
              { icon: '🏷️', t: 'Category Pages', d: 'Category sponsorship pairing' },
              { icon: '🗳️', t: 'Voting Pages', d: 'Branded voting experience' },
              { icon: '🖼️', t: 'Nominee Posters', d: 'Official nominee visuals' },
              { icon: '📣', t: 'Creator Campaign Templates', d: 'Everything nominees share' },
              { icon: '📱', t: 'Social Media', d: 'Awards & creator platforms' },
              { icon: '📢', t: 'Digital Ads', d: 'Paid campaign amplification' },
              { icon: '🖥️', t: 'Event Screens', d: 'On-stage & LED displays' },
              { icon: '🏆', t: 'Winner Announcements', d: 'The trophy moments' },
              { icon: '📰', t: 'Media & PR', d: 'Press releases & coverage' },
            ].map((v) => (
              <div key={v.t} className="glass-card p-5 text-center group hover:border-champagne-500/40 hover:bg-white/[0.07] transition-all duration-300">
                <div className="text-3xl mb-2">{v.icon}</div>
                <div className="text-white font-semibold text-sm group-hover:text-champagne-300 transition-colors">{v.t}</div>
                <div className="text-white/40 text-xs mt-1">{v.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {sponsors.length > 0 && (
        <section className="py-20 bg-ink-800/50">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <p className="section-subtitle">Our Partners</p>
            <h2 className="section-title">Proud Sponsors of 2026</h2>
            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6">
              {sponsors.map((s) => (
                <div key={s.id} className="glass-card p-6 group hover:border-champagne-500/40 transition-all duration-300">
                  {s.logo_url ? (
                    <img src={s.logo_url} alt={s.name} className="w-full h-12 object-contain grayscale group-hover:grayscale-0 transition-all" />
                  ) : (
                    <div className="font-display text-xl font-bold gold-text flex items-center justify-center h-12">{s.name}</div>
                  )}
                  <p className="text-white/40 text-xs mt-3">{s.tagline}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-20 bg-hero-gradient">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="section-title mb-4">Let's create something iconic together</h2>
          <p className="text-white/60 mb-8">Reach millions of Telugu audiences across India and the NRI community worldwide.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a href="/contact" className="btn-gold">Contact Us About Sponsorship</a>
            <a href="/media#press-kit" className="btn-outline">Download Media Kit</a>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}