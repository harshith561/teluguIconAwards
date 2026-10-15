import { useState } from 'react';
import PageTransition from '../components/PageTransition';
import { api } from '../api';

const FAQS = [
  {
    q: 'How can I nominate a creator?',
    a: 'Head to the Nominate page and complete the multi-step self-nomination form. The awards accept self-nominations only — you put your own profile forward in the category that best fits your content.',
  },
  {
    q: 'How do I vote for a nominee?',
    a: 'Visit the Vote page, select an open People\'s Choice category, choose your favourite shortlisted creator, verify with a one-time OTP sent to your 10-digit mobile number, and cast your vote. One verified mobile = one vote per category.',
  },
  {
    q: 'How can I become a sponsor or partner?',
    a: 'We offer Title, Gold, Silver, Bronze, Category and Media partnership tiers. Send us a message through this page or email partnerships@teluguiconawards.in and our team will share the partnership deck and available visibility.',
  },
  {
    q: 'I submitted a nomination — when will I hear back?',
    a: 'The organizing team reviews every nomination. The moment yours is approved, your official nominee page, QR code and campaign kit unlock automatically — check them any time with the mobile number you nominated with.',
  },
  {
    q: 'How can the media get in touch?',
    a: 'For press, media coverage and interview requests, email media@teluguiconawards.in or reach us via this contact form and we\'ll respond within 24–48 hours.',
  },
  {
    q: 'How do I report a technical issue?',
    a: 'Describe the issue in the message form — include the page you were on and any error you saw. Our team investigates and responds within 24–48 hours.',
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [status, setStatus] = useState(null);
  const [open, setOpen] = useState(0);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/contact', form);
      setStatus({ type: 'success', text: res.message || 'Message sent!' });
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (error) {
      setStatus({ type: 'error', text: 'Failed to send message. Please try again.' });
    }
  };

  return (
    <PageTransition>
      <section className="relative py-12 sm:py-20 bg-hero-gradient overflow-hidden px-3 sm:px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,#0a0a0a_100%)]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <p className="section-subtitle">Get in Touch</p>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4">
            <span className="gold-text">Contact</span> <span className="text-white">Us</span>
          </h1>
          <p className="text-white/60 text-xs sm:text-base leading-relaxed">Questions about nominations, voting, or partnerships? We're here to help.</p>
        </div>
      </section>

      <section className="py-10 sm:py-16 bg-ink-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-6 sm:gap-10">
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              <div className="glass-card p-4 sm:p-6">
                <h3 className="font-semibold text-white mb-1">MD Naidu</h3>
                <p className="text-white/40 text-sm">Founder & CEO, Pracharam Media</p>
              </div>
              {[
                { icon: '📧', label: 'General Enquiries', value: 'support@pracharammedia.in / info@teluguiconawards.in' },
                { icon: '📝', label: 'Nominations', value: 'nominations@teluguiconawards.in' },
                { icon: '🤝', label: 'Partnerships', value: 'partnerships@teluguiconawards.in' },
                { icon: '📰', label: 'Media & PR', value: 'media@teluguiconawards.in' },
                { icon: '📞', label: 'Phone', value: '+91 94944 57274 / +91 92664 70997' },
                { icon: '📍', label: 'Venue', value: 'Shilpakala Vedika, Hyderabad' },
                { icon: '⏰', label: 'Response Time', value: 'Within 24-48 hours' },
              ].map((item) => (
                <div key={item.label} className="glass-card p-5 flex items-start space-x-4">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <div className="text-white/40 text-xs uppercase tracking-wider mb-1">{item.label}</div>
                    <div className="text-white/80 text-sm">{item.value}</div>
                  </div>
                </div>
              ))}
              <div className="glass-card p-5">
                <h4 className="text-white font-semibold mb-2">Follow the Awards</h4>
                <div className="flex space-x-3 text-2xl">
                  <span className="cursor-pointer hover:scale-110 transition-transform">📸</span>
                  <span className="cursor-pointer hover:scale-110 transition-transform">▶️</span>
                  <span className="cursor-pointer hover:scale-110 transition-transform">💙</span>
                  <span className="cursor-pointer hover:scale-110 transition-transform">🐦</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="glass-card p-6 sm:p-8">
                <h2 className="font-display text-2xl font-bold text-white mb-6">Send us a message</h2>
                {status && (
                  <div className={`mb-6 px-4 py-3 rounded-xl text-sm ${
                    status.type === 'success'
                      ? 'bg-emerald-900/30 border border-emerald-500/40 text-emerald-200'
                      : 'bg-burgundy-900/50 border border-burgundy-500/40 text-white/80'
                  }`}>
                    {status.text}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-white/60 mb-2">Your Name *</label>
                      <input type="text" name="name" value={form.name} onChange={handleChange} required className="input-field" placeholder="Your name" />
                    </div>
                    <div>
                      <label className="block text-sm text-white/60 mb-2">Your Email *</label>
                      <input type="email" name="email" value={form.email} onChange={handleChange} required className="input-field" placeholder="you@email.com" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-white/60 mb-2">Phone</label>
                      <input type="tel" name="phone" value={form.phone} onChange={handleChange} className="input-field" placeholder="+91" />
                    </div>
                    <div>
                      <label className="block text-sm text-white/60 mb-2">Subject</label>
                      <input type="text" name="subject" value={form.subject} onChange={handleChange} className="input-field" placeholder="How can we help?" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Message *</label>
                    <textarea name="message" value={form.message} onChange={handleChange} required rows={5} className="input-field resize-none" placeholder="Tell us how we can help..." />
                  </div>
                  <button type="submit" className="btn-gold w-full">Send Message</button>
                </form>
              </div>
            </div>
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
    </PageTransition>
  );
}