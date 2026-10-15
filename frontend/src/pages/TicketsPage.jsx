import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import QrBlock from '../components/QrBlock';
import { api } from '../api';

const SESSION_LABELS = {
  1: { label: 'Session 1', time: '10:00 AM – 2:00 PM', food: 'Complimentary Lunch', icon: '🍽️' },
  2: { label: 'Session 2', time: '3:00 PM – 7:00 PM',  food: 'Complimentary Dinner', icon: '🍷' },
};
const TIER_LABELS = { vvip: 'VVIP', mip: 'MIP' };

const AVAIL_CONFIG = {
  available:      { label: 'AVAILABLE',       cls: 'bg-emerald-900/40 text-emerald-300 border-emerald-500/40' },
  filling_fast:   { label: 'FILLING FAST',    cls: 'bg-amber-900/40 text-amber-300 border-amber-500/40' },
  almost_sold_out:{ label: 'ALMOST SOLD OUT', cls: 'bg-orange-900/40 text-orange-300 border-orange-500/40' },
  sold_out:       { label: 'SOLD OUT',         cls: 'bg-red-900/40 text-red-300 border-red-500/40' },
};

const STEPS = ['Select Session', 'Select Ticket', 'Your Details', 'Confirm & Pay', 'Your Ticket'];

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ buyer_name: '', buyer_email: '', buyer_phone: '', quantity: 1 });
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    api.get('/tickets/availability').then((data) => {
      if (Array.isArray(data)) setTickets(data);
    }).catch(() => {});
  }, []);

  const ticketsForSession = (s) => tickets.filter((t) => t.session === s && t.is_active);
  const availTickets = (s) => ticketsForSession(s).filter((t) => t.availability !== 'sold_out');

  const handleBook = async () => {
    setError(null);
    if (!form.buyer_name.trim()) return setError('Full name is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.buyer_email.trim())) return setError('Enter a valid email address.');
    if (!/^[6-9]\d{9}$/.test(form.buyer_phone.replace(/\D/g, ''))) return setError('Enter a valid 10-digit mobile number.');
    if (!policyAccepted) return setError('Please accept the ticket policy to continue.');
    setLoading(true);
    try {
      const res = await api.post('/tickets/book', {
        ticket_id: selectedTicket.id,
        quantity: form.quantity,
        buyer_name: form.buyer_name,
        buyer_email: form.buyer_email,
        buyer_phone: form.buyer_phone,
      });
      if (res.order_code) {
        setOrder(res);
        setStep(4);
      } else {
        setError(res.message || 'Booking failed. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

// Capture the QR as a PNG. The PDF embeds this image rather than re-rendering
  // on the canvas, so the code is always present and crisp at any zoom - and it
// works offline, unlike QrBlock's remote fallback.
const buildQrPng = async () => {
  try {
    const { default: QRCode } = await import('qrcode');
    return await QRCode.toDataURL(order.qr_token, {
      width: 600,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#0a0a0a', light: '#ffffff' },
    });
  } catch (_) {
    return null;
  }
};

// jsPDF's built-in fonts are WinAnsi (Latin-1). Anything outside it (emoji,
// curly quotes, Telugu) throws or renders as black boxes, so transliterate the
// few glyphs the ticket uses and strip anything still unsupported.
const toPdfText = (value) => {
  const map = {
    '·': '-', '–': '-', '—': '-', '’': "'", '‘': "'",
    '“': '"', '”': '"', '₹': 'Rs.', '…': '...', ' ': ' ',
  };
  let out = String(value == null ? '' : value).replace(/[·–—’‘“”₹…\u00a0]/g, (c) => map[c] || '');
  // eslint-disable-next-line no-control-regex
  return out.replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
};

// Builds a real, self-contained .pdf file and downloads it. Text stays vector
// (selectable and searchable) and the QR is embedded as an image, so the file
// prints at any size and needs no network connection to open.
const downloadTicketPdf = async () => {
  if (!order) return;
  setPdfBusy(true);
  try {
    const { jsPDF } = await import('jspdf');
    // compress:true is not optional here - without it jsPDF stores the QR's raw
// pixel buffer and the file balloons from ~8 KB to ~1.9 MB.
const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait', compress: true });
    const s = SESSION_LABELS[order.session] || SESSION_LABELS[1];

    const PAGE_W = doc.internal.pageSize.getWidth();
    const PAGE_H = doc.internal.pageSize.getHeight();
    const M = 12;
    const GOLD = [201, 162, 39];
    const INK = [17, 17, 17];
    const MUTED = [110, 110, 110];

    doc.setFillColor(...GOLD);
    doc.rect(0, 0, PAGE_W, 30, 'F');
    doc.setTextColor(...INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.text('TELUGU ICON', PAGE_W / 2, 14, { align: 'center' });
    doc.setFontSize(9.5);
    doc.text('Digital & Influencer Awards 2026', PAGE_W / 2, 21.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('16 November 2026  |  Shilpakala Vedika, Hyderabad', PAGE_W / 2, 26.5, { align: 'center' });

    // QR, centred, in a white plate with a thin frame.
    const qrPng = await buildQrPng();
    const QR_SIZE = 62;
    const qrX = (PAGE_W - QR_SIZE) / 2;
    const qrY = 38;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.5);
    doc.roundedRect(qrX - 3, qrY - 3, QR_SIZE + 6, QR_SIZE + 6, 2, 2, 'FD');
    if (qrPng) {
      doc.addImage(qrPng, 'PNG', qrX, qrY, QR_SIZE, QR_SIZE);
    } else {
      doc.setDrawColor(180, 180, 180);
      doc.setLineDashPattern([1, 1], 0);
      doc.rect(qrX, qrY, QR_SIZE, QR_SIZE);
      doc.setLineDashPattern([], 0);
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text('QR unavailable', PAGE_W / 2, qrY + QR_SIZE / 2, { align: 'center' });
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    doc.text('SCAN AT ENTRY GATE', PAGE_W / 2, qrY + QR_SIZE + 8, { align: 'center' });
    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(toPdfText(order.qr_token).slice(0, 64), PAGE_W / 2, qrY + QR_SIZE + 12.5, { align: 'center' });

    // Detail rows
    const rows = [
      ['Order ID', toPdfText(order.order_code), 'courier', ...GOLD],
      ['Attendee', toPdfText(order.buyer_name), 'helvetica', ...INK],
      ['Session', toPdfText(`Session ${order.session} - ${s.time}`), 'helvetica', ...INK],
      ['Ticket', toPdfText(`${TIER_LABELS[order.tier] || order.tier}${order.quantity > 1 ? ` (${order.quantity} persons)` : ''}`), 'helvetica', ...INK],
      ['Food', toPdfText(s.food), 'helvetica', ...INK],
      ['Date', '16 November 2026', 'helvetica', ...INK],
      ['Venue', 'Shilpakala Vedika, Hyderabad', 'helvetica', ...INK],
    ];

    let y = qrY + QR_SIZE + 20;
    doc.setDrawColor(226, 226, 226);
    doc.setLineWidth(0.3);
    doc.line(M, y, PAGE_W - M, y);
    y += 6;

    const labelW = 32;
    const valueX = PAGE_W - M;
    for (const [label, value, font, r, g, b] of rows) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text(toPdfText(label), M, y);

      doc.setFont(font, 'bold');
      doc.setFontSize(10);
      doc.setTextColor(r, g, b);
      // Keep the value on one line: jsPDF does not wrap, so trim to the width.
      const max = doc.getTextWidth(value);
      let shown = value;
      const avail = PAGE_W - M * 2 - labelW;
      if (max > avail) {
        while (shown.length > 3 && doc.getTextWidth(`${shown}...`) > avail) shown = shown.slice(0, -1);
        shown = `${shown}...`;
      }
      doc.text(shown, valueX, y, { align: 'right' });

      y += 4;
      doc.setDrawColor(243, 243, 243);
      doc.line(M, y - 2.5, PAGE_W - M, y - 2.5);
      y += 4;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text('Organised by Pracharam Media. Please present this pass at the entry gate.', PAGE_W / 2, PAGE_H - 12, { align: 'center' });
    doc.setTextColor(180, 0, 0);
    doc.text('This pass admits one person per ticket. Re-entry will not be permitted.', PAGE_W / 2, PAGE_H - 7, { align: 'center' });

    doc.save(`${toPdfText(order.order_code) || 'Telugu-Icon-Ticket'}.pdf`);
  } catch {
    setError('Could not generate the PDF. Please use Print Ticket instead.');
  } finally {
    setPdfBusy(false);
  }
};

  return (
    <PageTransition>
      {/* Hero */}
      <section className="relative py-12 sm:py-20 bg-hero-gradient overflow-hidden px-3 sm:px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,#0a0a0a_100%)]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <p className="section-subtitle">16 November 2026 · Shilpakala Vedika, Hyderabad</p>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4">
            <span className="gold-text">Book Your</span> <span className="text-white">Tickets</span>
          </h1>
          <p className="text-white/60 max-w-xl mx-auto text-xs sm:text-base leading-relaxed">
            Two sessions. Premium access. Celebrate the Telugu Icon Digital &amp; Influencer Awards 2026 live.
          </p>
          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center text-[10px] sm:text-xs text-white/50">
            <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5">SESSION 1 · 10:00 AM – 2:00 PM · Complimentary Lunch</span>
            <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5">SESSION 2 · 3:00 PM – 7:00 PM · Complimentary Dinner</span>
          </div>
        </div>
      </section>

      {/* Progress steps */}
      {step < 4 && (
        <div className="bg-ink-900 border-b border-white/5 sticky top-16 lg:top-20 z-10">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {STEPS.slice(0, 4).map((s, i) => (
                <div key={s} className="flex flex-col items-center flex-1 relative">
                  {i > 0 && (
                    <div className={`hidden sm:block absolute top-3 left-[-50%] right-1/2 h-0.5 ${i <= step ? 'bg-champagne-500' : 'bg-white/10'}`} />
                  )}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all z-10 ${
                    i < step ? 'bg-champagne-500 border-champagne-500 text-ink-900' :
                    i === step ? 'border-champagne-500 text-champagne-400 bg-transparent' :
                    'border-white/20 text-white/30 bg-transparent'
                  }`}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className={`hidden sm:block text-[10px] mt-1 ${i === step ? 'text-champagne-400' : 'text-white/30'}`}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <section className="py-8 sm:py-10 bg-ink-900 min-h-[60vh]">
        <div className="max-w-3xl mx-auto px-4">

          {/* STEP 0 — Select Session */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl sm:text-2xl font-bold gold-text mb-4 sm:mb-6">Choose Your Session</h2>
              {[1, 2].map((s) => {
                const info = SESSION_LABELS[s];
                const avail = availTickets(s);
                return (
                  <motion.div
                    key={s}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => { setSelectedSession(s); setSelectedTicket(null); }}
                    className={`glass-card p-4 sm:p-6 cursor-pointer transition-all duration-300 ${
                      selectedSession === s ? 'border-champagne-500/60 bg-champagne-500/5' : 'hover:border-champagne-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-3xl mb-3">{info.icon}</div>
                        <h3 className="font-display text-xl font-bold text-white mb-1">{info.label}</h3>
                        <p className="text-champagne-400 text-sm font-semibold mb-2">{info.time}</p>
                        <p className="text-white/50 text-sm">{info.food} Included</p>
                        <div className="mt-3 flex gap-2 flex-wrap">
                          {ticketsForSession(s).map((t) => {
                            const ac = AVAIL_CONFIG[t.availability];
                            return (
                              <span key={t.id} className={`text-xs px-2 py-0.5 rounded-full border ${ac.cls}`}>
                                {TIER_LABELS[t.tier]} {t.price_display} — {ac.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                        selectedSession === s ? 'border-champagne-500 bg-champagne-500' : 'border-white/30'
                      }`}>
                        {selectedSession === s && <div className="w-2 h-2 rounded-full bg-ink-900" />}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <button
                disabled={!selectedSession}
                onClick={() => setStep(1)}
                className="btn-gold w-full mt-4 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            </div>
          )}

          {/* STEP 1 — Select Ticket */}
          {step === 1 && (
            <div className="space-y-4">
              <button onClick={() => setStep(0)} className="text-white/40 hover:text-white text-sm flex items-center gap-1 mb-4">
                ← Back
              </button>
              <h2 className="font-display text-2xl font-bold gold-text mb-2">
                Session {selectedSession} — Select Ticket Type
              </h2>
              <p className="text-white/50 text-sm mb-6">{SESSION_LABELS[selectedSession].time} · {SESSION_LABELS[selectedSession].food}</p>

              {ticketsForSession(selectedSession).map((t) => {
                const ac = AVAIL_CONFIG[t.availability];
                const isSoldOut = t.availability === 'sold_out';
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <motion.div
                    key={t.id}
                    whileHover={!isSoldOut ? { scale: 1.01 } : {}}
                    onClick={() => !isSoldOut && setSelectedTicket(t)}
                    className={`glass-card p-6 transition-all duration-300 ${
                      isSoldOut ? 'opacity-50 cursor-not-allowed' :
                      isSelected ? 'border-champagne-500/60 bg-champagne-500/5 cursor-pointer' : 'cursor-pointer hover:border-champagne-500/30'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h3 className="font-display text-2xl font-black gold-text">{TIER_LABELS[t.tier]}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${ac.cls}`}>{ac.label}</span>
                        </div>
                        <p className="text-3xl font-display font-bold text-white mb-3">{t.price_display}</p>
                        <ul className="text-white/50 text-sm space-y-1">
                          <li>✓ {TIER_LABELS[t.tier]} Access</li>
                          <li>✓ Session {selectedSession} Entry</li>
                          <li>✓ Digital QR Ticket</li>
                          <li>✓ {SESSION_LABELS[selectedSession].food}</li>
                        </ul>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 shrink-0 mt-1 flex items-center justify-center ${
                        isSelected ? 'border-champagne-500 bg-champagne-500' : 'border-white/30'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-ink-900" />}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <button
                disabled={!selectedTicket}
                onClick={() => setStep(2)}
                className="btn-gold w-full mt-4 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            </div>
          )}

          {/* STEP 2 — Customer Details */}
          {step === 2 && (
            <div>
              <button onClick={() => setStep(1)} className="text-white/40 hover:text-white text-sm flex items-center gap-1 mb-4">← Back</button>
              <h2 className="font-display text-2xl font-bold gold-text mb-6">Your Details</h2>
              <div className="glass-card p-6 space-y-4">
                <div>
                  <label className="block text-white/60 text-xs uppercase tracking-wider mb-2">Full Name *</label>
                  <input
                    className="w-full bg-ink-800 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-champagne-500/60 transition-colors"
                    placeholder="Your full name"
                    value={form.buyer_name}
                    onChange={(e) => setForm({ ...form, buyer_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-white/60 text-xs uppercase tracking-wider mb-2">Mobile Number *</label>
                  <input
                    className="w-full bg-ink-800 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-champagne-500/60 transition-colors"
                    placeholder="10-digit mobile number"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.buyer_phone}
                    onChange={(e) => setForm({ ...form, buyer_phone: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
                <div>
                  <label className="block text-white/60 text-xs uppercase tracking-wider mb-2">Email Address *</label>
                  <input
                    className="w-full bg-ink-800 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-champagne-500/60 transition-colors"
                    placeholder="your@email.com"
                    type="email"
                    value={form.buyer_email}
                    onChange={(e) => setForm({ ...form, buyer_email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-white/60 text-xs uppercase tracking-wider mb-2">Number of Tickets (max 5)</label>
                  <select
                    className="w-full bg-ink-800 border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-champagne-500/60 transition-colors"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                  >
                    {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={() => { setError(null); if (!form.buyer_name.trim() || !form.buyer_phone || !form.buyer_email) { setError('Please fill all required fields.'); return; } setStep(3); }} className="btn-gold w-full mt-4">
                Review Order →
              </button>
              {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
            </div>
          )}

          {/* STEP 3 — Confirm & Policy */}
          {step === 3 && (
            <div>
              <button onClick={() => setStep(2)} className="text-white/40 hover:text-white text-sm flex items-center gap-1 mb-4">← Back</button>
              <h2 className="font-display text-2xl font-bold gold-text mb-6">Order Summary</h2>
              <div className="glass-card p-6 mb-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-white/50">Session</span><span className="text-white font-medium">Session {selectedSession} · {SESSION_LABELS[selectedSession].time}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">Ticket Type</span><span className="text-white font-medium">{TIER_LABELS[selectedTicket?.tier]}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">Quantity</span><span className="text-white font-medium">{form.quantity}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">Food Entitlement</span><span className="text-white font-medium">{SESSION_LABELS[selectedSession].food}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">Name</span><span className="text-white font-medium">{form.buyer_name}</span></div>
                  <div className="h-px bg-white/10 my-2" />
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-white">Total</span>
                    <span className="gold-text">₹{((selectedTicket?.price_paisa / 100) * form.quantity).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Non-Refundable Policy — MUST be shown before payment per spec */}
              <div className="glass-card p-5 mb-4 border-amber-500/30 bg-amber-900/10">
                <h3 className="text-amber-300 font-semibold text-sm mb-2">⚠️ Ticket Policy — Please Read</h3>
                <p className="text-white/60 text-xs leading-relaxed">
                  <strong className="text-white/80">Tickets once booked are non-refundable and non-cancellable</strong>, except where a refund is required due to event cancellation or applicable law.
                  No transfers or cancellations are permitted after booking. In the event of a postponement, tickets remain valid for the rescheduled date.
                  Lost or misplaced tickets must be reported to <a href="mailto:support@pracharammedia.in" className="text-champagne-400">support@pracharammedia.in</a> for reissuance at organizer's discretion.
                </p>
                <label className="flex items-start gap-3 mt-4 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-yellow-400"
                    checked={policyAccepted}
                    onChange={(e) => setPolicyAccepted(e.target.checked)}
                  />
                  <span className="text-white/70 text-xs">
                    I have read and accept the ticket policy. I understand tickets are <strong className="text-white">non-refundable and non-cancellable</strong>.
                  </span>
                </label>
              </div>

              {error && <p className="text-red-400 text-sm mb-3 text-center">{error}</p>}
              <button
                onClick={handleBook}
                disabled={loading || !policyAccepted}
                className="btn-gold w-full disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : `Confirm & Pay ₹${((selectedTicket?.price_paisa / 100) * form.quantity).toLocaleString('en-IN')}`}
              </button>
              <p className="text-white/30 text-xs text-center mt-3">Secured payment · Digital QR ticket delivered instantly</p>
            </div>
          )}

          {/* STEP 4 — Digital Ticket */}
          {step === 4 && order && (
            <div className="text-center">
              <div className="text-6xl mb-4">🎟️</div>
              <h2 className="font-display text-3xl font-bold gold-text mb-2">Booking Confirmed!</h2>
              <p className="text-white/60 mb-8">Your digital QR ticket is ready. Check your email for a copy.</p>
              <div className="glass-card p-6 mb-6 max-w-md mx-auto text-left">
                <div className="text-center mb-5">
                  <h3 className="font-display text-xl font-bold text-white">TELUGU ICON</h3>
                  <p className="text-champagne-400 text-sm">Digital &amp; Influencer Awards 2026</p>
                </div>
                <div className="bg-white rounded-xl p-4 flex items-center justify-center mb-5">
                  {/* Real, locally-generated QR. It encodes the raw qr_token so
                      POST /api/tickets/verify-entry works; linkify is off because
                      a token is not a URL. */}
                  <QrBlock
                    value={order.qr_token}
                    size={200}
                    label="Scan at entry gate"
                    showUrl={false}
                    linkify={false}
                  />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-white/50">Order ID</span><span className="text-champagne-400 font-mono font-bold">{order.order_code}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">Attendee</span><span className="text-white">{order.buyer_name}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">Session</span><span className="text-white">Session {order.session} · {SESSION_LABELS[order.session].time}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">Ticket</span><span className="text-white">{TIER_LABELS[order.tier]}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">Food</span><span className="text-white">{SESSION_LABELS[order.session].food}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">Date</span><span className="text-white">16 November 2026</span></div>
                  <div className="flex justify-between"><span className="text-white/50">Venue</span><span className="text-white">Shilpakala Vedika, Hyderabad</span></div>
                </div>
              </div>
<div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={downloadTicketPdf} disabled={pdfBusy} className="btn-gold disabled:opacity-40 disabled:cursor-not-allowed">
                  {pdfBusy ? 'Generating PDF...' : '📄 Download Ticket (PDF)'}
                </button>
                <button onClick={() => window.print()} className="btn-outline">🖨️ Print Ticket</button>
                <a href={`https://wa.me/?text=${encodeURIComponent(`I'm attending the Telugu Icon Digital & Influencer Awards 2026! Session ${order.session} · ${SESSION_LABELS[order.session].time} · Shilpakala Vedika, Hyderabad. Order: ${order.order_code}`)}`} target="_blank" rel="noopener noreferrer" className="btn-outline">Share on WhatsApp</a>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Ticket Policy Section */}
      <section className="py-16 bg-ink-800/50">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-display text-2xl font-bold text-white mb-6 text-center">Ticket Policy</h2>
          <div className="glass-card p-6 space-y-4 text-sm text-white/60 leading-relaxed">
            <p><strong className="text-white">Refund Policy:</strong> Tickets once booked are non-refundable and non-cancellable, except where a refund is required due to event cancellation or applicable law.</p>
            <p><strong className="text-white">Transfer Policy:</strong> Ticket transfers are not permitted after purchase.</p>
            <p><strong className="text-white">Cancellation Policy:</strong> No cancellations are accepted after successful payment.</p>
            <p><strong className="text-white">Postponement Policy:</strong> In the event of postponement, tickets remain valid for the rescheduled date. No refunds will be issued for postponement.</p>
            <p><strong className="text-white">Event Cancellation:</strong> If the event is cancelled by the organizers, a full refund will be issued to the original payment method.</p>
            <p><strong className="text-white">Lost Ticket:</strong> Report immediately to support@pracharammedia.in with your Order ID. Reissuance is at the organizer's discretion and may require identity verification.</p>
            <p><strong className="text-white">Duplicate Tickets:</strong> Duplicate tickets will be invalidated. Only the first scan of a QR code is valid for entry.</p>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
