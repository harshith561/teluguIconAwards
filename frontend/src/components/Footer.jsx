import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-[rgba(216,181,107,0.25)] bg-[#0b0303] text-white/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10">
          {/* Brand Col (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-block">
              {/* Full lockup including the tagline - there is room for it here. */}
              <span className="inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 shadow-lg ring-1 ring-[rgba(216,181,107,0.35)]">
                <img
                  src="/brand/logo-md.jpg"
                  alt="Telugu Icon Digital & Influencer Awards 2026"
                  width="800"
                  height="267"
                  className="w-full max-w-[300px] h-auto object-contain select-none"
                />
              </span>
            </Link>

            <p className="text-[#cdbda9] text-sm leading-relaxed max-w-sm">
              Presented by <strong className="text-[#f1d99a]">Pracharam Media</strong>.<br />
              Creators · Communities · Culture · Influence · Impact.<br />
              South India’s premier creator-first celebration honoring 50 public voting categories and 10 jury awards.
            </p>

            <div className="p-3.5 rounded-xl bg-[#160505] border border-[rgba(216,181,107,0.25)] text-xs text-[#cdbda9] space-y-1">
              <div className="text-[#f1d99a] font-bold">📅 16 November 2026 · Shilpakala Vedika, Hyderabad</div>
              <div className="text-[11px] text-[#a99888]">
                Session 1: 10:00 AM – 2:00 PM (Complimentary Lunch)<br />
                Session 2: 3:00 PM – 7:00 PM (Complimentary Dinner)
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-serif-luxury text-sm font-bold text-[#f1d99a] uppercase tracking-wider mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5 text-xs">
              {[
                { label: 'About the Awards', to: '/about' },
                { label: 'Categories (50 + 10)', to: '/awards' },
                { label: 'Self-Nominate', to: '/nominate' },
                { label: 'Public Voting', to: '/vote' },
                { label: 'Book Tickets', to: 'https://funzippy.com/revent/the-telugu-digital-creator-celebration/cRVAJfAwrS8', external: true },
                { label: 'Brand Partners', to: '/sponsors' },
              ].map((l) => (
                <li key={l.label}>
                  {l.external ? (
                    <a
                      href={l.to}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#a99888] hover:text-[#f1d99a] transition-colors"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link to={l.to} className="text-[#a99888] hover:text-[#f1d99a] transition-colors">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Journey & Media */}
          <div>
            <h4 className="font-serif-luxury text-sm font-bold text-[#f1d99a] uppercase tracking-wider mb-4">
              Journey
            </h4>
            <ul className="space-y-2.5 text-xs">
              {[
                { label: 'Past Events Archive', to: '/past-events' },
                { label: 'Media & Press Room', to: '/media' },
                { label: 'Frequently Asked Questions', to: '/faq' },
                { label: 'Photo Gallery', to: '/gallery' },
                { label: 'Hall of Fame Awardees', to: '/awardees' },
                { label: 'Nominee Campaign Kit', to: '/nominee-kit' },
                { label: 'Contact Us', to: '/contact' },
              ].map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-[#a99888] hover:text-[#f1d99a] transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Governance */}
          <div>
            <h4 className="font-serif-luxury text-sm font-bold text-[#f1d99a] uppercase tracking-wider mb-4">
              Legal
            </h4>
            <ul className="space-y-2.5 text-xs">
              {[
                { label: 'Terms & Conditions', to: '/legal/terms' },
                { label: 'Privacy Policy', to: '/legal/privacy' },
                { label: 'Voting Rules', to: '/legal/voting-rules' },
                { label: 'Ticketing Terms', to: '/legal/ticketing-terms' },
                { label: 'Refund Policy', to: '/legal/refund-policy' },
                { label: 'Nomination Guidelines', to: '/legal/nomination-rules' },
              ].map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-[#a99888] hover:text-[#f1d99a] transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Sub-bar */}
        <div className="border-t border-[rgba(216,181,107,0.15)] mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#a99888]">
          <p>
            © 2026 Pracharam Media. Telugu Icon Digital & Influencer Awards 2026. All rights reserved.
          </p>

          <div className="flex items-center space-x-6">
            <Link to="/contact" className="hover:text-[#f1d99a] transition-colors">Support & Inquiries</Link>
            <Link to="/faq" className="hover:text-[#f1d99a] transition-colors">FAQ</Link>
            <Link to="/admin/login" className="text-[#d8b56b] hover:text-[#f1d99a] transition-colors font-semibold">
              Admin Console 🔒
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}