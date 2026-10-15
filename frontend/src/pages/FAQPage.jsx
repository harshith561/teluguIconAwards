import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../components/PageTransition';

const FAQS = [
  {
    category: 'general',
    q: 'When is Telugu Icon Digital & Influencer Awards 2026?',
    a: 'November 16, 2026 at Shilpakala Vedika, Hyderabad.',
  },
  {
    category: 'general',
    q: 'Is this a cinema or OTT awards event?',
    a: 'No. The current event is specifically a Digital & Influencer Awards event focused on Telugu creators and digital influence. It is not cinema or movie awards.',
  },
  {
    category: 'nominations',
    q: 'When do self-nominations open and close?',
    a: 'Self-nominations open October 1, 2026 and close November 5, 2026 at 11:59 PM.',
  },
  {
    category: 'nominations',
    q: 'Can I nominate someone else?',
    a: 'No. Only self-nominations are accepted. There is no “Nominate Someone Else” option on the platform.',
  },
  {
    category: 'nominations',
    q: 'How many categories can a creator self-nominate for?',
    a: 'Each creator/influencer may self-nominate in a maximum of 3 categories only, and every selected category must be genuinely relevant to their content, work or digital presence.',
  },
  {
    category: 'nominations',
    q: 'Is there any entry fee for self-nomination?',
    a: 'No. Self-nominations are completely free of charge. There are no registration fees.',
  },
  {
    category: 'voting',
    q: 'When does public voting open and close?',
    a: 'Public voting opens October 10, 2026 and closes November 15, 2026 at 11:59 PM.',
  },
  {
    category: 'voting',
    q: 'Will vote counts be visible publicly?',
    a: 'Yes. Verified public vote counts and category positions will be displayed during the voting period through November 11. From November 12, public vote totals and rankings are hidden while voting continues securely until November 15.',
  },
  {
    category: 'voting',
    q: 'How does OTP-verified voting work?',
    a: 'Voting is verified via Indian mobile OTP. Each voter may cast one verified vote per category. Duplicate vote controls, rate limiting, and bot protection safeguard the integrity of every category.',
  },
  {
    category: 'tickets',
    q: 'What are the two event sessions?',
    a: 'Session 1 is 10:00 AM – 2:00 PM with complimentary lunch. Session 2 is 3:00 PM – 7:00 PM with complimentary dinner at Shilpakala Vedika, Hyderabad.',
  },
  {
    category: 'tickets',
    q: 'Are tickets refundable?',
    a: 'Tickets once booked are non-refundable and non-cancellable, except where a refund is required due to event cancellation or applicable law. Final ticket terms are shown before payment.',
  },
  {
    category: 'tickets',
    q: 'Will the website show the number of seats remaining?',
    a: 'No. The public ticketing interface shows availability status only (such as Available, Filling Fast, Almost Sold Out or Sold Out) — never total capacity or remaining inventory.',
  },
  {
    category: 'sponsors',
    q: 'How can brands partner with Telugu Icon Awards 2026?',
    a: 'We offer Title Partner, Powered By, Co-Powered, Gold, Silver, Associate, Category, and Supporting Partner opportunities. Explore the Partners page or submit a query to get the partnership proposal.',
  },
];

const CATEGORIES = [
  { key: '', label: 'All Questions' },
  { key: 'general', label: 'General' },
  { key: 'nominations', label: 'Nominations' },
  { key: 'voting', label: 'Voting & Audits' },
  { key: 'tickets', label: 'Tickets & Food' },
  { key: 'event', label: 'Event Day' },
  { key: 'sponsors', label: 'Partnerships' },
];

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [openIdx, setOpenIdx] = useState(null);

  const filteredFaqs = FAQS.filter((faq) => {
    const matchesCat = !activeCategory || faq.category === activeCategory;
    const matchesSearch = !searchTerm ||
      faq.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a.replace(/\n/g, '<br/>'),
      },
    })),
  };

  return (
    <PageTransition>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero */}
      <section className="relative py-12 sm:py-20 bg-hero-gradient overflow-hidden px-3 sm:px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,#0a0a0a_100%)]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <p className="section-subtitle">Help & Transparency</p>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4">
            Frequently Asked <span className="gold-text">Questions</span>
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto text-xs sm:text-base leading-relaxed">
            Everything you need to know about nominations, OTP-verified voting, ticketing, sessions, and gala day protocols.
          </p>

          {/* Search Box */}
          <div className="mt-6 sm:mt-8 max-w-xl mx-auto relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search questions (e.g., tickets, voting, food)..."
              className="w-full px-4 py-2.5 sm:px-5 sm:py-3.5 pl-10 sm:pl-12 rounded-2xl bg-ink-800/90 border border-white/10 text-white placeholder-white/30 focus:border-champagne-500 focus:outline-none shadow-lg text-xs sm:text-sm"
            />
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 text-white/40 absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs uppercase"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Accordion Section */}
      <section className="py-16 bg-ink-900 min-h-[60vh]">
        <div className="max-w-4xl mx-auto px-4">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mb-10 justify-center">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => {
                  setActiveCategory(cat.key);
                  setOpenIdx(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-all duration-300 ${
                  activeCategory === cat.key
                    ? 'bg-champagne-500 text-ink-900 shadow-gold font-bold'
                    : 'bg-ink-800 text-white/60 border border-white/10 hover:border-champagne-500/40 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {filteredFaqs.length === 0 ? (
            <div className="text-center py-16 bg-ink-800/40 rounded-2xl border border-white/5 p-8">
              <p className="text-white/40 text-base mb-3">No matching questions found for "{searchTerm}".</p>
              <button
                onClick={() => { setSearchTerm(''); setActiveCategory(''); }}
                className="text-xs font-semibold text-champagne-400 hover:underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFaqs.map((item, idx) => {
                const isOpen = openIdx === idx;
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                      isOpen
                        ? 'bg-ink-800/90 border-champagne-500/40 shadow-gold'
                        : 'bg-ink-800/40 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <button
                      onClick={() => setOpenIdx(isOpen ? null : idx)}
                      className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 focus:outline-none"
                    >
                      <span className="font-display font-semibold text-white text-base md:text-lg leading-snug">
                        {item.q}
                      </span>
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border transition-transform duration-300 ${
                          isOpen
                            ? 'rotate-180 bg-champagne-500 text-ink-900 border-champagne-400'
                            : 'bg-white/5 text-white/60 border-white/10'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                        >
                          <div className="px-6 pb-6 pt-1 text-white/70 text-sm md:text-base leading-relaxed whitespace-pre-line border-t border-white/5">
                            {item.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}

          {/* Still have questions? */}
          <div className="mt-16 p-8 rounded-3xl bg-gradient-to-r from-ink-800 to-burgundy-900/40 border border-white/10 text-center">
            <h3 className="text-xl font-bold text-white mb-2">Still have questions?</h3>
            <p className="text-white/60 text-sm max-w-md mx-auto mb-6">
              Our support team is here to assist you with nominations, voting, or ticket queries.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="/contact"
                className="px-6 py-3 rounded-full bg-champagne-500 text-ink-900 font-semibold text-sm hover:bg-champagne-400 transition-all shadow-gold"
              >
                Contact Support Desk
              </a>
              <a
                href="mailto:help@teluguiconawards.com"
                className="px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 text-white font-medium text-sm border border-white/10 transition-all"
              >
                help@teluguiconawards.com
              </a>
            </div>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
