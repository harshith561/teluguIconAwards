import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const CORE_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'Categories', path: '/awards' },
  { label: 'Nominees', path: '/nominees' },
  { label: 'Vote', path: '/vote' },
  // { label: 'Tickets', path: '/tickets', badge: 'Live' },
];

const EXPLORE_LINKS = [
  { label: 'Campaign Posters & Kit', path: '/nominee-kit', icon: '🖼️', desc: 'Download official posters & stories' },
  { label: 'Past Events', path: '/past-events', icon: '🏛️', desc: 'Archive & past editions' },
  { label: 'Photo Gallery', path: '/gallery', icon: '📸', desc: 'Event captures & red carpet' },
  { label: 'Media & Press', path: '/media', icon: '📰', desc: 'Press releases & media assets' },
  { label: 'Official Partners', path: '/sponsors', icon: '🤝', desc: 'Brand sponsors & partners' },
  { label: 'FAQ & Rules', path: '/faq', icon: '❓', desc: 'Rules & voting guidelines' },
  { label: 'About the Awards', path: '/about', icon: '📖', desc: 'Vision, jury & Pracharam Media' },
  { label: 'Contact Us', path: '/contact', icon: '✉️', desc: 'Get in touch with committee' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const exploreRef = useRef(null);
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isExploreActive = EXPLORE_LINKS.some((l) => location.pathname.startsWith(l.path));

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (exploreRef.current && !exploreRef.current.contains(e.target)) {
        setExploreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setIsOpen(false);
    setExploreOpen(false);
  }, [location.pathname]);

  // While the drawer is open the page behind must not scroll - on mobile that
  // otherwise lets the document pan sideways and look like a broken layout.
  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [isOpen]);

  // Escape closes the drawer.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#0d0303] border-b border-[rgba(216,181,107,0.25)] text-[10px] sm:text-[11px] text-[#cdbda9] py-1 sm:py-1.5 px-2 sm:px-4 tracking-wider">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-0.5 sm:gap-1 font-semibold text-center sm:text-left">
          <span className="text-[#a99888] tracking-[0.12em] sm:tracking-[0.15em] text-[9px] sm:text-[10px]">PRACHARAM MEDIA PRESENTS</span>
          <span className="text-[#f1d99a] tracking-wide text-[10px] sm:text-[11px]">16 NOVEMBER 2026 · SHILPAKALA VEDIKA, HYDERABAD</span>
        </div>
      </div>

      <nav className="fixed top-[34px] sm:top-[29px] left-0 right-0 z-50 bg-ink-950/90 backdrop-blur-2xl border-b border-white/[0.08] shadow-2xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 lg:h-20">
            {/* Brand Logo */}
            <Link to="/" className="flex items-center gap-3 shrink-0 group" aria-label="Telugu Icon Digital & Influencer Awards 2026 - home">
              {/* The official artwork has a solid white background, so it sits in a
                  white plate rather than being pasted onto the near-black bar.
                  The nav variant is cropped to drop the tagline, which would be
                  ~3px tall at this size. */}
              <span className="shrink-0 inline-flex items-center justify-center h-8 sm:h-9 lg:h-11 max-w-[42vw] sm:max-w-none px-1.5 rounded-lg bg-white shadow-[0_2px_10px_rgba(0,0,0,0.4)] ring-1 ring-champagne-400/40 overflow-hidden transition-transform duration-300 group-hover:scale-[1.04]">
                <img
                  src="/brand/logo-nav.jpg"
                  alt="Telugu Icon Awards 2026"
                  width="480"
                  height="211"
                  className="h-full max-w-full w-auto object-contain select-none"
                />
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center space-x-1 xl:space-x-2">
              {CORE_LINKS.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-1.5 rounded-xl text-xs xl:text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${isActive(link.path)
                      ? 'text-champagne-400 bg-champagne-500/15 font-semibold border border-champagne-500/30'
                      : 'text-white/70 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                >
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-gradient-to-r from-champagne-400 to-amber-500 text-ink-950 uppercase leading-none animate-pulse">
                      {link.badge}
                    </span>
                  )}
                </Link>
              ))}

              {/* Explore Dropdown */}
              <div className="relative" ref={exploreRef}>
                <button
                  onClick={() => setExploreOpen(!exploreOpen)}
                  onMouseEnter={() => setExploreOpen(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs xl:text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${isExploreActive || exploreOpen
                      ? 'text-champagne-400 bg-champagne-500/15 font-semibold border border-champagne-500/30'
                      : 'text-white/70 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                >
                  <span>Explore</span>
                  <svg
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${exploreOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <AnimatePresence>
                  {exploreOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      onMouseLeave={() => setExploreOpen(false)}
                      className="absolute right-0 mt-2 w-64 rounded-2xl bg-ink-900/95 backdrop-blur-2xl border border-white/10 shadow-2xl p-2 z-50 space-y-0.5"
                    >
                      {EXPLORE_LINKS.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setExploreOpen(false)}
                          className={`flex items-start gap-3 px-3 py-2.5 rounded-xl text-xs transition-colors ${isActive(item.path)
                              ? 'bg-champagne-500/15 text-champagne-400 font-semibold'
                              : 'text-white/80 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                          <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
                          <div>
                            <div className="font-medium text-white">{item.label}</div>
                            <div className="text-[10px] text-white/40 leading-tight mt-0.5">{item.desc}</div>
                          </div>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex items-center space-x-2 shrink-0">
              <a
                href="https://funzippy.com/revent/the-telugu-digital-creator-celebration/cRVAJfAwrS8"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-champagne-400 via-amber-400 to-champagne-500 text-ink-950 font-bold text-[11px] sm:text-xs hover:shadow-gold hover:brightness-105 transition-all whitespace-nowrap"
              >
                <span>Book Tickets</span>
              </a>
              <Link
                to="/nominate"
                className="hidden md:inline-flex items-center justify-center px-3.5 py-2 rounded-xl text-xs font-semibold text-champagne-300 border border-champagne-500/40 hover:bg-champagne-500/10 hover:border-champagne-400 transition-all whitespace-nowrap"
              >
                Nominate
              </Link>

              {/* Hamburger Mobile Toggle */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden p-2 text-white/70 hover:text-white rounded-xl bg-white/5 border border-white/10 transition-colors"
                aria-label="Toggle navigation menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Slide-over Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden overflow-hidden"
          >
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-[19rem] max-w-[88vw] bg-ink-900 border-l border-white/10 p-4 sm:p-5 flex flex-col overflow-y-auto overscroll-contain z-10 shadow-2xl"
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center justify-center h-8 max-w-[58%] px-1.5 rounded-lg bg-white/95 overflow-hidden shrink-0">
                      <img
                        src="/brand/logo-sm.jpg"
                        alt="Telugu Icon Awards 2026"
                        width="360"
                        height="158"
                        className="h-full max-w-full w-auto object-contain select-none"
                      />
                    </span>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-7 h-7 rounded-lg bg-white/5 text-white/60 hover:text-white flex items-center justify-center text-xs"
                  >
                    ✕
                  </button>
                </div>

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href="https://funzippy.com/revent/the-telugu-digital-creator-celebration/cRVAJfAwrS8"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsOpen(false)}
                    className="py-2 text-center font-bold text-xs rounded-xl bg-champagne-500 text-ink-950 shadow-gold"
                  >
                    🎟️ Tickets
                  </a>
                  <Link
                    to="/nominate"
                    onClick={() => setIsOpen(false)}
                    className="py-2 text-center font-bold text-xs rounded-xl bg-white/10 text-white border border-white/10"
                  >
                    ⭐ Nominate
                  </Link>
                </div>

                {/* Core Navigation */}
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-white/30 px-3 pb-1">
                    Main Menu
                  </div>
                  {CORE_LINKS.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setIsOpen(false)}
                      className={`w-full px-3.5 py-2.5 text-sm font-medium rounded-xl transition-all flex items-center justify-between ${isActive(link.path)
                          ? 'text-champagne-400 bg-champagne-500/15 font-bold border border-champagne-500/20'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                        }`}
                    >
                      <span>{link.label}</span>
                      {link.badge && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-champagne-500 text-ink-950 uppercase">
                          {link.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>

                {/* Explore Links */}
                <div className="space-y-1 pt-2 border-t border-white/10">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-white/30 px-3 pb-1">
                    Explore More
                  </div>
                  {EXPLORE_LINKS.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={`w-full px-3.5 py-2 text-xs font-medium rounded-xl transition-all flex items-center gap-3 ${isActive(item.path)
                          ? 'text-champagne-400 bg-champagne-500/15 font-bold'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="pt-6 mt-auto border-t border-white/10 text-center text-[11px] text-white/40 shrink-0">
                16 November 2026<br />
                <span className="text-champagne-400/70">Shilpakala Vedika, Hyderabad</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-24 lg:h-28" />
    </>
  );
}