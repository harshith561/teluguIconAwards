import { useParams, Link } from 'react-router-dom';
import PageTransition from '../components/PageTransition';

const LEGAL_DOCS = {
  terms: {
    title: 'Terms and Conditions',
    subtitle: 'General platform rules, eligibility, and governance',
    lastUpdated: 'March 1, 2026',
    sections: [
      {
        heading: '1. Introduction and Governance',
        content: `Welcome to Telugu Icon Digital & Influencer Awards 2026 ("Telugu Icon Awards", "TIA", "Platform", "We", "Us"). By accessing, nominating, voting, or purchasing tickets on this platform, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree, please do not use our services.`,
      },
      {
        heading: '2. Award Ceremony Details',
        content: `Telugu Icon Digital & Influencer Awards 2026 is scheduled to be held on 16 November 2026, at Shilpakala Vedika, Hyderabad across two distinct sessions:
• Session 1 (10:00 AM – 2:00 PM): Digital Creators & Emerging Voices (Complimentary Lunch Included)
• Session 2 (3:00 PM – 7:00 PM): Mega Influencers, Celebrity Icons & Grand Finale (Complimentary Dinner Included)
The organizers reserve the right to modify the schedule or session timings if required due to operational exigencies.`,
      },
      {
        heading: '3. Platform Usage and Conduct',
        content: `Users agree not to tamper with the voting system, execute unauthorized scrapers, transmit malicious code, or attempt unauthorized access to platform servers. Any violation will result in permanent IP blacklisting, disqualification of associated nominees, and potential legal action under the Information Technology Act, 2000.`,
      },
      {
        heading: '4. Limitation of Liability',
        content: `Telugu Icon Awards and its organizers, affiliates, and sponsors shall not be liable for any indirect, incidental, or consequential damages resulting from platform downtime, voting discrepancies caused by third-party telecom operators, or event schedule changes resulting from force majeure.`,
      },
      {
        heading: '5. Governing Law and Jurisdiction',
        content: `These terms shall be governed by and construed in accordance with the laws of India. Any disputes arising under or in connection with these terms shall be subject to the exclusive jurisdiction of the courts in Hyderabad, Telangana.`,
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'How we collect, protect, and handle your data',
    lastUpdated: 'March 1, 2026',
    sections: [
      {
        heading: '1. Information We Collect',
        content: `We collect information necessary to operate the platform securely:
• Voters: Mobile number (for OTP verification), IP address, and voter user-agent for fraud prevention.
• Nominees: Full name, creator handle, email, contact number, portfolio links, and photos.
• Ticket Buyers: Name, email, mobile number, session preference, and payment confirmation IDs.`,
      },
      {
        heading: '2. Use of Information',
        content: `Your data is used strictly for:
• Validating and deduplicating votes to maintain 100% integrity.
• Delivering digital tickets with secure QR tokens via SMS/WhatsApp/Email.
• Contacting shortlisted nominees for credentials and badge kits.
We will NEVER sell or lease your personal phone numbers or emails to third-party telemarketers.`,
      },
      {
        heading: '3. Data Security and Encryption',
        content: `All transmissions are encrypted via industry-standard TLS/SSL. Sensitive tokens and phone hashes are salted and secured in cloud databases with restricted access control.`,
      },
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    subtitle: 'Information about session tokens and local device storage',
    lastUpdated: 'March 1, 2026',
    sections: [
      {
        heading: '1. What We Store',
        content: `We use minimal local browser storage (localStorage) to store anonymous device fingerprints and admin session authentication tokens. We do not use third-party behavioral tracking cookies.`,
      },
      {
        heading: '2. Managing Storage',
        content: `You can clear your browser storage or cache at any time through your browser settings. Clearing storage will reset your local vote session cache.`,
      },
    ],
  },
  'nomination-rules': {
    title: 'Nomination Rules & Guidelines',
    subtitle: 'Eligibility criteria, category standards, and jury scrutiny',
    lastUpdated: 'March 1, 2026',
    sections: [
      {
        heading: '1. General Eligibility',
        content: `• Creators, influencers, media entities, or channels actively creating content in the Telugu language across YouTube, Instagram, Facebook, X, or Podcast platforms are eligible.
• Self-nominations and peer nominations are permitted without any nomination fees.
• The applicant must have published original content regularly within the past 12 months.`,
      },
      {
        heading: '2. Screening & Shortlisting',
        content: `All nominations undergo a multi-tier review:
• Stage 1 (Integrity Check): Audit of follower authenticity, copyright compliance, and platform strikes.
• Stage 2 (Editorial Review): Evaluation of storytelling, production quality, and engagement rate.
• Stage 3 (Nominee Announcement): Top nominees are published for public voting and grand jury review.`,
      },
      {
        heading: '3. Code of Conduct',
        content: `Nominees engaging in hate speech, defamatory content, harassment, or bot-driven vote manipulation will be immediately disqualified without appeal.`,
      },
    ],
  },
  'voting-rules': {
    title: 'Voting Rules & Anti-Fraud Policy',
    subtitle: 'Rules for public participation and anti-manipulation enforcement',
    lastUpdated: 'March 1, 2026',
    sections: [
      {
        heading: '1. One-Vote-Per-Category Policy',
        content: `Every voter is entitled to cast exactly ONE vote per award category per verified Indian mobile number. Attempting to vote multiple times in the same category using the same phone number will be rejected.`,
      },
      {
        heading: '2. OTP Verification',
        content: `A 6-digit One-Time Password (OTP) code is verified by our backend security engine to authenticate that each vote is cast by a unique, genuine voter. Votes are only committed once the OTP is successfully validated.`,
      },
      {
        heading: '3. Automated Bot & Farm Detection',
        content: `Our security engine continuously analyzes voting velocity, IP clusters, and device fingerprints. Votes flagged as suspicious (virtual numbers, automated headless browsers, proxy pools) are marked and excluded from final tallying.`,
      },
      {
        heading: '4. Leaderboard Transparency',
        content: `Public leaderboards display verified vote counts. The committee reserves the right to conduct a final forensic audit before declaring official winners.`,
      },
    ],
  },
  'ticketing-terms': {
    title: 'Ticketing Terms & Conditions',
    subtitle: 'Admission rules, session access, and venue protocols',
    lastUpdated: 'March 1, 2026',
    sections: [
      {
        heading: '1. Digital Ticket & Admission',
        content: `• Entry is granted only upon scanning a valid digital QR ticket issued by Telugu Icon Awards.
• Session 1 tickets are valid ONLY from 10:00 AM to 2:00 PM.
• Session 2 tickets are valid ONLY from 3:00 PM to 7:00 PM.
• Re-entry after leaving the venue hall is strictly at the discretion of the security team.`,
      },
      {
        heading: '2. Seating Categories',
        content: `• VVIP Pass: Grants access to reserved VVIP seating blocks + Buffet meal entitlement.
• MIP Pass: Grants access to front-row celebrity zone + red carpet view + Buffet meal entitlement.
Seating within designated zones is on a first-come, first-served basis.`,
      },
      {
        heading: '3. Age Restrictions and Security',
        content: `Children aged 5 and above require an individual ticket. Professional camera equipment (DSLRs/telephoto lenses) without prior press accreditation is prohibited.`,
      },
    ],
  },
  'refund-policy': {
    title: 'Cancellation & Refund Policy',
    subtitle: 'Strict policy regarding ticket purchases and partnership fees',
    lastUpdated: 'March 1, 2026',
    sections: [
      {
        heading: '1. Strict Non-Refundable Policy',
        content: `All ticket sales for Telugu Icon Digital & Influencer Awards 2026 are 100% FINAL and NON-REFUNDABLE under any circumstances. Once an order is processed, no cancellations, refunds, or credit exchanges will be issued.`,
      },
      {
        heading: '2. Ticket Transferability',
        content: `Tickets may be gifted or transferred to another individual provided the attendee presents the valid QR code at the registration gate upon entry.`,
      },
      {
        heading: '3. Event Postponement or Cancellation',
        content: `In the unlikely event of total cancellation due to extreme force majeure (natural disasters, government directives), ticket holders will be offered entry to the rescheduled date. Cash refunds are not guaranteed.`,
      },
    ],
  },
  'sponsorship-terms': {
    title: 'Sponsorship & Partnership Terms',
    subtitle: 'Commercial rights, deliverables, and brand association guidelines',
    lastUpdated: 'March 1, 2026',
    sections: [
      {
        heading: '1. Deliverables & Inclusions',
        content: `Partnership packages (Title, Powered-By, Co-Powered, Category Partner) are governed by the formal sponsorship agreement executed between the brand and the organizing committee. All digital deliverables (logo placements, stage mentions, LED displays) will be executed as detailed in the partnership schedule.`,
      },
      {
        heading: '2. Payment Terms',
        content: `Sponsorship installments must be remitted as per the agreed milestones. Delayed remittances may result in forfeiture of branded collateral inclusion in printed materials.`,
      },
      {
        heading: '3. Exclusivity',
        content: `Category exclusivity is only granted to Title and Powered-By sponsors as explicitly outlined in their written contracts.`,
      },
    ],
  },
  'content-usage': {
    title: 'Content & Media Usage Rights',
    subtitle: 'Broadcast rights, photography, and social media clipping policies',
    lastUpdated: 'March 1, 2026',
    sections: [
      {
        heading: '1. Event Recording Notice',
        content: `By entering the venue on August 30, 2026, all attendees, nominees, and guests grant Telugu Icon Awards the irrevocable right to photograph, film, and broadcast their likeness in official event livestreams, aftermovies, promotional reels, and archival television broadcasts without compensation.`,
      },
      {
        heading: '2. Creator Clipping Guidelines',
        content: `Nominated creators and guests are encouraged to shoot vlogs and reels on smartphones and share on social channels with official hashtags #TeluguIconAwards #TIA2026. Live broadcasting full award presentation segments on personal channels without authorization is prohibited.`,
      },
    ],
  },
  'ip-policy': {
    title: 'Intellectual Property Policy',
    subtitle: 'Protection of trademarks, logos, trophies, and official titles',
    lastUpdated: 'March 1, 2026',
    sections: [
      {
        heading: '1. Trademarks and Brand Assets',
        content: `"Telugu Icon Awards", "Telugu Icon Digital & Influencer Awards", the TIA logo, the distinctive golden trophy design, and all associated visual marks are protected intellectual property.`,
      },
      {
        heading: '2. Authorized Use by Nominees and Winners',
        content: `Official nominees and award winners are granted a revocable, non-exclusive license to use the official "Telugu Icon 2026 Nominee" and "Telugu Icon 2026 Winner" digital badges for promotional purposes. Alteration of badges or misleading claims of partnership without authorization is strictly prohibited.`,
      },
    ],
  },
};

const DOC_LINKS = [
  { slug: 'terms', label: 'Terms & Conditions' },
  { slug: 'privacy', label: 'Privacy Policy' },
  { slug: 'cookies', label: 'Cookie Policy' },
  { slug: 'nomination-rules', label: 'Nomination Rules' },
  { slug: 'voting-rules', label: 'Voting & Anti-Fraud' },
  { slug: 'ticketing-terms', label: 'Ticketing Terms' },
  { slug: 'refund-policy', label: 'Refund Policy' },
  { slug: 'sponsorship-terms', label: 'Sponsorship Terms' },
  { slug: 'content-usage', label: 'Content Usage Rights' },
  { slug: 'ip-policy', label: 'Intellectual Property' },
];

export default function LegalPages() {
  const { slug } = useParams();
  const currentSlug = slug && LEGAL_DOCS[slug] ? slug : 'terms';
  const doc = LEGAL_DOCS[currentSlug];

  return (
    <PageTransition>
      {/* Hero */}
      <section className="relative py-20 bg-hero-gradient overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,#0a0a0a_100%)]" />
        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <p className="section-subtitle">Legal & Regulatory Documentation</p>
          <h1 className="font-display text-3xl md:text-5xl font-bold mb-3 text-white">
            {doc.title}
          </h1>
          <p className="text-white/60 text-sm md:text-base max-w-xl mx-auto">
            {doc.subtitle}
          </p>
          <div className="mt-4 text-xs text-champagne-400 font-medium">
            Effective Date: {doc.lastUpdated}
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <section className="py-14 bg-ink-900 min-h-screen">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <aside className="lg:col-span-1">
              <div className="p-5 rounded-2xl bg-ink-800/80 border border-white/10 sticky top-24">
                <h3 className="text-xs uppercase font-bold tracking-widest text-champagne-400 mb-4 px-2">
                  Legal Documents
                </h3>
                <nav className="space-y-1">
                  {DOC_LINKS.map((item) => (
                    <Link
                      key={item.slug}
                      to={`/legal/${item.slug}`}
                      className={`block px-3 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all ${
                        currentSlug === item.slug
                          ? 'bg-champagne-500/15 text-champagne-400 font-bold border border-champagne-500/30'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>

                <div className="mt-6 pt-4 border-t border-white/5 text-xs text-white/40 px-2">
                  Questions regarding legal policies?
                  <a href="mailto:legal@teluguiconawards.com" className="block text-champagne-400 mt-1 hover:underline">
                    legal@teluguiconawards.com
                  </a>
                </div>
              </div>
            </aside>

            {/* Document Body */}
            <article className="lg:col-span-3 card-gold p-8 md:p-12">
              <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-8">
                <div>
                  <h2 className="text-2xl font-bold font-display text-white">{doc.title}</h2>
                  <div className="text-xs text-white/40 mt-1">Telugu Icon Digital & Influencer Awards 2026</div>
                </div>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium flex items-center gap-1.5 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print / PDF
                </button>
              </div>

              <div className="space-y-8">
                {doc.sections.map((section, idx) => (
                  <div key={idx} className="space-y-3">
                    <h3 className="text-lg font-bold font-display text-champagne-400">
                      {section.heading}
                    </h3>
                    <p className="text-white/70 text-sm md:text-base leading-relaxed whitespace-pre-line">
                      {section.content}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-12 pt-8 border-t border-white/10 text-xs text-white/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span>© 2026 Telugu Icon Awards. All rights reserved.</span>
                <Link to="/" className="text-champagne-400 hover:underline">
                  Return to Home
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
