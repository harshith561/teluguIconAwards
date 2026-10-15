import { useState } from 'react';

export default function DigitalTicket({ order, onDismiss }) {
  const [copied, setCopied] = useState(false);

  if (!order) return null;

  const sessionTime = order.session === 1 ? '10:00 AM – 2:00 PM' : '3:00 PM – 7:00 PM';
  const sessionName = order.session === 1 ? 'Session 1: Digital Creators' : 'Session 2: Icons & Finale';
  const foodText = order.session === 1 ? 'Complimentary Buffet Lunch' : 'Complimentary Gala Dinner';
  const isMIP = String(order.tier).toLowerCase() === 'mip';

  // Generate QR image via public QR API
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    order.qr_token || order.order_code
  )}&color=0A0A0A&bgcolor=FFFFFF`;

  const copyOrderCode = () => {
    navigator.clipboard.writeText(order.order_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative max-w-md mx-auto my-6 bg-ink-950 rounded-3xl border-2 border-champagne-500/50 shadow-2xl overflow-hidden font-sans">
      {/* Ticket Header */}
      <div className={`p-6 text-center relative ${
        isMIP
          ? 'bg-gradient-to-r from-amber-600 via-champagne-500 to-amber-700 text-ink-950'
          : 'bg-gradient-to-r from-burgundy-900 to-ink-900 text-white border-b border-champagne-500/30'
      }`}>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-black/30 text-white/80 hover:text-white flex items-center justify-center text-xs"
          >
            ✕
          </button>
        )}
        <div className="text-[10px] uppercase font-bold tracking-widest opacity-80 mb-1">
          Official Digital Gate Pass
        </div>
        <h3 className="font-display text-xl font-bold tracking-tight">
          TELUGU ICON DIGITAL &amp; INFLUENCER AWARDS 2026
        </h3>
        <div className="text-xs font-semibold mt-1">
          16 November 2026 • Shilpakala Vedika, Hyderabad
        </div>
      </div>

      {/* Ticket Body */}
      <div className="p-6 bg-ink-900 space-y-5">
        {/* Tier & Session Card */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-ink-800 border border-white/10">
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Ticket Tier</div>
            <div className={`text-lg font-bold font-display ${isMIP ? 'text-champagne-400' : 'text-white'}`}>
              {isMIP ? '👑 MIP Pass' : '⭐ VVIP Pass'}
            </div>
            <div className="text-xs text-white/60 mt-0.5">{order.quantity || 1} Person(s)</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Session Timing</div>
            <div className="text-sm font-bold text-white">{sessionTime}</div>
            <div className="text-[11px] text-champagne-400">{sessionName}</div>
          </div>
        </div>

        {/* QR Code Block */}
        <div className="p-5 rounded-2xl bg-white text-ink-900 text-center shadow-inner">
          <div className="w-48 h-48 mx-auto mb-3 bg-white p-2 rounded-xl flex items-center justify-center">
            <img src={qrUrl} alt="Gate QR Token" className="w-full h-full object-contain" />
          </div>
          <div className="text-xs font-bold text-ink-900 tracking-wider">
            SCAN AT GATE REGISTRATION
          </div>
          <div className="text-[10px] text-ink-700 font-mono mt-1">
            Token: {order.qr_token ? `${order.qr_token.slice(0, 16)}...` : order.order_code}
          </div>
        </div>

        {/* Attendee Details */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-ink-800/80 border border-white/5">
            <span className="text-white/40 block text-[10px] uppercase font-bold">Attendee</span>
            <span className="text-white font-semibold truncate block mt-0.5">{order.buyer_name}</span>
          </div>
          <div className="p-3 rounded-xl bg-ink-800/80 border border-white/5">
            <span className="text-white/40 block text-[10px] uppercase font-bold">Order ID</span>
            <span className="text-champagne-400 font-mono font-semibold truncate block mt-0.5">
              {order.order_code}
            </span>
          </div>
        </div>

        {/* Food Entitlement Banner */}
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
          <span className="text-xl">🍽️</span>
          <div>
            <div className="text-xs font-bold text-emerald-400">Meal Entitlement Active</div>
            <div className="text-[11px] text-white/60">{foodText} included at Dining Hall</div>
          </div>
        </div>

        {/* Gate Check-in Status */}
        <div className="flex items-center justify-between text-xs pt-3 border-t border-white/10">
          <span className="text-white/40">Check-in Status:</span>
          <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${
            order.is_checked_in
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          }`}>
            {order.is_checked_in ? '✓ Checked In' : '● Valid for Admission'}
          </span>
        </div>

        {/* Print / Save Actions */}
        <div className="pt-2 flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex-1 py-3 rounded-xl bg-champagne-500 text-ink-900 font-bold text-xs hover:bg-champagne-400 transition-all shadow-gold"
          >
            Save / Print Ticket
          </button>
          <button
            onClick={copyOrderCode}
            className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs border border-white/10 transition-all"
          >
            {copied ? '✓ Copied' : 'Copy ID'}
          </button>
        </div>

        <p className="text-[10px] text-white/30 text-center leading-relaxed">
          Non-refundable & Non-transferable once scanned. Photo ID matching attendee name may be requested at security gates.
        </p>
      </div>
    </div>
  );
}
