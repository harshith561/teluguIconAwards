import { useState } from 'react';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';

const VALUES = [
  { icon: '🌟', title: 'Celebrate Talent', desc: 'Honoring the creators who shape Telugu digital culture with their art, humor, and dedication.' },
  { icon: '🤝', title: 'Community First', desc: 'Built by Telugu creators, for Telugu creators — a celebration of our community strength.' },
  { icon: '📱', title: 'Digital Native', desc: 'Born from the digital revolution, celebrating the platforms and formats that defined a generation.' },
  { icon: '🏆', title: 'Excellence', desc: 'Recognizing only the very best — curating icons who set new standards of creativity.' },
];

const TIMELINE = [
  { year: '2026', title: 'The Inaugural Night', desc: 'The first-ever Telugu Icon Digital & Influencer Awards takes center stage in Hyderabad.' },
  { year: 'Tomorrow', title: 'Global Reach', desc: 'Expanding across the NRI Telugu diaspora, uniting Telugu creators worldwide.' },
  { year: 'The Future', title: 'The Big Stage', desc: 'Becoming the definitive celebration of Telugu digital excellence for generations to come.' },
];

const FAQS = [
  {
    q: 'How are the winners decided?',
    a: 'The 40 People\'s Choice categories are decided by public voting, with OTP-verified votes. The 10 Jury & Special Recognition Awards are selected by the official organizing jury on contribution, influence, originality, impact and achievement. All winners are announced live on the grand night.',
  },
  {
    q: 'Who can nominate themselves?',
    a: 'Any Telugu digital creator, influencer, YouTuber, storyteller, entrepreneur or digital personality can self-nominate. The awards accept self-nominations only — put your own profile forward in the category that best fits your content.',
  },
  {
    q: 'Is there a fee to nominate or vote?',
    a: 'No. Self-nomination and public voting are completely free. All you need is your details, your digital profiles and — for voting — a valid 10-digit Indian mobile number for OTP verification.',
  },
  {
    q: 'How does nomination verification work?',
    a: 'After you submit, the organizing team reviews your nomination — your details, digital profiles and supporting content. Approved creators are shortlisted and receive their unique Official Nominee profile, which becomes their campaign page.',
  },
  {
    q: 'When and where is the Telugu Icon Awards Ceremony?',
    a: 'The Telugu Icon Digital & Influencer Awards 2026 takes place on 16 November 2026 at Shilpakala Vedika, Hyderabad. Session 1 runs from 10:00 AM to 2:00 PM (with Complimentary Lunch) and Session 2 from 3:00 PM to 7:00 PM (with Complimentary Dinner), organized and presented by Pracharam Media.',
  },
  {
    q: 'How can I sponsor or partner with the awards?',
    a: 'We offer Title, Gold, Silver, Bronze, Category and Media partnership tiers with visibility across the website, voting pages, nominee campaigns, event screens and winner announcements. Reach out via the Contact page to start a conversation.',
  },
];

export default function AboutPage() {
  const [open, setOpen] = useState(0);

  return (
    <PageTransition>
      <section className="relative py-12 sm:py-20 bg-hero-gradient overflow-hidden px-3 sm:px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,#0a0a0a_100%)]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <p className="section-subtitle">Our Story</p>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-6">
            <span className="gold-text">About</span> <span className="text-white">the Awards</span>
          </h1>
          <p className="text-white/60 leading-relaxed max-w-2xl mx-auto text-xs sm:text-base">
            The Telugu Icon Digital & Influencer Awards is a celebration of the creators, entertainers,
            and digital personalities who put Telugu culture on the global digital map. From YouTube super-stars
            to Instagram trendsetters, we honor the icons millions of us love, follow, and admire every single day.
          </p>
        </div>
      </section>

      <section className="py-10 sm:py-14 bg-ink-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            {[
              { value: '60', label: 'Total Awards' },
              { value: '50', label: 'People\'s Choice Categories' },
              { value: '10', label: 'Jury & Special Recognition' },
              { value: '1', label: 'Grand Celebration' },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="text-center p-3.5 sm:p-6 glass-card"
              >
                <div className="text-2xl sm:text-4xl md:text-5xl font-display font-bold gold-text mb-1 sm:mb-2">{stat.value}</div>
                <div className="text-white/50 text-[11px] sm:text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 sm:py-20 bg-ink-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="section-subtitle">What We Stand For</p>
            <h2 className="section-title">Our Values</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 group hover:border-champagne-500/40 hover:bg-white/[0.07] transition-all duration-300"
              >
                <div className="text-4xl mb-4">{v.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-champagne-300 transition-colors">{v.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-ink-800/50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="section-subtitle">Our Mission</p>
          <h2 className="section-title">Celebrating the People Shaping Telugu Digital Culture</h2>
          <p className="text-white/60 leading-relaxed mb-6">
            The Telugu Icon Digital & Influencer Awards exists for one reason: to put Telugu creators on the
            pedestal they deserve. We believe a YouTube video, an Instagram reel or a podcast episode can be as
            impactful as a film — and the people behind that content deserve a stage as prestigious as any in
            entertainment.
          </p>
          <p className="text-white/60 leading-relaxed">
            Through self-nomination, People's Choice voting and jury recognition, we give the Telugu community —
            from Hyderabad to the global NRI diaspora — a platform to celebrate, support and crown the icons who
            shape our culture every single day.
          </p>
        </div>
      </section>

      <section className="py-20 bg-ink-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="section-subtitle">The Journey</p>
            <h2 className="section-title">Our Timeline</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {TIMELINE.map((t, i) => (
              <motion.div
                key={t.year}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative"
              >
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-champagne-500/50 to-transparent" />
                <div className="pt-8">
                  <span className="text-champagne-400 font-display text-sm font-bold uppercase tracking-widest">{t.year}</span>
                  <h3 className="text-2xl font-semibold text-white mt-2 mb-3">{t.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{t.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-ink-800/50">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="section-subtitle">FAQs</p>
            <h2 className="section-title">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <div key={f.q} className="glass-card overflow-hidden">
                <button
                  onClick={() => setOpen(open === i ? -1 : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className={`font-medium pr-4 ${open === i ? 'text-champagne-300' : 'text-white'}`}>{f.q}</span>
                  <span className={`text-champagne-400 transition-transform duration-300 shrink-0 ${open === i ? 'rotate-45' : ''}`}>+</span>
                </button>
                {open === i && (
                  <div className="px-5 pb-5 text-white/55 text-sm leading-relaxed">{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-hero-gradient">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="section-title mb-4">Powered by Pracharam Media</h2>
          <p className="text-white/60 mb-8">
            A media house dedicated to celebrating and promoting Telugu culture, entertainment, and digital creativity.
            The Telugu Icon Awards is born from our mission to put Telugu creators on the pedestal they deserve.
          </p>
          <div>
            <a href="/contact" className="btn-gold">Get in Touch</a>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}