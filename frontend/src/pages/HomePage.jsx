import { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import LiveLeaderboard from '../components/LiveLeaderboard';
import { api } from '../api';

const ALL_CATEGORIES_DATA = [
  { id: 1, num: '01', name: 'Telugu YouTuber of the Year', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 2, num: '02', name: 'Best Entertainment Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 3, num: '03', name: 'Best Comedy Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 4, num: '04', name: 'Best Family Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 5, num: '05', name: 'Best Storytelling Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 6, num: '06', name: 'Best Viral Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 7, num: '07', name: 'Best Short-Form Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 8, num: '08', name: 'Best Lifestyle Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 9, num: '09', name: 'Best Content Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 10, num: '10', name: 'Best Current Affairs Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 11, num: '11', name: 'Best Knowledge Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 12, num: '12', name: 'Best Tech Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 13, num: '13', name: 'Best Food Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 14, num: '14', name: 'Best Travel Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 15, num: '15', name: 'Best Educational Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 16, num: '16', name: 'Best Gaming Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 17, num: '17', name: 'Best Podcast Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 18, num: '18', name: 'Best Reels Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 19, num: '19', name: 'Best Comedy Shorts Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 20, num: '20', name: 'Best Creator Collaboration', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 21, num: '21', name: 'Best Instagram Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 22, num: '22', name: 'Best Digital Journalist', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 23, num: '23', name: 'Best Facts Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 24, num: '24', name: 'Best Motivational Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 25, num: '25', name: 'Best AI Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 26, num: '26', name: 'Best Gadget Reviewer', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 27, num: '27', name: 'Best Mobile Tech Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 28, num: '28', name: 'Best Innovation Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 29, num: '29', name: 'Best Cooking Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 30, num: '30', name: 'Best Street Food Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 31, num: '31', name: 'Best Restaurant Review Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 32, num: '32', name: 'Best Adventure Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 33, num: '33', name: 'Best Fashion Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 34, num: '34', name: 'Best Beauty Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 35, num: '35', name: 'Best Home Chef Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 36, num: '36', name: 'Best Career Guidance Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 37, num: '37', name: 'Best Startup Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 38, num: '38', name: 'Best Business Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 39, num: '39', name: 'Best Finance Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 40, num: '40', name: 'Best Music & Dance Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 41, num: '41', name: 'Best Vlogger of the Year', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 42, num: '42', name: 'Best Meme Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 43, num: '43', name: 'Best Fitness Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 44, num: '44', name: 'Best Parenting Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 45, num: '45', name: 'Best Couple Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 46, num: '46', name: 'Best Dance Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 47, num: '47', name: 'Best Telugu-Language Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 48, num: '48', name: 'Best Social Impact Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 49, num: '49', name: 'Best Automobile Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 50, num: '50', name: 'Best Micro Creator', type: 'public', desc: 'Eligible for self-nomination and public voting, subject to category relevance and verification.' },
  { id: 51, num: '51', name: 'Telugu Digital Creator of the Year', type: 'jury', desc: 'Jury or special recognition award. No self-nomination and no public voting.' },
  { id: 52, num: '52', name: 'Telugu Digital Icon of the Year', type: 'jury', desc: 'Jury or special recognition award. No self-nomination and no public voting.' },
  { id: 53, num: '53', name: 'Telugu Influencer of the Year', type: 'jury', desc: 'Jury or special recognition award. No self-nomination and no public voting.' },
  { id: 54, num: '54', name: 'Creator Excellence Award', type: 'jury', desc: 'Jury or special recognition award. No self-nomination and no public voting.' },
  { id: 55, num: '55', name: 'Most Popular Digital Creator', type: 'jury', desc: 'Jury or special recognition award. No self-nomination and no public voting.' },
  { id: 56, num: '56', name: 'Best Male Digital Creator', type: 'jury', desc: 'Jury or special recognition award. No self-nomination and no public voting.' },
  { id: 57, num: '57', name: 'Best Female Digital Creator', type: 'jury', desc: 'Jury or special recognition award. No self-nomination and no public voting.' },
  { id: 58, num: '58', name: 'Rising Digital Star of the Year', type: 'jury', desc: 'Jury or special recognition award. No self-nomination and no public voting.' },
  { id: 59, num: '59', name: 'Digital Entrepreneur of the Year', type: 'jury', desc: 'Jury or special recognition award. No self-nomination and no public voting.' },
  { id: 60, num: '60', name: 'Lifetime Achievement Award – Digital Media', type: 'jury', desc: 'Jury or special recognition award. No self-nomination and no public voting.' }
];

const FAQS = [
  { q: 'When is Telugu Icon Digital & Influencer Awards 2026?', a: 'November 16, 2026 at Shilpakalavedika, Hyderabad.' },
  { q: 'Is this a cinema or OTT awards event?', a: 'No. The current event is specifically a Digital & Influencer Awards event focused on Telugu creators and digital influence.' },
  { q: 'When do nominations open?', a: 'Self-nominations open October 1, 2026 and close November 5, 2026.' },
  { q: 'Can I nominate someone else?', a: 'No. Only self-nominations are accepted.' },
  { q: 'How many categories can I self-nominate for?', a: 'Each creator/influencer may self-nominate in a maximum of 3 categories only, and every selected category must be genuinely relevant to their content.' },
  { q: 'When does public voting open?', a: 'Voting opens October 10, 2026.' },
  { q: 'Will vote counts be visible?', a: 'Yes. Verified public vote counts and category positions will be displayed publicly through November 11. From November 12, public vote totals and rankings are hidden while voting continues securely until November 15.' },
  { q: 'When does voting close?', a: 'November 15, 2026 at 11:59 PM.' },
  { q: 'Are tickets refundable?', a: 'Tickets are non-refundable and non-cancellable except where a refund is required due to event cancellation or applicable law.' },
  { q: 'What are the two event sessions?', a: 'Session 1 is 10:00 AM – 2:00 PM with complimentary lunch. Session 2 is 3:00 PM – 7:00 PM with complimentary dinner.' },
  { q: 'Will the website show the number of seats remaining?', a: 'No. The public ticketing interface will show only availability status such as Available, Filling Fast, Almost Sold Out or Sold Out.' }
];

const MILESTONES = [
  { target: '2026-10-01T00:00:00+05:30', label: 'NOMINATIONS OPEN IN', name: 'NOMINATIONS OPEN · 01 OCTOBER 2026' },
  { target: '2026-10-10T00:00:00+05:30', label: 'VOTING OPENS IN', name: 'VOTING OPENS · 10 OCTOBER 2026' },
  { target: '2026-11-05T23:59:59+05:30', label: 'NOMINATIONS CLOSE IN', name: 'NOMINATIONS CLOSE · 05 NOVEMBER 2026' },
  { target: '2026-11-12T00:00:00+05:30', label: 'PUBLIC VOTE DISPLAY OFF IN', name: 'PUBLIC VOTE DISPLAY OFF · 12 NOVEMBER 2026' },
  { target: '2026-11-15T23:59:59+05:30', label: 'VOTING CLOSES IN', name: 'VOTING CLOSES · 15 NOVEMBER 2026' },
  { target: '2026-11-16T10:00:00+05:30', label: 'THE ICONS ARE REVEALED IN', name: 'EVENT DAY · 16 NOVEMBER 2026' }
];

const DEFAULT_TICKETS = [
  { id: 1, session: 1, tier: 'vvip', price_paisa: 50000, price_display: '₹500', availability: 'available', is_active: 1 },
  { id: 2, session: 1, tier: 'mip', price_paisa: 100000, price_display: '₹1,000', availability: 'available', is_active: 1 },
  { id: 3, session: 2, tier: 'vvip', price_paisa: 50000, price_display: '₹500', availability: 'available', is_active: 1 },
  { id: 4, session: 2, tier: 'mip', price_paisa: 100000, price_display: '₹1,000', availability: 'available', is_active: 1 }
];

const TICKET_AVAIL_CONFIG = {
  available:       { label: 'AVAILABLE',       cls: 'text-[#8fe0a5] border-[#8fe0a5]/40 bg-[#8fe0a5]/10', isSoldOut: false },
  filling_fast:    { label: 'FILLING FAST',    cls: 'text-[#f1d99a] border-[#f1d99a]/40 bg-[#f1d99a]/10', isSoldOut: false },
  almost_sold_out: { label: 'ALMOST SOLD OUT', cls: 'text-[#f59e0b] border-[#f59e0b]/40 bg-[#f59e0b]/10', isSoldOut: false },
  sold_out:        { label: 'SOLD OUT',         cls: 'text-[#ef4444] border-[#ef4444]/40 bg-[#ef4444]/10', isSoldOut: true },
};

function pad(n) {
  return String(Math.max(0, n)).padStart(2, '0');
}

export default function HomePage() {
  const [heroCountdown, setHeroCountdown] = useState({ title: 'NOMINATIONS OPEN IN', d: '00', h: '00', m: '00', s: '00' });
  const [timelineTimes, setTimelineTimes] = useState({});
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [tickets, setTickets] = useState(DEFAULT_TICKETS);
  const [hasLoadedTickets, setHasLoadedTickets] = useState(false);
  const fetchedTicketsRef = useRef(false);

  // Calls the ticket availability API once on load based on dependency
  useEffect(() => {
    if (hasLoadedTickets || fetchedTicketsRef.current) return;
    fetchedTicketsRef.current = true;

    api.get('/tickets/availability')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setTickets(data);
          setHasLoadedTickets(true);
        }
      })
      .catch(() => {});
  }, [hasLoadedTickets]);

  const getTicketInfo = (session, tier) => {
    const match = tickets.find(
      (t) => t.session === session && t.tier.toLowerCase() === tier.toLowerCase() && t.is_active
    );
    const tierUpper = tier.toUpperCase();
    const defaultPrice = tierUpper === 'MIP' ? '₹1,000' : '₹500';
    const priceDisplay = match?.price_display || defaultPrice;
    const availKey = match?.availability || 'available';
    const avail = TICKET_AVAIL_CONFIG[availKey] || TICKET_AVAIL_CONFIG.available;
    const isSoldOut = availKey === 'sold_out';
    return {
      ...match,
      priceDisplay,
      avail,
      isSoldOut,
    };
  };

  const renderTicketCard = (session, tier, mealName, mealFeature) => {
    const t = getTicketInfo(session, tier);
    const tierName = tier.toUpperCase();
    return (
      <div className={`card-preview p-5 sm:p-8 flex flex-col justify-between transition-all ${t.isSoldOut ? 'opacity-65' : ''}`}>
        <div>
          <div className="text-[#d8b56b] text-xs tracking-[2px] font-black">{tierName}</div>
          <div className="text-3xl sm:text-4xl font-black text-white my-2 font-serif-luxury">{t.priceDisplay}</div>
          <div className="inline-block px-2.5 py-1 border border-[rgba(216,181,107,0.3)] bg-[#d8b56b]/10 text-[#f1d99a] text-[11px] sm:text-xs font-bold my-2 rounded">
            {mealName}
          </div>
          <ul className="text-xs text-[#d6c5b3] space-y-1.5 sm:space-y-2 my-3 sm:my-4">
            <li className="pb-1 border-b border-[rgba(216,181,107,0.1)]">
              ✓ {tierName === 'MIP' ? 'MIP premium access' : 'VVIP event access'}
            </li>
            <li className="pb-1 border-b border-[rgba(216,181,107,0.1)]">✓ Session {session} entry</li>
            <li className="pb-1 border-b border-[rgba(216,181,107,0.1)]">✓ Digital QR ticket</li>
            <li className="pb-1 border-b border-[rgba(216,181,107,0.1)]">✓ {mealFeature}</li>
          </ul>
        </div>
        <div>
          <div className={`inline-block text-[10px] sm:text-[11px] font-bold border px-2.5 py-1 rounded mb-4 ${t.avail.cls}`}>
            ● {t.avail.label}
          </div>
          <div>
            {t.isSoldOut ? (
              <button
                disabled
                className="btn-outline opacity-50 cursor-not-allowed w-full text-center"
              >
                SOLD OUT
              </button>
            ) : (
              <Link
                to={`/tickets?session=${session}&tier=${tier.toLowerCase()}`}
                className="btn-gold inline-block w-full text-center"
              >
                BOOK {tierName} ({t.priceDisplay})
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Dynamic countdown engine matching preview.html
  useEffect(() => {
    const tick = () => {
      const now = Date.now();

      // Find current hero milestone
      const nextMilestone = MILESTONES.find((m) => new Date(m.target).getTime() > now);
      if (nextMilestone) {
        const diff = Math.max(0, new Date(nextMilestone.target).getTime() - now);
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setHeroCountdown({
          title: nextMilestone.label,
          d: pad(days),
          h: pad(hours),
          m: pad(mins),
          s: pad(secs)
        });
      } else {
        setHeroCountdown({
          title: 'TELUGU ICON DIGITAL & INFLUENCER AWARDS 2026',
          d: '00',
          h: '00',
          m: '00',
          s: '00'
        });
      }

      // Compute all 6 milestone timers
      const newTimelineTimes = {};
      MILESTONES.forEach((m) => {
        const diff = new Date(m.target).getTime() - now;
        if (diff <= 0) {
          newTimelineTimes[m.target] = { d: '00', h: '00', m: '00', s: '00', ended: true };
        } else {
          newTimelineTimes[m.target] = {
            d: pad(Math.floor(diff / 86400000)),
            h: pad(Math.floor((diff % 86400000) / 3600000)),
            m: pad(Math.floor((diff % 3600000) / 60000)),
            s: pad(Math.floor((diff % 60000) / 1000)),
            ended: false
          };
        }
      });
      setTimelineTimes(newTimelineTimes);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredCategories = useMemo(() => {
    return ALL_CATEGORIES_DATA.filter((cat) => {
      const matchesType =
        categoryFilter === 'all' ||
        (categoryFilter === 'public' && cat.type === 'public') ||
        (categoryFilter === 'jury' && cat.type === 'jury');
      const matchesSearch =
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.num.includes(searchQuery);
      return matchesType && matchesSearch;
    });
  }, [categoryFilter, searchQuery]);

  const displayedCategories = showAllCategories ? filteredCategories : filteredCategories.slice(0, 12);

  return (
    <PageTransition>
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[560px] sm:min-h-[720px] md:min-h-[820px] flex items-center justify-center text-center overflow-hidden bg-gradient-to-br from-[#330000] via-[#820000] to-[#3d0000] py-12 sm:py-20 px-3 sm:px-4">
        {/* Glow & rings */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-7 border border-[rgba(216,181,107,0.22)] rounded-lg pointer-events-none hidden sm:block" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[760px] h-[760px] rounded-full border border-[rgba(216,181,107,0.1)] shadow-[0_0_0_90px_rgba(216,181,107,0.025),0_0_0_180px_rgba(216,181,107,0.018)] pointer-events-none" />
          <div className="absolute top-[18%] left-1/2 -translate-x-1/2 w-96 h-96 bg-[rgba(238,191,99,0.14)] rounded-full blur-3xl pointer-events-none" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto pt-4 sm:pt-10">
          {/* Official artwork carries the brand here, so the h1 no longer repeats
              the event name - it states the promise instead. Avoids two competing
              lockups stacked on top of each other. */}
          <div className="flex justify-center mb-5 sm:mb-7">
            <span className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 sm:px-6 sm:py-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] ring-1 ring-[rgba(216,181,107,0.35)]">
              <img
                src="/brand/logo-wide.jpg"
                alt="Telugu Icon Digital & Influencer Awards 2026"
                width="1200"
                height="400"
                className="w-[240px] sm:w-[380px] lg:w-[480px] h-auto object-contain select-none"
              />
            </span>
          </div>

          <h1 className="font-serif-luxury text-xl sm:text-3xl md:text-5xl lg:text-6xl font-black text-[#fff7e8] leading-tight sm:leading-[1.08] max-w-4xl mx-auto mb-4 sm:mb-6">
            The Telugu Digital <span className="block text-[#f1d99a]">Creator Celebration</span>
          </h1>

          <p className="text-[#f6e9d5] text-xs sm:text-base md:text-lg max-w-3xl mx-auto mb-6 sm:mb-8 font-light leading-relaxed">
            Celebrating the creators, communities and digital voices shaping Telugu culture, influence and impact.
          </p>

          <div className="flex justify-center flex-wrap gap-2 mb-6 sm:mb-8">
            <div className="px-2.5 py-1.5 sm:px-4 sm:py-2 border border-[rgba(216,181,107,0.3)] bg-black/20 text-[#f5e7d4] text-[10px] sm:text-xs font-bold tracking-wider rounded">
              16 NOVEMBER 2026
            </div>
            <div className="px-2.5 py-1.5 sm:px-4 sm:py-2 border border-[rgba(216,181,107,0.3)] bg-black/20 text-[#f5e7d4] text-[10px] sm:text-xs font-bold tracking-wider rounded">
              SHILPAKALA VEDIKA · HYDERABAD
            </div>
            <div className="px-2.5 py-1.5 sm:px-4 sm:py-2 border border-[rgba(216,181,107,0.3)] bg-black/20 text-[#f5e7d4] text-[10px] sm:text-xs font-bold tracking-wider rounded">
              TWO SESSIONS
            </div>
          </div>

          <div className="flex justify-center gap-2.5 sm:gap-3.5 flex-wrap mb-8 sm:mb-10">
            <Link to="/nominate" className="btn-gold">
              SELF-NOMINATE
            </Link>
            <Link to="/vote" className="btn-outline">
              VOTE NOW
            </Link>
            <Link to="/tickets" className="btn-outline">
              BOOK TICKETS
            </Link>
          </div>

          {/* Dynamic Countdown */}
          <div className="mt-4 sm:mt-8">
            <div className="text-[#f1d99a] text-[10px] sm:text-xs tracking-[2px] sm:tracking-[3px] font-black mb-3">
              {heroCountdown.title}
            </div>
            <div className="flex justify-center gap-1.5 sm:gap-4">
              <div className="timebox">
                <strong className="block text-lg sm:text-2xl md:text-3xl font-black text-white">{heroCountdown.d}</strong>
                <span className="text-[9px] sm:text-[10px] text-[#bca998] tracking-widest uppercase">DAYS</span>
              </div>
              <div className="timebox">
                <strong className="block text-lg sm:text-2xl md:text-3xl font-black text-white">{heroCountdown.h}</strong>
                <span className="text-[9px] sm:text-[10px] text-[#bca998] tracking-widest uppercase">HOURS</span>
              </div>
              <div className="timebox">
                <strong className="block text-lg sm:text-2xl md:text-3xl font-black text-white">{heroCountdown.m}</strong>
                <span className="text-[9px] sm:text-[10px] text-[#bca998] tracking-widest uppercase">MINS</span>
              </div>
              <div className="timebox">
                <strong className="block text-lg sm:text-2xl md:text-3xl font-black text-white">{heroCountdown.s}</strong>
                <span className="text-[9px] sm:text-[10px] text-[#bca998] tracking-widest uppercase">SECS</span>
              </div>
            </div>
          </div>

          <div className="mt-6 sm:mt-8 text-[11px] sm:text-xs text-[#d9c6b0]/80 px-2">
            Nominations: 01 Oct – 05 Nov · Voting: 10 Oct – 15 Nov · Vote display hidden from 12 Nov
          </div>
        </div>
      </section>

      {/* 2. INTRO & STATS */}
      <section className="py-12 sm:py-20 md:py-24 bg-gradient-to-b from-[#160505] to-[#210909] text-center" id="about">
        <div className="max-w-6xl mx-auto px-4">
          <div className="max-w-3xl mx-auto mb-8 sm:mb-12">
            <div className="text-[10px] tracking-[3px] sm:tracking-[4px] text-[#d8b56b] font-black uppercase mb-2">
              Not Just An Awards Website
            </div>
            <h2 className="section-title text-2xl sm:text-4xl md:text-5xl">
              The Digital Home of Telugu Creators.
            </h2>
            <p className="text-[#a99888] text-xs sm:text-sm md:text-base leading-relaxed">
              A creator-first ecosystem connecting self-nominations, public voting, campaign tools, brands, media and the live awards experience.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 border border-[rgba(216,181,107,0.25)] bg-[rgba(33,10,10,0.72)] rounded-lg overflow-hidden">
            <div className="p-4 sm:p-6 md:p-8 border-r border-b md:border-b-0 border-[rgba(216,181,107,0.25)]">
              <strong className="block text-2xl sm:text-4xl md:text-5xl font-serif-luxury text-[#f1d99a] mb-1">50</strong>
              <span className="text-[9px] sm:text-[10px] tracking-[1px] sm:tracking-[1.5px] text-[#a99888] uppercase font-bold">PUBLIC VOTING CATEGORIES</span>
            </div>
            <div className="p-4 sm:p-6 md:p-8 border-b md:border-b-0 md:border-r border-[rgba(216,181,107,0.25)]">
              <strong className="block text-2xl sm:text-4xl md:text-5xl font-serif-luxury text-[#f1d99a] mb-1">10</strong>
              <span className="text-[9px] sm:text-[10px] tracking-[1px] sm:tracking-[1.5px] text-[#a99888] uppercase font-bold">JURY &amp; SPECIAL RECOGNITION</span>
            </div>
            <div className="p-4 sm:p-6 md:p-8 border-r border-[rgba(216,181,107,0.25)]">
              <strong className="block text-2xl sm:text-4xl md:text-5xl font-serif-luxury text-[#f1d99a] mb-1">2</strong>
              <span className="text-[9px] sm:text-[10px] tracking-[1px] sm:tracking-[1.5px] text-[#a99888] uppercase font-bold">LIVE EVENT SESSIONS</span>
            </div>
            <div className="p-4 sm:p-6 md:p-8">
              <strong className="block text-2xl sm:text-4xl md:text-5xl font-serif-luxury text-[#f1d99a] mb-1">1</strong>
              <span className="text-[9px] sm:text-[10px] tracking-[1px] sm:tracking-[1.5px] text-[#a99888] uppercase font-bold">CREATOR-DRIVEN MOVEMENT</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. THE STEPS: FROM CREATOR TO ICON */}
      <section className="py-12 sm:py-20 md:py-24 bg-[#160505]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
            <div className="text-[10px] tracking-[3px] sm:tracking-[4px] text-[#d8b56b] font-black uppercase mb-2">The Journey</div>
            <h2 className="section-title text-2xl sm:text-4xl md:text-5xl">From Creator to Icon</h2>
            <p className="text-[#a99888] text-xs sm:text-sm md:text-base">
              A simple journey designed to turn every nominee into a campaigner for their own story.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {[
              { num: '01', t: 'Self-Nominate', d: 'Choose your category and submit your own story.' },
              { num: '02', t: 'Get Verified', d: 'Your nomination moves through the official review process.' },
              { num: '03', t: 'Get Your Kit', d: 'Receive your personalised nominee poster, link and QR.' },
              { num: '04', t: 'Campaign & Vote', d: 'Share your page and mobilise your audience.' },
              { num: '05', t: 'Become an Icon', d: 'Winners are announced live on November 16; final verified results are published transparently after the ceremony.' },
            ].map((st) => (
              <div key={st.num} className="card-preview p-4 sm:p-6 text-center group hover:border-[#d8b56b] transition-all">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-[#d8b56b] text-[#f1d99a] font-black flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform text-sm sm:text-base">
                  {st.num}
                </div>
                <h3 className="font-serif-luxury text-[#f1d99a] text-base sm:text-lg font-bold mb-1.5 sm:mb-2">{st.t}</h3>
                <p className="text-[#d7c8b8] text-xs leading-relaxed">{st.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. THE CATEGORIES SECTION */}
      <section className="py-12 sm:py-20 md:py-24 bg-gradient-to-b from-[#210909] to-[#160505]" id="categories">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
            <div className="text-[10px] tracking-[3px] sm:tracking-[4px] text-[#d8b56b] font-black uppercase mb-2">The Categories</div>
            <h2 className="section-title text-2xl sm:text-4xl md:text-5xl">Find Your Category.</h2>
            <p className="text-[#a99888] text-xs sm:text-sm md:text-base">
              Every award clearly identifies its decision method: public voting or official jury selection.
            </p>
          </div>

          {/* Highlight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-8 sm:mb-12">
            <div className="card-preview p-4 sm:p-6">
              <span className="badge-gold">🗳 PEOPLE'S CHOICE · PUBLIC VOTING</span>
              <h3 className="font-serif-luxury text-[#f1d99a] text-lg sm:text-xl font-bold mt-2.5 mb-2">Telugu Digital Creator of the Year</h3>
              <p className="text-[#d7c8b8] text-xs">Recognising a creator with exceptional digital influence and audience impact.</p>
              <div className="text-[10px] sm:text-[11px] text-[#a89684] mt-3 sm:mt-4 font-semibold tracking-wider">CATEGORY PARTNER OPPORTUNITY</div>
            </div>
            <div className="card-preview p-4 sm:p-6">
              <span className="badge-gold">🗳 PEOPLE'S CHOICE · PUBLIC VOTING</span>
              <h3 className="font-serif-luxury text-[#f1d99a] text-lg sm:text-xl font-bold mt-2.5 mb-2">Telugu YouTuber of the Year</h3>
              <p className="text-[#d7c8b8] text-xs">Celebrating outstanding YouTube creators and communities.</p>
              <div className="text-[10px] sm:text-[11px] text-[#a89684] mt-3 sm:mt-4 font-semibold tracking-wider">CATEGORY PARTNER OPPORTUNITY</div>
            </div>
            <div className="card-preview p-4 sm:p-6">
              <span className="badge-gold">🗳 PEOPLE'S CHOICE · PUBLIC VOTING</span>
              <h3 className="font-serif-luxury text-[#f1d99a] text-lg sm:text-xl font-bold mt-2.5 mb-2">Most Popular Digital Creator</h3>
              <p className="text-[#d7c8b8] text-xs">Recognising a creator with exceptional audience engagement.</p>
              <div className="text-[10px] sm:text-[11px] text-[#a89684] mt-3 sm:mt-4 font-semibold tracking-wider">CATEGORY PARTNER OPPORTUNITY</div>
            </div>
            <div className="card-preview p-4 sm:p-6">
              <span className="badge-gold">🗳 PEOPLE'S CHOICE · PUBLIC VOTING</span>
              <h3 className="font-serif-luxury text-[#f1d99a] text-lg sm:text-xl font-bold mt-2.5 mb-2">Best Entertainment Creator</h3>
              <p className="text-[#d7c8b8] text-xs">Creators who consistently entertain Telugu digital audiences.</p>
              <div className="text-[10px] sm:text-[11px] text-[#a89684] mt-3 sm:mt-4 font-semibold tracking-wider">CATEGORY PARTNER OPPORTUNITY</div>
            </div>
            <div className="card-preview p-4 sm:p-6">
              <span className="badge-gold">🗳 PEOPLE'S CHOICE · PUBLIC VOTING</span>
              <h3 className="font-serif-luxury text-[#f1d99a] text-lg sm:text-xl font-bold mt-2.5 mb-2">Rising Digital Star of the Year</h3>
              <p className="text-[#d7c8b8] text-xs">Recognising emerging talent making a strong digital impact.</p>
              <div className="text-[10px] sm:text-[11px] text-[#a89684] mt-3 sm:mt-4 font-semibold tracking-wider">CATEGORY PARTNER OPPORTUNITY</div>
            </div>
            <div className="card-preview p-4 sm:p-6">
              <span className="badge-gold">👑 JURY AWARD · JURY SELECTED</span>
              <h3 className="font-serif-luxury text-[#f1d99a] text-lg sm:text-xl font-bold mt-2.5 mb-2">Lifetime Achievement — Digital Media</h3>
              <p className="text-[#d7c8b8] text-xs">Special recognition selected by the official jury; not a public voting category.</p>
              <div className="text-[10px] sm:text-[11px] text-[#a89684] mt-3 sm:mt-4 font-semibold tracking-wider">HONORARY RECOGNITION</div>
            </div>
          </div>

          {/* Complete Award Structure Explorer */}
          <div className="pt-6 sm:pt-8 border-t border-[rgba(216,181,107,0.25)]">
            <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-8">
              <div className="text-[10px] tracking-[3px] sm:tracking-[4px] text-[#d8b56b] font-black uppercase mb-1">Complete Award Structure</div>
              <h3 className="font-serif-luxury text-xl sm:text-3xl md:text-4xl text-[#fff7e8] font-bold mb-2">50 Public Categories + 10 Special Awards.</h3>
              <p className="text-[#a99888] text-xs sm:text-sm mb-4">
                Creators can self-nominate in up to 3 relevant public categories. Jury awards are not selectable for self-nomination.
              </p>

              {/* Filters and search */}
              <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-center items-center mt-4 sm:mt-6">
                <div className="inline-flex rounded border border-[rgba(216,181,107,0.3)] bg-black/40 p-1 flex-wrap justify-center">
                  {[
                    { key: 'all', label: 'All 60 Awards' },
                    { key: 'public', label: '50 Public Voting' },
                    { key: 'jury', label: '10 Jury / Special' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setCategoryFilter(tab.key)}
                      className={`px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-semibold rounded transition-colors ${
                        categoryFilter === tab.key ? 'bg-[#d8b56b] text-[#160505]' : 'text-[#cdbda9] hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded bg-black/40 border border-[rgba(216,181,107,0.3)] text-white placeholder-white/40 focus:outline-none focus:border-[#d8b56b] w-full sm:w-64"
                />
              </div>
            </div>

            {/* Grid of categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {displayedCategories.map((c) => (
                <div key={c.id} className="card-preview p-4 sm:p-5 group hover:border-[#d8b56b]/60 transition-all">
                  <span className="badge-gold">
                    #{c.num} · {c.type === 'public' ? 'SELF-NOMINATION + PUBLIC VOTING' : 'JURY / SPECIAL'}
                  </span>
                  <h4 className="font-serif-luxury text-[#f1d99a] text-base sm:text-lg font-bold mt-2 mb-1 group-hover:text-white transition-colors">
                    {c.name}
                  </h4>
                  <p className="text-[#d7c8b8] text-xs leading-relaxed">{c.desc}</p>
                  <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-[rgba(216,181,107,0.15)] flex justify-between items-center text-xs">
                    {c.type === 'public' ? (
                      <Link to="/nominate" className="text-[#d8b56b] hover:text-white font-semibold flex items-center gap-1">
                        Self-Nominate →
                      </Link>
                    ) : (
                      <span className="text-[#a99888] text-[11px]">Jury Selected</span>
                    )}
                    <Link to="/awards" className="text-white/40 hover:text-white text-[11px]">Details</Link>
                  </div>
                </div>
              ))}
            </div>

            {filteredCategories.length > 12 && (
              <div className="text-center mt-6 sm:mt-8">
                <button
                  onClick={() => setShowAllCategories(!showAllCategories)}
                  className="btn-outline"
                >
                  {showAllCategories ? 'SHOW LESS' : `EXPLORE ALL ${filteredCategories.length} CATEGORIES`}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. NOMINATION SECTION */}
      <section className="py-12 sm:py-20 md:py-24 bg-gradient-to-r from-[#500000] via-[#860000] to-[#430000] text-center" id="nominate">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-[10px] tracking-[3px] sm:tracking-[4px] text-[#f1d99a] font-black uppercase mb-2">01 OCTOBER 2026</div>
          <h2 className="section-title text-2xl sm:text-4xl md:text-5xl text-[#fff7e8]">Own Your Story. Self-Nominate.</h2>
          <p className="text-[#f0dcc1] text-xs sm:text-sm md:text-base max-w-2xl mx-auto mb-3">
            Self-nominations only. There is no “Nominate Someone Else” option.
          </p>
          <div className="p-3.5 sm:p-4 rounded border border-[rgba(216,181,107,0.4)] bg-black/30 text-[#f1d99a] text-xs font-bold max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed">
            Each creator/influencer may self-nominate in a maximum of <strong>3 categories only</strong>, and every selected category must be genuinely relevant to their content, work or digital presence.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 mb-8 sm:mb-10">
            <div className="border border-[rgba(255,240,210,0.25)] bg-black/25 p-4 sm:p-6 rounded text-left">
              <div className="text-xs text-[#f1d99a] font-black tracking-wider mb-1.5 sm:mb-2">01 OCT</div>
              <h3 className="font-serif-luxury text-lg sm:text-xl font-bold text-white mb-1.5 sm:mb-2">Nominations Open</h3>
              <p className="text-[#ead8c0] text-xs">Creators can submit their own nominations across eligible categories.</p>
            </div>
            <div className="border border-[rgba(255,240,210,0.25)] bg-black/25 p-4 sm:p-6 rounded text-left">
              <div className="text-xs text-[#f1d99a] font-black tracking-wider mb-1.5 sm:mb-2">01–09 OCT</div>
              <h3 className="font-serif-luxury text-lg sm:text-xl font-bold text-white mb-1.5 sm:mb-2">Creator Acquisition</h3>
              <p className="text-[#ead8c0] text-xs">Creators receive verification support and prepare campaign assets.</p>
            </div>
            <div className="border border-[rgba(255,240,210,0.25)] bg-black/25 p-4 sm:p-6 rounded text-left">
              <div className="text-xs text-[#f1d99a] font-black tracking-wider mb-1.5 sm:mb-2">10 OCT</div>
              <h3 className="font-serif-luxury text-lg sm:text-xl font-bold text-white mb-1.5 sm:mb-2">Voting Goes Live</h3>
              <p className="text-[#ead8c0] text-xs">Approved nominees enter the public voting phase.</p>
            </div>
          </div>

          <div>
            <Link to="/nominate" className="btn-gold">
              START SELF-NOMINATION
            </Link>
          </div>
        </div>
      </section>

      {/* 6. NOMINEE EXPERIENCE */}
      <section className="py-12 sm:py-20 md:py-24 bg-[#160505]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
            <div className="text-[10px] tracking-[3px] sm:tracking-[4px] text-[#d8b56b] font-black uppercase mb-2">Nominee Experience</div>
            <h2 className="section-title text-2xl sm:text-4xl md:text-5xl">Your Nominee Page Becomes Your Campaign Hub.</h2>
            <p className="text-[#a99888] text-xs sm:text-sm md:text-base">
              Every approved creator gets a dedicated profile that can be shared across Instagram, WhatsApp, YouTube and every other channel.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
            <div className="lg:col-span-7 border border-[rgba(216,181,107,0.25)] bg-gradient-to-br from-[#5b0000] to-[#250909] p-5 sm:p-8 md:p-12 rounded-lg flex flex-col justify-end">
              <span className="badge-gold w-fit mb-3 sm:mb-4">OFFICIAL NOMINEE PROFILE</span>
              <h3 className="font-serif-luxury text-2xl sm:text-3xl md:text-5xl font-black text-[#fff7e8] leading-tight mb-3 sm:mb-4">
                YOUR NAME.<br />YOUR STORY.<br />YOUR VOTE.
              </h3>
              <p className="text-[#dbc9b5] text-xs sm:text-sm max-w-lg mb-5 sm:mb-6 leading-relaxed">
                Profile photo · Category · Creator bio · Social links · Verified voting link · QR code · Share tools.
              </p>
              <div>
                <Link to="/nominees" className="btn-gold">
                  VIEW SAMPLE NOMINEE
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 card-preview p-5 sm:p-8 flex flex-col justify-center">
              <h3 className="font-serif-luxury text-[#f1d99a] text-xl sm:text-2xl font-bold mb-2.5 sm:mb-3">After You Submit</h3>
              <p className="text-[#d7c8b8] text-xs sm:text-sm mb-4 sm:mb-6">
                Once your nomination is approved, the platform automatically generates your official campaign assets:
              </p>
              <div className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm text-[#d7c8b8]">
                <div className="flex items-center gap-2"><span className="text-[#8fe0a5]">✓</span> Official nominee badge</div>
                <div className="flex items-center gap-2"><span className="text-[#8fe0a5]">✓</span> Personal nominee URL</div>
                <div className="flex items-center gap-2"><span className="text-[#8fe0a5]">✓</span> Voting QR code</div>
                <div className="flex items-center gap-2"><span className="text-[#8fe0a5]">✓</span> Social sharing tools</div>
                <div className="flex items-center gap-2"><span className="text-[#8fe0a5]">✓</span> Downloadable nominee poster</div>
                <div className="flex items-center gap-2"><span className="text-[#8fe0a5]">✓</span> Campaign-ready copy</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CAMPAIGN KIT */}
      <section className="py-12 sm:py-20 md:py-24 bg-gradient-to-b from-[#1b0707] to-[#290c0c] text-center">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
            <div className="text-[10px] tracking-[3px] sm:tracking-[4px] text-[#d8b56b] font-black uppercase mb-2">Campaign Kit</div>
            <h2 className="section-title text-2xl sm:text-4xl md:text-5xl">Turn Every Nominee Into a Media Channel.</h2>
            <p className="text-[#a99888] text-xs sm:text-sm md:text-base">
              One click gives every creator everything they need to campaign professionally.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="border border-[rgba(216,181,107,0.25)] bg-black/20 p-4 sm:p-6 rounded text-center">
              <div className="text-2xl sm:text-3xl text-[#d8b56b] mb-2 sm:mb-3">✦</div>
              <h3 className="font-serif-luxury text-white text-base sm:text-lg font-bold mb-1">Nominee Poster</h3>
              <p className="text-[#a99888] text-[11px] sm:text-xs">Personalised official creative</p>
            </div>
            <div className="border border-[rgba(216,181,107,0.25)] bg-black/20 p-4 sm:p-6 rounded text-center">
              <div className="text-2xl sm:text-3xl text-[#d8b56b] mb-2 sm:mb-3">⌁</div>
              <h3 className="font-serif-luxury text-white text-base sm:text-lg font-bold mb-1">Voting Link</h3>
              <p className="text-[#a99888] text-[11px] sm:text-xs">Unique shareable URL</p>
            </div>
            <div className="border border-[rgba(216,181,107,0.25)] bg-black/20 p-4 sm:p-6 rounded text-center">
              <div className="text-2xl sm:text-3xl text-[#d8b56b] mb-2 sm:mb-3">▣</div>
              <h3 className="font-serif-luxury text-white text-base sm:text-lg font-bold mb-1">QR Code</h3>
              <p className="text-[#a99888] text-[11px] sm:text-xs">Scan-to-vote campaign asset</p>
            </div>
            <div className="border border-[rgba(216,181,107,0.25)] bg-black/20 p-4 sm:p-6 rounded text-center">
              <div className="text-2xl sm:text-3xl text-[#d8b56b] mb-2 sm:mb-3">◈</div>
              <h3 className="font-serif-luxury text-white text-base sm:text-lg font-bold mb-1">Social Templates</h3>
              <p className="text-[#a99888] text-[11px] sm:text-xs">Instagram, WhatsApp &amp; YouTube</p>
            </div>
          </div>

          <div className="mt-8 sm:mt-10">
            <Link to="/nominee-kit" className="btn-gold">
              OPEN CREATOR CAMPAIGN KIT
            </Link>
          </div>
        </div>
      </section>

      {/* 8. PUBLIC VOTING & LEADERBOARD */}
      <section className="py-12 sm:py-20 md:py-24 bg-[#120404]" id="vote">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
            <div className="text-[10px] tracking-[3px] sm:tracking-[4px] text-[#d8b56b] font-black uppercase mb-2">10 October – 15 November 2026</div>
            <h2 className="section-title text-2xl sm:text-4xl md:text-5xl">Every Vote Counts. Every Vote Is Visible.</h2>
            <p className="text-[#a99888] text-xs sm:text-sm leading-relaxed">
              Public voting opens October 10 and closes November 15 at 11:59 PM. Verified vote counts and category positions are publicly displayed through November 11. From November 12, public vote totals and rankings are hidden while voting continues securely until November 15.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            <div className="lg:col-span-8">
              <LiveLeaderboard maxItems={8} showFilters={true} />
            </div>

            <div className="lg:col-span-4 space-y-3.5 sm:space-y-4">
              <div className="p-4 sm:p-6 border border-[rgba(216,181,107,0.25)] bg-[#1b0808] rounded-lg">
                <h3 className="font-serif-luxury text-[#f1d99a] text-base sm:text-lg font-bold mb-1.5 sm:mb-2">OTP Verified Voting</h3>
                <p className="text-[#d7c8b8] text-xs leading-relaxed">
                  Indian mobile OTP, duplicate-vote controls, rate limiting, bot protection and fraud review ensure 100% integrity.
                </p>
              </div>

              <div className="p-4 sm:p-6 border border-[rgba(216,181,107,0.25)] bg-[#1b0808] rounded-lg">
                <h3 className="font-serif-luxury text-[#f1d99a] text-base sm:text-lg font-bold mb-1.5 sm:mb-2">Transparent &amp; Protected</h3>
                <p className="text-[#d7c8b8] text-xs leading-relaxed">
                  Public counts are displayed openly, while detailed fraud signals, audit logs and moderation controls remain secure inside the backend.
                </p>
              </div>

              <div className="pt-2">
                <Link to="/vote" className="btn-gold w-full text-center">
                  VOTE FOR YOUR ICON NOW
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. OFFICIAL TIMELINE: ROAD TO NOVEMBER 16 */}
      <section className="py-12 sm:py-20 md:py-24 bg-[#160505]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
            <div className="text-[10px] tracking-[3px] sm:tracking-[4px] text-[#d8b56b] font-black uppercase mb-2">Official Timeline</div>
            <h2 className="section-title text-2xl sm:text-4xl md:text-5xl">The Road to November 16.</h2>
            <p className="text-[#a99888] text-xs sm:text-sm md:text-base">
              Live countdowns below are driven by the official event schedule.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {[
              { target: '2026-10-01T00:00:00+05:30', date: '01 OCT 2026', t: 'Nominations Open', d: 'Self-nominations open for all 50 public-voting categories. Maximum 3 relevant categories per creator.' },
              { target: '2026-11-05T23:59:59+05:30', date: '05 NOV 2026 · 11:59 PM', t: 'Nominations Close', d: 'New self-nominations stop. Verification and shortlisting continue.' },
              { target: '2026-10-10T00:00:00+05:30', date: '10 OCT 2026', t: 'Voting Opens', d: 'Public voting begins for approved nominees across all 50 eligible categories.' },
              { target: '2026-11-12T00:00:00+05:30', date: '12 NOV 2026', t: 'Public Vote Display Off', d: 'Live vote totals and public rankings are hidden. Voting remains open and the secure backend continues recording valid votes.' },
              { target: '2026-11-15T23:59:59+05:30', date: '15 NOV 2026 · 11:59 PM', t: 'Voting Closes', d: 'Voting stops. Final verification, duplicate checks, suspicious-activity review and vote reconciliation begin.' },
              { target: '2026-11-16T10:00:00+05:30', date: '16 NOV 2026 · 10:00 AM', t: 'Winners Announced Live', d: 'Winners are announced at Shilpakala Vedika. No winner is displayed on the website before the official announcement.' },
            ].map((p) => {
              const tm = timelineTimes[p.target] || { d: '00', h: '00', m: '00', s: '00', ended: false };
              return (
                <div key={p.t} className="p-4 sm:p-6 border border-[rgba(255,240,210,0.2)] bg-[#250909] rounded-lg flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] sm:text-xs text-[#f1d99a] font-black tracking-wider mb-1">{p.date}</div>
                    <h3 className="font-serif-luxury text-lg sm:text-xl font-bold text-white mb-1.5 sm:mb-2">{p.t}</h3>
                    <p className="text-[#ead8c0] text-xs leading-relaxed mb-3 sm:mb-4">{p.d}</p>
                  </div>
                  <div className="pt-3 sm:pt-4 border-t border-[rgba(216,181,107,0.15)]">
                    <div className="text-[10px] text-[#f1d99a] font-bold tracking-widest uppercase mb-2">
                      {tm.ended ? 'COMPLETED' : 'TIME REMAINING'}
                    </div>
                    <div className="flex gap-1.5 sm:gap-2">
                      <div className="timebox py-1 px-1.5 min-w-[44px] sm:min-w-[50px]"><strong className="text-xs sm:text-sm font-bold text-white">{tm.d}</strong><span className="text-[7px] sm:text-[8px] text-[#a99888]">D</span></div>
                      <div className="timebox py-1 px-1.5 min-w-[44px] sm:min-w-[50px]"><strong className="text-xs sm:text-sm font-bold text-white">{tm.h}</strong><span className="text-[7px] sm:text-[8px] text-[#a99888]">H</span></div>
                      <div className="timebox py-1 px-1.5 min-w-[44px] sm:min-w-[50px]"><strong className="text-xs sm:text-sm font-bold text-white">{tm.m}</strong><span className="text-[7px] sm:text-[8px] text-[#a99888]">M</span></div>
                      <div className="timebox py-1 px-1.5 min-w-[44px] sm:min-w-[50px]"><strong className="text-xs sm:text-sm font-bold text-white">{tm.s}</strong><span className="text-[7px] sm:text-[8px] text-[#a99888]">S</span></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 10. RESULTS TRANSPARENCY SECTION */}
      <section className="py-12 sm:py-20 md:py-24 bg-[#120404]" id="transparency">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
            <div className="text-[10px] tracking-[3px] sm:tracking-[4px] text-[#d8b56b] font-black uppercase mb-2">Results Transparency</div>
            <h2 className="section-title text-2xl sm:text-4xl md:text-5xl">Transparent Voting. Protected Final Results.</h2>
            <p className="text-[#a99888] text-xs sm:text-sm md:text-base">
              The website shows the public exactly what is visible during each stage and publishes the final verified results after the live announcement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-6 sm:mb-8">
            <div className="card-preview p-4 sm:p-6">
              <h3 className="font-serif-luxury text-[#f1d99a] text-base sm:text-lg font-bold mb-1.5 sm:mb-2">10 OCT – 11 NOV</h3>
              <p className="text-[#d7c8b8] text-xs leading-relaxed">
                <strong>Live Public Results.</strong> Verified vote totals, category positions and last-updated information may be displayed publicly for the 50 voting categories.
              </p>
            </div>
            <div className="card-preview p-4 sm:p-6">
              <h3 className="font-serif-luxury text-[#f1d99a] text-base sm:text-lg font-bold mb-1.5 sm:mb-2">12 NOV – 15 NOV</h3>
              <p className="text-[#d7c8b8] text-xs leading-relaxed">
                <strong>Vote Display Hidden.</strong> Voting remains fully open, but public vote totals, rankings and leaderboard counts are hidden to avoid influencing late-stage voting.
              </p>
            </div>
            <div className="card-preview p-4 sm:p-6">
              <h3 className="font-serif-luxury text-[#f1d99a] text-base sm:text-lg font-bold mb-1.5 sm:mb-2">15 NOV · 11:59 PM</h3>
              <p className="text-[#d7c8b8] text-xs leading-relaxed">
                <strong>Voting Locked.</strong> No new votes are accepted after the published closing time. The system begins final reconciliation and verification.
              </p>
            </div>
            <div className="card-preview p-4 sm:p-6">
              <h3 className="font-serif-luxury text-[#f1d99a] text-base sm:text-lg font-bold mb-1.5 sm:mb-2">16 NOV · LIVE EVENT</h3>
              <p className="text-[#d7c8b8] text-xs leading-relaxed">
                <strong>Winners Announced.</strong> Winners are revealed on stage at Shilpakala Vedika, Hyderabad. The website will not publish winners early.
              </p>
            </div>
            <div className="card-preview p-4 sm:p-6">
              <h3 className="font-serif-luxury text-[#f1d99a] text-base sm:text-lg font-bold mb-1.5 sm:mb-2">AFTER ANNOUNCEMENT</h3>
              <p className="text-[#d7c8b8] text-xs leading-relaxed">
                <strong>Final Results Page.</strong> Publish the verified winner, final verified vote total for each public-voting category, nominee ID and relevant verification information.
              </p>
            </div>
            <div className="card-preview p-4 sm:p-6">
              <h3 className="font-serif-luxury text-[#f1d99a] text-base sm:text-lg font-bold mb-1.5 sm:mb-2">JURY AWARDS</h3>
              <p className="text-[#d7c8b8] text-xs leading-relaxed">
                <strong>No Public Vote Totals.</strong> The 10 Jury &amp; Special Recognition Awards are clearly identified as jury/special awards and are not part of public voting.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-6 border border-[rgba(216,181,107,0.25)] bg-[#1b0808] rounded-lg">
            <h3 className="font-serif-luxury text-[#f1d99a] text-base sm:text-lg font-bold mb-1.5 sm:mb-2">Audit &amp; Integrity Record</h3>
            <p className="text-[#a99888] text-xs leading-relaxed">
              Maintain secure vote records, timestamps, verification status, duplicate/fraud review records and admin audit logs according to the site’s published privacy and data-retention policy. Public users see the transparent final outcome; sensitive fraud-detection signals remain protected.
            </p>
          </div>
        </div>
      </section>

      {/* 11. TICKETING SECTION */}
      <section className="py-12 sm:py-20 md:py-24 bg-gradient-to-b from-[#150505] to-[#220909]" id="tickets">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
            <div className="text-[10px] tracking-[3px] sm:tracking-[4px] text-[#d8b56b] font-black uppercase mb-2">Ticketing</div>
            <h2 className="section-title text-2xl sm:text-4xl md:text-5xl">Choose Your Session.</h2>
            <p className="text-[#a99888] text-xs sm:text-sm md:text-base">
              Book your preferred session. The public ticket interface shows availability status only — never total capacity or remaining inventory.
            </p>
          </div>

          {/* Session 1 */}
          <div className="mb-10 sm:mb-14">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-1.5 sm:gap-2 mb-4 sm:mb-6 pb-2 border-b border-[rgba(216,181,107,0.2)]">
              <h3 className="font-serif-luxury text-xl sm:text-2xl md:text-3xl font-bold text-[#fff7e8]">☀ Session 1</h3>
              <span className="text-[#f1d99a] text-[11px] sm:text-xs font-bold tracking-wide">10:00 AM – 2:00 PM · COMPLIMENTARY LUNCH</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {renderTicketCard(1, 'vvip', 'COMPLIMENTARY LUNCH INCLUDED', 'Lunch included')}
              {renderTicketCard(1, 'mip', 'COMPLIMENTARY LUNCH INCLUDED', 'Lunch included')}
            </div>
          </div>

          {/* Session 2 */}
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-1.5 sm:gap-2 mb-4 sm:mb-6 pb-2 border-b border-[rgba(216,181,107,0.2)]">
              <h3 className="font-serif-luxury text-xl sm:text-2xl md:text-3xl font-bold text-[#fff7e8]">🌙 Session 2</h3>
              <span className="text-[#f1d99a] text-[11px] sm:text-xs font-bold tracking-wide">3:00 PM – 7:00 PM · COMPLIMENTARY DINNER</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {renderTicketCard(2, 'vvip', 'COMPLIMENTARY DINNER INCLUDED', 'Dinner included')}
              {renderTicketCard(2, 'mip', 'COMPLIMENTARY DINNER INCLUDED', 'Dinner included')}
            </div>
          </div>

          <p className="text-center text-xs text-[#9e8e7e] mt-8 sm:mt-10 max-w-2xl mx-auto">
            Tickets once booked are non-refundable and non-cancellable, except where a refund is required due to event cancellation or applicable law. Final ticket terms will be shown before payment.
          </p>
        </div>
      </section>

      {/* 12. BRAND & CATEGORY PARTNERSHIPS */}
      <section className="py-12 sm:py-20 md:py-24 bg-[#180606]" id="sponsors">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
            <div className="text-[10px] tracking-[3px] sm:tracking-[4px] text-[#d8b56b] font-black uppercase mb-2">Brand Partnerships</div>
            <h2 className="section-title text-2xl sm:text-4xl md:text-5xl">Put Your Brand Where Creators Gather.</h2>
            <p className="text-[#a99888] text-xs sm:text-sm md:text-base">
              Partner with Telugu Icon across nomination campaigns, creator content, public voting, digital media and the live event experience.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10">
            {[
              { t: 'Title Partner', d: 'Premium event-wide visibility' },
              { t: 'Powered By Partner', d: 'Major brand association' },
              { t: 'Co-Powered Partner', d: 'High-visibility partnership' },
              { t: 'Gold Partner', d: 'Premium event presence' },
              { t: 'Silver Partner', d: 'Strong event association' },
              { t: 'Associate Partner', d: 'Brand visibility across ecosystem' },
              { t: 'Category Partner', d: 'Own an award category' },
              { t: 'Supporting Partner', d: 'Official event association' },
            ].map((p) => (
              <div key={p.t} className="min-h-[120px] sm:min-h-[140px] border border-[rgba(216,181,107,0.25)] bg-gradient-to-br from-[#261010] to-[#130606] p-4 sm:p-5 rounded text-center flex flex-col justify-center items-center">
                <strong className="block text-[#f1d99a] font-serif-luxury text-sm sm:text-base md:text-lg mb-1">{p.t}</strong>
                <span className="block text-[#9f907f] text-[11px] sm:text-xs">{p.d}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-3 sm:gap-4 flex-wrap mb-12 sm:mb-16">
            <Link to="/sponsors" className="btn-gold">
              BECOME A PARTNER
            </Link>
            <Link to="/sponsors" className="btn-outline">
              DOWNLOAD PARTNERSHIP PROPOSAL
            </Link>
          </div>

          {/* Category Partnerships */}
          <div className="pt-8 sm:pt-10 border-t border-[rgba(216,181,107,0.2)]">
            <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
              <div className="text-[10px] tracking-[3px] sm:tracking-[4px] text-[#d8b56b] font-black uppercase mb-1">Category Partnerships</div>
              <h3 className="font-serif-luxury text-xl sm:text-2xl md:text-3xl text-[#fff7e8] font-bold mb-2">Own a Category. Own a Creator Conversation.</h3>
              <p className="text-[#a99888] text-xs sm:text-sm">Category partners receive visibility through nomination, voting, social campaigns and the live award presentation.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              <div className="card-preview p-4 sm:p-6">
                <h4 className="font-serif-luxury text-[#f1d99a] text-base sm:text-lg font-bold mb-1.5 sm:mb-2">Nomination Visibility</h4>
                <p className="text-[#d7c8b8] text-xs">Category association across the nomination journey and category page.</p>
              </div>
              <div className="card-preview p-4 sm:p-6">
                <h4 className="font-serif-luxury text-[#f1d99a] text-base sm:text-lg font-bold mb-1.5 sm:mb-2">Voting Visibility</h4>
                <p className="text-[#d7c8b8] text-xs">Brand association during public voting and creator-led campaign activity.</p>
              </div>
              <div className="card-preview p-4 sm:p-6">
                <h4 className="font-serif-luxury text-[#f1d99a] text-base sm:text-lg font-bold mb-1.5 sm:mb-2">Stage Visibility</h4>
                <p className="text-[#d7c8b8] text-xs">Official category presentation and event-stage association.</p>
              </div>
            </div>
            <div className="text-center mt-6 sm:mt-8">
              <Link to="/sponsors" className="btn-outline">
                CHECK CATEGORY PARTNER AVAILABILITY
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 13. PAST EVENTS ARCHIVE */}
      <section className="py-12 sm:py-20 md:py-24 bg-[#130505]" id="past-events">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
            <div className="text-[10px] tracking-[3px] sm:tracking-[4px] text-[#d8b56b] font-black uppercase mb-2">Our Journey</div>
            <h2 className="section-title text-2xl sm:text-4xl md:text-5xl">Past Events</h2>
            <p className="text-[#a99888] text-xs sm:text-sm md:text-base">
              A permanent archive of the events that built the Telugu Icon and Stree Shakti journey.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <article className="card-preview overflow-hidden p-0">
              <div className="h-44 sm:h-60 bg-gradient-to-br from-[#4d0000] to-[#890000] flex items-center justify-center text-center p-4 sm:p-6 border-b border-[rgba(216,181,107,0.25)]">
                <strong className="font-serif-luxury text-[#f1d99a] text-xl sm:text-2xl md:text-3xl leading-tight">
                  TELUGU ICON<br />AWARDS 2026
                </strong>
              </div>
              <div className="p-4 sm:p-6">
                <div className="text-[10px] font-black text-[#d8b56b] tracking-[2px] mb-2 uppercase">30 AUGUST 2026 · HYDERABAD</div>
                <h3 className="font-serif-luxury text-xl sm:text-2xl font-bold text-white mb-2">Telugu Icon Awards 2026</h3>
                <p className="text-[#d7c8b8] text-xs leading-relaxed mb-4 sm:mb-6">
                  Previous Telugu Icon event edition, archived separately from the current Digital &amp; Influencer Awards 2026.
                </p>
                <Link to="/past-events/telugu-icon-awards-2026" className="btn-outline">
                  EXPLORE EVENT
                </Link>
              </div>
            </article>

            <article className="card-preview overflow-hidden p-0">
              <div className="h-44 sm:h-60 bg-gradient-to-br from-[#3b0000] to-[#700000] flex items-center justify-center text-center p-4 sm:p-6 border-b border-[rgba(216,181,107,0.25)]">
                <strong className="font-serif-luxury text-[#f1d99a] text-xl sm:text-2xl md:text-3xl leading-tight">
                  STREE SHAKTI<br />PRATIBHA AWARDS 2025
                </strong>
              </div>
              <div className="p-4 sm:p-6">
                <div className="text-[10px] font-black text-[#d8b56b] tracking-[2px] mb-2 uppercase">2025 · HYDERABAD</div>
                <h3 className="font-serif-luxury text-xl sm:text-2xl font-bold text-white mb-2">Stree Shakti Pratibha Awards 2025</h3>
                <p className="text-[#d7c8b8] text-xs leading-relaxed mb-4 sm:mb-6">
                  Celebrating women achievers and outstanding contributions across diverse fields, presented by Pracharam Media.
                </p>
                <Link to="/past-events/stree-shakti-pratibha-awards-2025" className="btn-outline">
                  EXPLORE EVENT
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* 14. MEDIA HUB */}
      <section className="py-12 sm:py-20 md:py-24 bg-gradient-to-b from-[#220909] to-[#150505]" id="media">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
            <div className="text-[10px] tracking-[3px] sm:tracking-[4px] text-[#d8b56b] font-black uppercase mb-2">Press · Photos · Video</div>
            <h2 className="section-title text-2xl sm:text-4xl md:text-5xl">Experience the Journey.</h2>
            <p className="text-[#a99888] text-xs sm:text-sm md:text-base">
              Build a permanent media archive for creators, partners, press and audiences.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <Link to="/media" className="min-h-[180px] sm:min-h-[220px] border border-[rgba(216,181,107,0.25)] p-4 sm:p-6 bg-gradient-to-br from-[#3b1212] to-[#180707] rounded-lg flex flex-col justify-end group hover:border-[#d8b56b] transition-all">
              <span className="badge-gold w-fit mb-2.5 sm:mb-3">PRESS ROOM</span>
              <h3 className="font-serif-luxury text-[#f1d99a] text-lg sm:text-xl font-bold mb-1 group-hover:text-white transition-colors">News &amp; Announcements</h3>
              <p className="text-[#a99888] text-xs">Official releases, media coverage and event announcements.</p>
            </Link>

            <Link to="/gallery" className="min-h-[180px] sm:min-h-[220px] border border-[rgba(216,181,107,0.25)] p-4 sm:p-6 bg-gradient-to-br from-[#3b1212] to-[#180707] rounded-lg flex flex-col justify-end group hover:border-[#d8b56b] transition-all">
              <span className="badge-gold w-fit mb-2.5 sm:mb-3">PHOTO GALLERY</span>
              <h3 className="font-serif-luxury text-[#f1d99a] text-lg sm:text-xl font-bold mb-1 group-hover:text-white transition-colors">Moments That Matter</h3>
              <p className="text-[#a99888] text-xs">Current and previous event photography.</p>
            </Link>

            <Link to="/videos" className="min-h-[180px] sm:min-h-[220px] border border-[rgba(216,181,107,0.25)] p-4 sm:p-6 bg-gradient-to-br from-[#3b1212] to-[#180707] rounded-lg flex flex-col justify-end group hover:border-[#d8b56b] transition-all">
              <span className="badge-gold w-fit mb-2.5 sm:mb-3">VIDEO HUB</span>
              <h3 className="font-serif-luxury text-[#f1d99a] text-lg sm:text-xl font-bold mb-1 group-hover:text-white transition-colors">Watch the Highlights</h3>
              <p className="text-[#a99888] text-xs">Event films, creator stories and campaign videos.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* 15. FAQ SECTION */}
      <section className="py-12 sm:py-20 md:py-24 bg-[#160505]" id="faq">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10 sm:mb-16">
            <div className="text-[10px] tracking-[3px] sm:tracking-[4px] text-[#d8b56b] font-black uppercase mb-2">Need To Know</div>
            <h2 className="section-title text-2xl sm:text-4xl md:text-5xl">Frequently Asked Questions.</h2>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            {FAQS.map((faq, i) => (
              <details key={faq.q} className="border border-[rgba(216,181,107,0.25)] bg-[#1a0808] p-4 sm:p-5 rounded-lg group" open={i === 0}>
                <summary className="cursor-pointer font-bold text-[#f2dfc3] hover:text-[#f1d99a] transition-colors list-none flex justify-between items-center text-xs sm:text-sm md:text-base">
                  <span>{faq.q}</span>
                  <span className="text-[#d8b56b] text-base sm:text-lg font-mono ml-2 sm:ml-3 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-[#aa9a89] text-xs md:text-sm pt-2.5 sm:pt-3 border-t border-[rgba(216,181,107,0.15)] mt-2.5 sm:mt-3 leading-relaxed">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 16. FINAL CTA BANNER */}
      <section className="py-12 sm:py-20 md:py-24 bg-gradient-to-r from-[#760000] via-[#4b0000] to-[#760000] text-center px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-[10px] tracking-[3px] sm:tracking-[4px] text-[#f1d99a] font-black uppercase mb-2 sm:mb-3">
            16 November 2026 · Shilpakalavedika, Hyderabad
          </div>
          <h2 className="font-serif-luxury text-2xl sm:text-4xl md:text-5xl font-black text-[#fff7e8] leading-tight mb-3 sm:mb-4">
            Creators. Communities. Culture. Influence. Impact.
          </h2>
          <p className="text-[#ead8c0] text-xs sm:text-sm md:text-base max-w-2xl mx-auto mb-6 sm:mb-8 font-light">
            Two sessions. One celebration. A new generation of Telugu digital icons.
          </p>
          <div className="flex justify-center gap-3 sm:gap-4 flex-wrap">
            <Link to="/nominate" className="btn-gold">
              SELF-NOMINATE
            </Link>
            <Link to="/tickets" className="btn-outline">
              BOOK TICKETS
            </Link>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}