import { useEffect, useState } from 'react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { api, getAssetUrl, clearApiCache } from '../../api';
import ImageUploader from '../../components/ImageUploader';
import QrBlock from '../../components/QrBlock';
import { getSiteUrl, downloadQrPng, qrUrl, voteUrl, nomineeUrl, whatsappShareUrl } from '../../lib/nomineeCampaign';
import PosterTemplatesTab from './PosterTemplatesTab';

const TABS = [
  { key: '', label: 'Dashboard', icon: '📊' },
  { key: 'nominations', label: 'Nominations', icon: '📝' },
  { key: 'nominees', label: 'Nominees', icon: '⭐' },
  { key: 'categories', label: 'Categories', icon: '🏷️' },
  { key: 'poster-templates', label: 'Poster Templates & Sponsors', icon: '🎨' },
  { key: 'votes', label: 'Votes & Audit', icon: '🗳️' },
  // { key: 'tickets', label: 'Tickets & Entry', icon: '🎟️' },
  { key: 'past-events', label: 'Past Events & Awardees', icon: '🏛️' },
  { key: 'media', label: 'Media & Gallery', icon: '📸' },
  { key: 'sponsor-leads', label: 'Partner Enquiries', icon: '💼' },
  { key: 'phase', label: 'Event Phase', icon: '⏳' },
  { key: 'audit', label: 'Audit Logs', icon: '🛡️' },
  { key: 'sponsors', label: 'Sponsors', icon: '🤝' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    api.get('/auth/me').then((data) => {
      if (data.user) {
        setUser(data.user);
        setChecking(false);
      } else {
        localStorage.removeItem('admin_token');
        navigate('/admin/login');
      }
    }).catch(() => {
      localStorage.removeItem('admin_token');
      navigate('/admin/login');
    });
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center">
        <div className="text-center text-white/40">
          <div className="w-12 h-12 border-4 border-champagne-500/30 border-t-champagne-500 rounded-full animate-spin mx-auto mb-4" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  const currentTab = TABS.find((t) => location.pathname === `/admin/${t.key}` || (t.key === '' && location.pathname === '/admin')) || TABS[0];

  const handleLogout = async () => {
    try {
      const auditId = localStorage.getItem('admin_audit_id');
      await api.post('/auth/logout', { audit_id: auditId });
    } catch (_) { }
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_audit_id');
    localStorage.removeItem('admin_user');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-ink-900 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-ink-800 border-r border-white/5 flex flex-col z-30 max-md:hidden">
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-champagne-400 to-burgundy-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">TIA</span>
            </div>
            <div>
              <div className="font-display text-champagne-400 font-bold text-sm leading-tight">TELUGU ICON</div>
              <div className="text-white/40 text-[10px] tracking-wider uppercase">Admin Panel</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              to={`/admin/${tab.key}`}
              className={`flex items-center px-4 py-2 rounded-xl text-xs font-medium transition-all duration-300 ${currentTab.key === tab.key
                ? 'bg-champagne-500/15 text-champagne-400 border border-champagne-500/30 font-bold'
                : 'text-white/50 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
            >
              <span className="mr-3 text-base">{tab.icon}</span> {tab.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <div className="text-white text-xs font-medium truncate">{user?.name}</div>
              <div className="text-white/30 text-[10px] truncate">{user?.email}</div>
            </div>
            <button onClick={handleLogout} className="text-white/40 hover:text-burgundy-400 transition-colors shrink-0" title="Logout">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer (100% Responsive Navigation) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-ink-850 border-r border-white/10 flex flex-col h-full z-10 shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-champagne-400 to-burgundy-600 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">TIA</span>
                </div>
                <div>
                  <div className="font-display text-champagne-400 font-bold text-xs">TELUGU ICON</div>
                  <div className="text-white/40 text-[9px] uppercase tracking-wider">Admin Console</div>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {TABS.map((tab) => (
                <Link
                  key={tab.key}
                  to={`/admin/${tab.key}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${currentTab.key === tab.key
                    ? 'bg-champagne-500/20 text-champagne-400 border border-champagne-500/30 font-bold'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <span className="mr-3 text-base">{tab.icon}</span> {tab.label}
                </Link>
              ))}
            </nav>

            <div className="p-4 border-t border-white/10 flex items-center justify-between bg-ink-900">
              <div className="truncate pr-2">
                <div className="text-white text-xs font-medium truncate">{user?.name}</div>
                <div className="text-white/40 text-[10px] truncate">{user?.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg bg-burgundy-900/40 border border-burgundy-500/30 text-burgundy-300 text-xs font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Panel */}
      <main className="flex-1 max-md:ml-0 ml-64 min-w-0">
        <header className="sticky top-0 z-20 bg-ink-900/95 backdrop-blur-xl border-b border-white/5 px-3 sm:px-4 md:px-6 py-3.5 flex items-center justify-between gap-2">
          {/* min-w-0 is required: without it this flex child refuses to shrink
              below its content width, so the `truncate` on the tab name below
              never engages and the header pushes the action buttons off-screen. */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="font-display text-sm sm:text-base md:text-xl font-bold text-white flex items-center min-w-0">
              <span className="shrink-0">{currentTab.icon}</span>
              <span className="gold-text ml-2 truncate">{currentTab.label}</span>
            </h1>
          </div>

          <div className="flex items-center gap-1.5 sm:space-x-2 md:space-x-3 shrink-0">
            <button
              onClick={() => {
                clearApiCache();
                window.location.reload();
              }}
              className="px-2.5 py-1.5 rounded-xl bg-champagne-500/10 hover:bg-champagne-500/20 text-champagne-400 border border-champagne-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Clear cache and re-fetch real-time data from database"
            >
              <span className="text-xs">🔄</span>
              <span className="hidden sm:inline text-xs">Sync Live Data</span>
            </button>
            <a href="/" target="_blank" rel="noopener noreferrer" className="btn-outline !px-2.5 sm:!px-3 !py-1.5 text-xs whitespace-nowrap">
              <span className="hidden sm:inline">View Site</span>
              <span className="sm:hidden">Site</span>
              <span className="hidden sm:inline"> ↗</span>
            </a>
            <button
              onClick={handleLogout}
              className="md:hidden text-white/50 hover:text-burgundy-400 p-2"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </header>

        <div className="p-4 md:p-6">
          <Routes>
            <Route path="" element={<OverviewTab />} />
            <Route path="nominations" element={<NominationsTab />} />
            <Route path="nominees" element={<NomineesTab />} />
            <Route path="categories" element={<CategoriesTab />} />
            <Route path="poster-templates" element={<PosterTemplatesTab />} />
            <Route path="votes" element={<VotesTab />} />
            <Route path="tickets" element={<TicketsTab />} />
            <Route path="past-events" element={<PastEventsTab />} />
            <Route path="media" element={<MediaTab />} />
            <Route path="sponsor-leads" element={<SponsorLeadsTab />} />
            <Route path="phase" element={<PhaseTab />} />
            <Route path="audit" element={<AuditTab />} />
            <Route path="sponsors" element={<SponsorsTab />} />
            <Route path="settings" element={<SettingsTab />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, accent }) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-3xl ${accent || ''}`}>{icon}</span>
      </div>
      <div className="text-3xl font-display font-bold gold-text mb-1">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className="text-white/40 text-sm">{label}</div>
    </div>
  );
}

function OverviewTab() {
  const [stats, setStats] = useState({
    totalNominations: 0,
    pendingNominations: 0,
    approvedNominations: 0,
    verifiedNominations: 0,
    totalVotes: 0,
    flaggedVotes: 0,
    totalNominees: 0,
    totalCategories: 0,
    totalSponsors: 0,
  });
  const [recentVotes, setRecentVotes] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadStats = (force = false) => {
    setLoading(true);
    api.get('/admin/stats', { force })
      .then((data) => {
        if (data && data.stats) setStats(data.stats);
        if (Array.isArray(data?.recentVotes)) setRecentVotes(data.recentVotes);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Live Platform Overview</h1>
          <p className="text-white/40 text-xs mt-1">Real-time statistics connected directly to your live database.</p>
        </div>
        <button
          onClick={() => loadStats(true)}
          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs border border-white/10 flex items-center gap-1.5 transition-all"
          title="Refresh Live Statistics"
        >
          <span>🔄</span> Refresh Stats
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Nominations" value={stats.totalNominations} icon="📝" />
        <StatCard label="Pending Review" value={stats.pendingNominations} icon="⏳" />
        <StatCard label="Shortlisted" value={stats.approvedNominations} icon="✅" />
        <StatCard label="Verified" value={stats.verifiedNominations} icon="✓" />
        <StatCard label="Total Votes" value={stats.totalVotes} icon="🗳️" />
        <StatCard label="Flagged Votes" value={stats.flaggedVotes} icon="🚩" />
        <StatCard label="Total Nominees" value={stats.totalNominees} icon="⭐" />
        <StatCard label="Categories" value={stats.totalCategories} icon="🏷️" />
        <StatCard label="Sponsors" value={stats.totalSponsors} icon="🤝" />
      </div>
      {stats.pendingNominations > 0 && (
        <div className="glass-card p-6 border-burgundy-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="w-2 h-2 bg-burgundy-400 rounded-full animate-pulse mr-3" />
              <span className="text-white/80">{stats.pendingNominations} nominations awaiting review</span>
            </div>
            <Link to="/admin/nominations" className="text-champagne-400 text-sm hover:text-champagne-300">Review now →</Link>
          </div>
        </div>
      )}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-white">Vote Audit Overview</h2>
            <p className="text-white/40 text-xs mt-1">Real-time incoming vote stream and anti-fraud audit.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadStats(true)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs border border-white/10 flex items-center gap-1"
              title="Refresh Live Votes"
            >
              <span>🔄</span> Refresh
            </button>
            <Link to="/admin/votes" className="text-champagne-400 text-xs hover:text-champagne-300 font-semibold underline">
              View All Votes ({stats.totalVotes}) →
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-white/40 text-xs uppercase border-b border-white/5">
                <th className="pb-3 pr-4">Nominee</th>
                <th className="pb-3 pr-4">Voter</th>
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="text-white/70">
              {loading && recentVotes.length === 0 ? (
                <tr className="border-t border-white/5">
                  <td colSpan={4} className="py-6 text-center text-white/40 text-xs animate-pulse">
                    Loading live vote stream...
                  </td>
                </tr>
              ) : recentVotes.length === 0 ? (
                <tr className="border-t border-white/5">
                  <td colSpan={4} className="py-6 text-center text-white/40 text-xs">
                    No votes recorded yet.
                  </td>
                </tr>
              ) : (
                recentVotes.map((v) => (
                  <tr key={v.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 pr-4 text-white font-medium">{v.nominee_name}</td>
                    <td className="py-3 pr-4">
                      <div className="text-white text-xs">{v.voter_name || 'Anonymous'}</div>
                      {v.voter_email && <div className="text-[10px] text-white/40">{v.voter_email}</div>}
                    </td>
                    <td className="py-3 pr-4 text-white/40 text-xs">
                      {new Date(v.created_at).toLocaleString()}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${v.is_flagged ? 'bg-burgundy-900/50 text-burgundy-400 border border-burgundy-500/30' : 'bg-emerald-500/15 text-emerald-400'
                        }`}>
                        {v.is_flagged ? '🚩 Flagged' : '✓ Verified'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function NominationsTab() {
  const [nominations, setNominations] = useState([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [editingNomination, setEditingNomination] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  const load = (force = false) => {
    setLoading(true);
    api.get(`/admin/nominations${filter ? `?status=${filter}` : ''}`, { force })
      .then((data) => {
        if (Array.isArray(data)) setNominations(data);
      })
      .catch((e) => setMessage({ type: 'error', text: e.message }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [filter]);

  const updateStatus = async (id, status) => {
    const res = await api.put(`/admin/nominations/${id}`, { status });
    setMessage({ type: 'success', text: res.message || 'Updated' });
    load(true);
    setTimeout(() => setMessage(null), 3000);
  };

  const confirmShortlist = (n) => {
    setConfirmModal({
      type: 'shortlist',
      title: 'Confirm Nominee Shortlist ✅',
      creator: n.creator_name || n.full_name,
      category: n.category_name,
      warning: '⚠️ Critical Notice: Shortlisting this creator will immediately promote them to an Official Nominee and make them LIVE for public voting on the website.',
      subWarning: 'Please verify all creator details before proceeding. Once voting begins, removing them disrupts public votes.',
      confirmLabel: 'Confirm & Shortlist ✅',
      confirmClass: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40',
      onConfirm: () => updateStatus(n.id, 'shortlisted'),
    });
  };

  const confirmUndo = (n) => {
    setConfirmModal({
      type: 'undo',
      title: 'Warning: Undo Shortlist ↩️',
      creator: n.creator_name || n.full_name,
      category: n.category_name,
      warning: '⚠️ Warning: Are you sure you want to revert this nomination back to "Verified"?',
      subWarning: 'The creator will be unpublished and immediately removed from the live website and public voting.',
      confirmLabel: 'Yes, Revert to Verified',
      confirmClass: 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/40',
      onConfirm: () => updateStatus(n.id, 'verified'),
    });
  };

  const confirmDeleteNomination = (n) => {
    setConfirmModal({
      type: 'delete',
      title: 'Confirm Delete Nomination 🗑️',
      creator: n.creator_name || n.full_name,
      category: n.category_name,
      warning: '⚠️ Warning: Are you sure you want to delete this nomination?',
      subWarning: 'This nomination will be marked as deleted and any associated nominee profile will be immediately removed from public voting.',
      confirmLabel: 'Yes, Delete Nomination 🗑️',
      confirmClass: 'bg-burgundy-600 hover:bg-burgundy-500 text-white shadow-lg shadow-burgundy-900/40',
      onConfirm: async () => {
        const res = await api.delete(`/admin/nominations/${n.id}`);
        setMessage({ type: 'success', text: res.message || 'Nomination deleted' });
        load(true);
        setTimeout(() => setMessage(null), 3000);
      },
    });
  };

  const handleUpdateNomination = async (e) => {
    e.preventDefault();
    if (!editingNomination) return;
    const res = await api.put(`/admin/nominations/${editingNomination.id}`, {
      status: editingNomination.status,
      admin_notes: editingNomination.admin_notes,
    });
    setMessage({ type: 'success', text: res.message || 'Nomination updated' });
    setEditingNomination(null);
    load(true);
    setTimeout(() => setMessage(null), 3000);
  };

  const filteredNominations = nominations.filter((n) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (n.creator_name || '').toLowerCase().includes(s) ||
      (n.full_name || '').toLowerCase().includes(s) ||
      (n.category_name || '').toLowerCase().includes(s) ||
      (n.phone || '').includes(s) ||
      (n.email || '').toLowerCase().includes(s) ||
      (n.city || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: '', label: `All (${nominations.length})` },
            { key: 'pending', label: 'Pending ⏳' },
            { key: 'verified', label: 'Verified ✓' },
            { key: 'shortlisted', label: 'Shortlisted ✅' },
            { key: 'rejected', label: 'Rejected ❌' },
            { key: 'deleted', label: 'Deleted 🗑️' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 ${filter === f.key ? 'bg-champagne-500 text-ink-900 font-bold shadow-sm' : 'bg-ink-800 text-white/60 border border-white/10 hover:border-champagne-500/40'
                }`}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={() => load(true)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs border border-white/10 flex items-center gap-1"
            title="Reload Nominations"
          >
            <span>🔄</span> Refresh
          </button>
        </div>
        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search creator, phone, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field !py-1.5 !text-xs w-full"
          />
        </div>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-emerald-900/30 border border-emerald-500/40 text-emerald-200' : 'bg-burgundy-900/50 border border-burgundy-500/40 text-white/80'
          }`}>
          {message.text}
        </div>
      )}

      {/* Edit Nomination Modal */}
      {editingNomination && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-4 border border-champagne-500/40">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="font-bold text-white text-sm">Edit Nomination: {editingNomination.creator_name || editingNomination.full_name}</h3>
              <button onClick={() => setEditingNomination(null)} className="text-white/60 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleUpdateNomination} className="space-y-3 text-xs">
              <div>
                <label className="block text-white/70 mb-1">Status</label>
                <select
                  value={editingNomination.status}
                  onChange={(e) => setEditingNomination({ ...editingNomination, status: e.target.value })}
                  className="input-field"
                >
                  <option value="pending">Pending ⏳</option>
                  <option value="verified">Verified ✓</option>
                  <option value="shortlisted">Shortlisted ✅ (Promote to Nominee)</option>
                  <option value="rejected">Rejected ❌</option>
                  <option value="deleted">Deleted 🗑️</option>
                </select>
              </div>
              <div>
                <label className="block text-white/70 mb-1">Admin Internal Notes</label>
                <textarea
                  rows={3}
                  value={editingNomination.admin_notes || ''}
                  onChange={(e) => setEditingNomination({ ...editingNomination, admin_notes: e.target.value })}
                  placeholder="Review notes, verification remarks..."
                  className="input-field"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingNomination(null)} className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70">Cancel</button>
                <button type="submit" className="btn-gold !py-1.5 text-xs">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation & Warning Modal for Shortlist, Undo, and Delete */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-4 border border-champagne-500/40 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                {confirmModal.title}
              </h3>
              <button onClick={() => setConfirmModal(null)} className="text-white/60 hover:text-white text-sm p-1">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-white font-semibold text-sm">{confirmModal.creator}</div>
                {confirmModal.category && <div className="text-champagne-400 text-xs mt-0.5">{confirmModal.category}</div>}
              </div>

              <div className={`p-3.5 rounded-xl border space-y-1.5 ${confirmModal.type === 'shortlist'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : confirmModal.type === 'undo'
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                  : 'bg-burgundy-950/50 border-burgundy-500/40 text-red-200'
                }`}>
                <p className="font-semibold text-xs leading-relaxed">{confirmModal.warning}</p>
                {confirmModal.subWarning && (
                  <p className="opacity-80 text-[11px] leading-relaxed">{confirmModal.subWarning}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/70 text-xs font-medium transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${confirmModal.confirmClass}`}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-800/50">
              <tr className="text-white/40 text-xs uppercase">
                <th className="px-4 py-4 text-left">Creator</th>
                <th className="px-4 py-4 text-left">Category</th>
                <th className="px-4 py-4 text-left">Contact</th>
                <th className="px-4 py-4 text-left">ID</th>
                <th className="px-4 py-4 text-left">Status</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && nominations.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-white/40">Loading nominations...</td></tr>
              ) : filteredNominations.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-white/40">No nominations found matching criteria.</td></tr>
              ) : (
                filteredNominations.map((n) => (
                  <tr key={n.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-ink-700 to-burgundy-900 flex items-center justify-center overflow-hidden shrink-0">
                          {n.photo_url ? <img src={n.photo_url} className="w-full h-full object-cover" alt="" /> : <span className="text-xs">🏆</span>}
                        </div>
                        <div>
                          <div className="font-medium text-white">{n.creator_name || n.full_name}</div>
                          <div className="text-white/30 text-xs">{n.city || '—'}{n.state ? `, ${n.state}` : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-white/60">{n.category_name || '—'}</td>
                    <td className="px-4 py-4 text-white/60 text-xs">
                      {n.email || '—'}<br />{n.phone || ''}
                    </td>
                    <td className="px-4 py-4 text-white/40 text-xs">{n.nomination_code || '—'}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${n.status === 'shortlisted' ? 'bg-emerald-500/15 text-emerald-400'
                        : n.status === 'verified' ? 'bg-white/10 text-white/70'
                          : n.status === 'rejected' ? 'bg-burgundy-900/50 text-burgundy-400'
                            : n.status === 'deleted' ? 'bg-red-950/60 text-red-400'
                              : 'bg-champagne-500/15 text-champagne-400'
                        }`}>
                        {n.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right space-x-2 whitespace-nowrap">
                      {(n.status === 'pending' || n.status === 'rejected') && (
                        <>
                          <button onClick={() => updateStatus(n.id, 'verified')} className="text-champagne-400 hover:text-champagne-300 text-xs font-medium">Verify</button>
                          <button onClick={() => updateStatus(n.id, 'rejected')} className="text-burgundy-400 hover:text-burgundy-300 text-xs font-medium">Reject</button>
                        </>
                      )}
                      {n.status === 'verified' && (
                        <>
                          <button onClick={() => confirmShortlist(n)} className="text-emerald-400 hover:text-emerald-300 text-xs font-medium">Shortlist ✅</button>
                          <button onClick={() => updateStatus(n.id, 'rejected')} className="text-burgundy-400 hover:text-burgundy-300 text-xs font-medium">Reject</button>
                        </>
                      )}
                      {n.status === 'deleted' && (
                        <button onClick={() => updateStatus(n.id, 'pending')} className="text-champagne-400 hover:text-champagne-300 text-xs font-medium">Restore ↩️</button>
                      )}
                      {n.status !== 'shortlisted' && (
                        <button onClick={() => setEditingNomination(n)} className="text-champagne-400 hover:text-champagne-300 text-xs font-medium">Edit ✏️</button>
                      )}
                      {n.status !== 'deleted' && (
                        <button onClick={() => confirmDeleteNomination(n)} className="text-burgundy-400 hover:text-burgundy-300 text-xs font-medium">Delete 🗑️</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function NomineesTab() {
  const [nominees, setNominees] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [message, setMessage] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPhotoNominee, setEditingPhotoNominee] = useState(null);
  const [editingNominee, setEditingNominee] = useState(null);
  const [campaignNominee, setCampaignNominee] = useState(null);
  const [confirmDeleteNominee, setConfirmDeleteNominee] = useState(null);
  const [newNominee, setNewNominee] = useState({
    full_name: '',
    category_id: '',
    social_handle: '',
    photo_url: '',
    bio: '',
    featured: false,
  });

  const load = (force = false) => {
    setLoading(true);
    Promise.all([
      api.get('/admin/nominees', { force }).catch(() => []),
      api.get('/categories', { force }).catch(() => []),
    ]).then(([noms, cats]) => {
      if (Array.isArray(noms)) setNominees(noms);
      if (Array.isArray(cats)) setCategories(cats);
    }).catch((e) => setMessage({ type: 'error', text: e.message }))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const toggleFeatured = async (n) => {
    const res = await api.put(`/admin/nominees/${n.id}`, { featured: !n.featured });
    setMessage({ type: 'success', text: res.message || 'Updated' });
    load(true);
    setTimeout(() => setMessage(null), 3000);
  };

  const toggleStatus = async (n) => {
    const nextStatus = n.status === 'approved' ? 'archived' : 'approved';
    const res = await api.put(`/admin/nominees/${n.id}`, { status: nextStatus });
    setMessage({ type: 'success', text: res.message || 'Updated' });
    load(true);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeleteNominee = (n) => {
    setConfirmDeleteNominee(n);
  };

  const performDeleteNominee = async (id) => {
    const res = await api.delete(`/admin/nominees/${id}`);
    setMessage({ type: 'success', text: res.message || 'Nominee deleted' });
    load(true);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleUpdateNominee = async (e) => {
    e.preventDefault();
    if (!editingNominee) return;
    const res = await api.put(`/admin/nominees/${editingNominee.id}`, {
      full_name: editingNominee.full_name,
      category_id: editingNominee.category_id,
      social_handle: editingNominee.social_handle,
      bio: editingNominee.bio,
      achievements: editingNominee.achievements,
      youtube_url: editingNominee.youtube_url,
      instagram_url: editingNominee.instagram_url,
      facebook_url: editingNominee.facebook_url,
      website_url: editingNominee.website_url,
      followers_count: editingNominee.followers_count ? Number(editingNominee.followers_count) : null,
      featured: editingNominee.featured,
      status: editingNominee.status,
      photo_url: editingNominee.photo_url,
      slug: editingNominee.slug,
    });
    setMessage({ type: 'success', text: res.message || 'Nominee updated!' });
    setEditingNominee(null);
    load(true);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCreateNominee = async (e) => {
    e.preventDefault();
    if (!newNominee.full_name || !newNominee.category_id) {
      setMessage({ type: 'error', text: 'Name and category are required' });
      return;
    }
    const res = await api.post('/admin/nominees', newNominee);
    setMessage({ type: 'success', text: res.message || 'Nominee created!' });
    setNewNominee({ full_name: '', category_id: '', social_handle: '', photo_url: '', bio: '', featured: false });
    setShowAddModal(false);
    load(true);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleUpdatePhoto = async (nomineeId, photoUrl) => {
    const res = await api.put(`/admin/nominees/${nomineeId}`, { photo_url: photoUrl });
    setMessage({ type: 'success', text: res.message || 'Photo updated!' });
    setEditingPhotoNominee(null);
    load(true);
    setTimeout(() => setMessage(null), 3000);
  };

  const filteredNominees = (Array.isArray(nominees) ? nominees : []).filter((n) => {
    const s = search.toLowerCase();
    const matchesSearch = !search ||
      (n.full_name || '').toLowerCase().includes(s) ||
      (n.nominee_code || '').toLowerCase().includes(s) ||
      (n.slug || '').toLowerCase().includes(s) ||
      (n.social_handle || '').toLowerCase().includes(s) ||
      (n.category_name || '').toLowerCase().includes(s);
    const matchesCat = !categoryFilter || String(n.category_id) === String(categoryFilter);
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-white">Nominees Directory</h2>
          <p className="text-white/40 text-xs mt-1">Manage active nominees, award categories, and profile photos.</p>
        </div>
        <button
          onClick={() => setShowAddModal(!showAddModal)}
          className="btn-gold !py-2 text-xs"
        >
          {showAddModal ? '✕ Cancel' : '+ Add Nominee'}
        </button>
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search nominee by name, code, or URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field !py-2 !text-xs w-full"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field !py-2 !text-xs"
          >
            <option value="">All Categories ({nominees.length} nominees)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={() => load(true)}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs border border-white/10 flex items-center gap-1"
            title="Reload Nominees"
          >
            <span>🔄</span> Refresh
          </button>
        </div>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm ${message.type === 'error' ? 'bg-red-900/40 border border-red-500/40 text-red-200' : 'bg-emerald-900/30 border border-emerald-500/40 text-emerald-200'}`}>
          {message.text}
        </div>
      )}

      {/* Add Nominee Modal / Inline Form */}
      {showAddModal && (
        <div className="glass-card p-6 border-champagne-500/30">
          <h3 className="text-sm font-bold text-champagne-300 uppercase tracking-wider mb-4">Create New Nominee</h3>
          <form onSubmit={handleCreateNominee} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-white/70 mb-1 font-medium">Full Name *</label>
              <input
                type="text"
                placeholder="Creator / Influencer Name"
                value={newNominee.full_name}
                onChange={(e) => setNewNominee({ ...newNominee, full_name: e.target.value })}
                required
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-white/70 mb-1 font-medium">Category *</label>
              <select
                value={newNominee.category_id}
                onChange={(e) => setNewNominee({ ...newNominee, category_id: e.target.value })}
                required
                className="input-field"
              >
                <option value="">Select Category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white/70 mb-1 font-medium">Social Handle / Channel</label>
              <input
                type="text"
                placeholder="@instagram_handle or YouTube channel"
                value={newNominee.social_handle}
                onChange={(e) => setNewNominee({ ...newNominee, social_handle: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-white/80">
                <input
                  type="checkbox"
                  checked={newNominee.featured}
                  onChange={(e) => setNewNominee({ ...newNominee, featured: e.target.checked })}
                  className="rounded text-champagne-500"
                />
                Mark as Featured Nominee
              </label>
            </div>
            <div className="md:col-span-2">
              <ImageUploader
                label="Nominee Profile Photo (Upload File)"
                value={newNominee.photo_url}
                onChange={(url) => setNewNominee({ ...newNominee, photo_url: url })}
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 text-white/70 text-xs"
              >
                Cancel
              </button>
              <button type="submit" className="btn-gold !py-2 text-xs">
                Save Nominee
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Edit Photo Modal */}
      {editingPhotoNominee && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-4 border border-champagne-500/40">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="font-bold text-white text-sm">Upload Photo for {editingPhotoNominee.full_name}</h3>
              <button onClick={() => setEditingPhotoNominee(null)} className="text-white/60 hover:text-white">✕</button>
            </div>
            <ImageUploader
              label="Choose New Photo"
              value={editingPhotoNominee.photo_url || ''}
              onChange={(url) => {
                if (url) handleUpdatePhoto(editingPhotoNominee.id, url);
              }}
            />
            <div className="text-right">
              <button onClick={() => setEditingPhotoNominee(null)} className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Full Edit Nominee Modal */}
      {editingNominee && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card max-w-lg w-full p-6 space-y-4 border border-champagne-500/40 my-8">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="font-bold text-white text-sm">Edit Nominee: {editingNominee.full_name}</h3>
              <button onClick={() => setEditingNominee(null)} className="text-white/60 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleUpdateNominee} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="block text-white/70 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={editingNominee.full_name}
                  onChange={(e) => setEditingNominee({ ...editingNominee, full_name: e.target.value })}
                  required
                  className="input-field"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-white/70 mb-1">Category *</label>
                <select
                  value={editingNominee.category_id}
                  onChange={(e) => setEditingNominee({ ...editingNominee, category_id: e.target.value })}
                  required
                  className="input-field"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white/70 mb-1">Social Handle</label>
                <input
                  type="text"
                  value={editingNominee.social_handle || ''}
                  onChange={(e) => setEditingNominee({ ...editingNominee, social_handle: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-white/70 mb-1">Followers Count</label>
                <input
                  type="number"
                  value={editingNominee.followers_count || ''}
                  onChange={(e) => setEditingNominee({ ...editingNominee, followers_count: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-white/70 mb-1">Public URL (slug)</label>
                <div className="flex items-center gap-2">
                  <span className="text-white/30 text-xs font-mono shrink-0">{getSiteUrl().replace(/^https?:\/\//, '')}/nominee/</span>
                  <input
                    type="text"
                    value={editingNominee.slug || ''}
                    onChange={(e) => setEditingNominee({ ...editingNominee, slug: e.target.value.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase() })}
                    className="input-field font-mono !text-xs"
                  />
                </div>
                <p className="text-white/30 text-[10px] mt-1">
                  Leave unchanged unless the link is broken. This URL is printed on posters, QR codes and videos —
                  changing it invalidates anything already shared.
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-white/70 mb-1">Short Bio</label>
                <textarea
                  rows={3}
                  value={editingNominee.bio || ''}
                  onChange={(e) => setEditingNominee({ ...editingNominee, bio: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-white/70 mb-1">Achievements</label>
                <textarea
                  rows={3}
                  value={editingNominee.achievements || ''}
                  onChange={(e) => setEditingNominee({ ...editingNominee, achievements: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-white/70 mb-1">Instagram URL</label>
                <input
                  type="url"
                  value={editingNominee.instagram_url || ''}
                  onChange={(e) => setEditingNominee({ ...editingNominee, instagram_url: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-white/70 mb-1">YouTube URL</label>
                <input
                  type="url"
                  value={editingNominee.youtube_url || ''}
                  onChange={(e) => setEditingNominee({ ...editingNominee, youtube_url: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-white/70 mb-1">Facebook URL</label>
                <input
                  type="url"
                  value={editingNominee.facebook_url || ''}
                  onChange={(e) => setEditingNominee({ ...editingNominee, facebook_url: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-white/70 mb-1">Website URL</label>
                <input
                  type="url"
                  value={editingNominee.website_url || ''}
                  onChange={(e) => setEditingNominee({ ...editingNominee, website_url: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-white/80">
                  <input
                    type="checkbox"
                    checked={!!editingNominee.featured}
                    onChange={(e) => setEditingNominee({ ...editingNominee, featured: e.target.checked })}
                    className="rounded text-champagne-500"
                  />
                  Featured Nominee
                </label>
              </div>
              <div>
                <label className="block text-white/70 mb-1">Status</label>
                <select
                  value={editingNominee.status}
                  onChange={(e) => setEditingNominee({ ...editingNominee, status: e.target.value })}
                  className="input-field"
                >
                  <option value="approved">Approved / Active</option>
                  <option value="archived">Archived</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <ImageUploader
                  label="Profile Photo (Upload New or Keep Current)"
                  value={editingNominee.photo_url || ''}
                  onChange={(url) => setEditingNominee({ ...editingNominee, photo_url: url })}
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingNominee(null)} className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70">Cancel</button>
                <button type="submit" className="btn-gold !py-1.5 text-xs">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting Nominee */}
      {confirmDeleteNominee && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-4 border border-burgundy-500/40 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span>🗑️</span> Confirm Delete Nominee
              </h3>
              <button onClick={() => setConfirmDeleteNominee(null)} className="text-white/60 hover:text-white text-sm p-1">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-white font-semibold text-sm">{confirmDeleteNominee.full_name}</div>
                {confirmDeleteNominee.category_name && <div className="text-champagne-400 text-xs mt-0.5">{confirmDeleteNominee.category_name}</div>}
                {confirmDeleteNominee.nominee_code && <div className="text-white/40 text-[10px] mt-0.5">Code: {confirmDeleteNominee.nominee_code}</div>}
              </div>

              <div className="p-3.5 rounded-xl bg-burgundy-950/50 border border-burgundy-500/40 text-red-200 space-y-1.5">
                <p className="font-semibold text-xs leading-relaxed">⚠️ Are you sure you want to delete this official nominee?</p>
                <p className="opacity-80 text-[11px] leading-relaxed">
                  This creator will be immediately removed from the live website and public voting. If linked to a nomination, their status will revert to "Verified".
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setConfirmDeleteNominee(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/70 text-xs font-medium transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  performDeleteNominee(confirmDeleteNominee.id);
                  setConfirmDeleteNominee(null);
                }}
                className="px-4 py-2 rounded-xl bg-burgundy-600 hover:bg-burgundy-500 text-white text-xs font-bold transition-all shadow-lg shadow-burgundy-900/40"
              >
                Yes, Delete Nominee 🗑️
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-800/50">
              <tr className="text-white/40 text-xs uppercase">
                <th className="px-4 py-4 text-left">Nominee</th>
                <th className="px-4 py-4 text-left">Category</th>
                <th className="px-4 py-4 text-left">Code</th>
                <th className="px-4 py-4 text-left">URL / QR</th>
                <th className="px-4 py-4 text-left">Votes</th>
                <th className="px-4 py-4 text-left">Status</th>
                <th className="px-4 py-4 text-left">Voting</th>
                <th className="px-4 py-4 text-left">Campaign</th>
                <th className="px-4 py-4 text-left">Featured</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && nominees.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-white/40">Loading nominees...</td></tr>
              ) : filteredNominees.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-white/40">No nominees found matching search or filter.</td></tr>
              ) : (
                filteredNominees.map((n) => {
                  const nomineeSlug = n.slug || String(n.id);
                  const nomineeRecord = { ...n, slug: nomineeSlug };
                  return (
                    <tr key={n.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-3">
                          <div
                            onClick={() => setEditingPhotoNominee(n)}
                            title="Click to change photo"
                            className="w-10 h-10 rounded-lg bg-gradient-to-br from-ink-700 to-burgundy-900 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:ring-2 hover:ring-champagne-400 transition-all group relative"
                          >
                            {n.photo_url ? (
                              <img src={getAssetUrl(n.photo_url)} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <span className="text-xs">🏆</span>
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold">
                              📷
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-white flex items-center gap-1.5">
                              <span>{n.full_name}</span>
                              <button
                                onClick={() => setEditingPhotoNominee(n)}
                                className="text-[10px] text-champagne-400/80 hover:text-champagne-300 underline font-normal"
                              >
                                (change photo)
                              </button>
                            </div>
                            <div className="text-white/30 text-xs">{n.social_handle || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-white/60 text-xs">{n.category_name || '—'}</td>
                      <td className="px-4 py-4 text-white/40 text-xs font-mono">{n.nominee_code || '—'}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => downloadQrPng(qrUrl(nomineeRecord), `TIA2026-QR-${nomineeSlug}.png`, 1200)}
                            title="Download QR Code (PNG)"
                            className="shrink-0"
                          >
                            <QrBlock value={qrUrl(nomineeRecord)} size={30} label={null} showUrl={false} />
                          </button>
                          <div className="min-w-0">
                            <div className="text-white/40 text-[10px] font-mono truncate max-w-[120px]">/nominee/{nomineeSlug}</div>
                            <button
                              onClick={() => { navigator.clipboard?.writeText(voteUrl(nomineeRecord)); }}
                              className="text-[10px] text-champagne-400/70 hover:text-champagne-300 underline"
                            >
                              Copy vote link
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-white font-medium">{n.vote_count?.toLocaleString()}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${n.status === 'approved' ? 'bg-emerald-500/15 text-emerald-400'
                          : n.status === 'rejected' ? 'bg-burgundy-900/50 text-burgundy-400'
                            : 'bg-champagne-500/15 text-champagne-400'
                          }`}>
                          {n.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${Number(n.voting_open) === 1 ? 'bg-emerald-500/10 text-emerald-300' : 'bg-white/5 text-white/30'
                          }`}>
                          {Number(n.voting_open) === 1 ? 'Open' : 'Closed'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => setCampaignNominee(n)}
                          className="px-2.5 py-1 rounded-lg bg-champagne-500/10 text-champagne-400 text-[10px] font-bold border border-champagne-500/30 hover:bg-champagne-500/20"
                        >
                          🎯 MY CAMPAIGN
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <button onClick={() => toggleFeatured(n)} className={`text-xs font-medium ${n.featured ? 'text-champagne-400' : 'text-white/30 hover:text-white'}`}>
                          {n.featured ? '★ Featured' : '☆ Not Featured'}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-right space-x-2 whitespace-nowrap">
                        <button onClick={() => setEditingNominee(n)} className="text-xs text-champagne-400 hover:text-champagne-300 font-medium">Edit ✏️</button>
                        <button onClick={() => setEditingPhotoNominee(n)} className="text-xs text-champagne-400 hover:text-champagne-300 font-medium">Photo 📷</button>
                        <a href={`/nominee/${nomineeSlug}`} target="_blank" rel="noreferrer" className="text-white/70 hover:text-white text-xs font-medium">View ↗</a>
                        <button onClick={() => toggleStatus(n)} className="text-white/40 hover:text-white text-xs font-medium">{n.status === 'approved' ? 'Archive' : 'Activate'}</button>
                        <button onClick={() => handleDeleteNominee(n)} className="text-burgundy-400 hover:text-burgundy-300 text-xs font-medium">Delete 🗑️</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {campaignNominee && (
        <MyCampaignPanel nominee={campaignNominee} onClose={() => setCampaignNominee(null)} />
      )}
    </div>
  );
}

// Add-on req. 8: the single screen a nominee is handed when their nomination is
// approved - official URL, voting URL, QR, campaign assets and reach.
function MyCampaignPanel({ nominee, onClose }) {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.get(`/admin/nominees/${nominee.id}/campaign`, { force: true })
      .then((res) => {
        if (!cancelled && res && res.nominee) setData(res);
        else if (!cancelled) setError('Campaign analytics are unavailable.');
      })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load campaign data'); });
    return () => { cancelled = true; };
  }, [nominee.id]);

  const record = { ...(data && data.nominee ? data.nominee : nominee), slug: (data && data.nominee && data.nominee.slug) || nominee.slug };
  const officialUrl = nomineeUrl(record);
  const directVoteUrl = voteUrl(record);
  const code = record.nominee_code || 'TIC26';
  const analytics = (data && data.analytics) || {};
  const timeseries = (data && data.timeseries) || [];
  const maxViews = Math.max(1, ...timeseries.map((d) => Number(d.views) || 0));

  const copy = (text, key) => {
    navigator.clipboard?.writeText(text).catch(() => { });
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const stats = [
    { label: 'Page Views', value: analytics.page_views ?? nominee.page_views ?? 0, icon: '👁' },
    { label: 'Voting Clicks', value: analytics.vote_clicks ?? nominee.vote_clicks ?? 0, icon: '🗳️' },
    { label: 'Share Clicks', value: analytics.share_clicks ?? nominee.share_clicks ?? 0, icon: '📣' },
    { label: 'QR Scans', value: analytics.qr_scans ?? nominee.qr_scans ?? 0, icon: '📲' },
    { label: 'Votes Cast', value: analytics.conversions ?? record.vote_count ?? 0, icon: '✅' },
    { label: 'Poster Downloads', value: analytics.poster_downloads ?? 0, icon: '⬇' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="glass-card max-w-3xl w-full p-6 space-y-5 border-champagne-500/40 my-8">
        <div className="flex items-start justify-between pb-3 border-b border-white/10 gap-4">
          <div>
            <h3 className="font-display text-lg font-bold text-white">🎯 MY CAMPAIGN</h3>
            <p className="text-white/50 text-xs mt-1">
              {record.full_name} · {record.category_name} · <span className="font-mono text-champagne-400">{code}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-sm shrink-0">✕ Close</button>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-champagne-900/30 border border-champagne-500/30 text-champagne-200 text-xs">
            {error} <span className="text-white/40">(run migration-nominee-pages.sql)</span>
          </div>
        )}

        {/* Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CampaignLink label="Official Nominee URL" value={officialUrl} copied={copied === 'official'} onCopy={() => copy(officialUrl, 'official')} />
          <CampaignLink label="Direct Voting URL" value={directVoteUrl} copied={copied === 'vote'} onCopy={() => copy(directVoteUrl, 'vote')} />
          <CampaignLink label="Nominee ID" value={code} copied={copied === 'code'} onCopy={() => copy(code, 'code')} />
          <CampaignLink label="Direct Vote Path" value={`/vote/${record.slug || record.id}`} copied={copied === 'short'} onCopy={() => copy(`${getSiteUrl()}/vote/${record.slug || record.id}`, 'short')} />
        </div>

        {/* QR */}
        <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-ink-800/60 border border-white/8">
          <div className="flex flex-col items-center gap-2 shrink-0">
            <QrBlock value={qrUrl(record)} size={150} label="Scan to Vote" showUrl={false} />
          </div>
          <div className="flex-1 text-center sm:text-left space-y-2">
            <h4 className="font-bold text-white text-sm">Unique QR Code</h4>
            <p className="text-white/40 text-xs">
              Encodes this nominee&apos;s direct voting URL (<span className="font-mono">?vote=true&amp;src=qr</span>), so scans
              are counted separately from link taps. Safe to print on posters, stories and print ads.
              Click the code to open the link and verify it before printing.
            </p>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              <button
                onClick={() => downloadQrPng(qrUrl(record), `TIA2026-QR-${record.slug || record.id}.png`, 1200)}
                className="btn-gold !py-2 !px-3 !text-xs"
              >
                ⬇ DOWNLOAD QR
              </button>
              <button
                onClick={() => copy(qrUrl(record), 'qr')}
                className="btn-outline !py-2 !px-3 !text-xs"
              >
                {copied === 'qr' ? '✓ Copied!' : '🔗 Copy QR link'}
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => copy(officialUrl, 'official')} className="btn-outline !py-2 !px-3 !text-xs">
            {copied === 'official' ? '✓ Copied!' : '📋 COPY NOMINEE LINK'}
          </button>
          <button onClick={() => copy(directVoteUrl, 'vote')} className="btn-outline !py-2 !px-3 !text-xs">
            {copied === 'vote' ? '✓ Copied!' : '🗳️ COPY VOTING LINK'}
          </button>
          <button
            onClick={() => downloadQrPng(qrUrl(record), `TIA2026-QR-${record.slug || record.id}.png`, 1200)}
            className="btn-outline !py-2 !px-3 !text-xs"
          >
            ⬇ DOWNLOAD QR
          </button>
          <button
            onClick={() => window.open(whatsappShareUrl(record), '_blank', 'noopener,noreferrer')}
            className="btn-outline !py-2 !px-3 !text-xs"
          >
            📤 SHARE
          </button>
          <a
            href={`/nominee-kit?nominee=${record.slug || record.id}`}
            target="_blank"
            rel="noreferrer"
            className="btn-gold !py-2 !px-3 !text-xs"
          >
            ⬇ DOWNLOAD CAMPAIGN MATERIAL
          </a>
          <Link
            to={`/admin/poster-templates?category=${record.category_id}&nominee=${record.id}`}
            className="btn-outline !py-2 !px-3 !text-xs"
          >
            🎨 PREVIEW &amp; REGENERATE POSTER
          </Link>
          <a
            href={officialUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-outline !py-2 !px-3 !text-xs"
          >
            ↗ Open Nominee Page
          </a>
        </div>

        {/* Analytics */}
        <div>
          <h4 className="font-bold text-white text-sm mb-2">Campaign Reach</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {stats.map((stat) => (
              <div key={stat.label} className="p-3 rounded-xl bg-ink-800/60 border border-white/8">
                <div className="text-lg">{stat.icon}</div>
                <div className="text-xl font-display font-bold text-white">{Number(stat.value || 0).toLocaleString()}</div>
                <div className="text-white/40 text-[10px] uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>

          {timeseries.length > 0 && (
            <div className="mt-3 p-4 rounded-xl bg-ink-800/60 border border-white/8">
              <p className="text-white/40 text-[10px] uppercase tracking-wider mb-3">Last 14 days — page views vs voting clicks</p>
              <div className="flex items-end gap-1 h-24">
                {timeseries.map((day) => {
                  const views = Number(day.views) || 0;
                  const clicks = Number(day.vote_clicks) || 0;
                  return (
                    <div key={day.day} className="flex-1 flex flex-col items-center justify-end gap-0.5" title={`${day.day}: ${views} views, ${clicks} voting clicks`}>
                      <div className="w-full rounded-t bg-champagne-500/70" style={{ height: `${(views / maxViews) * 70}%`, minHeight: views > 0 ? 3 : 0 }} />
                      <div className="w-full rounded-t bg-emerald-500/70" style={{ height: `${(clicks / maxViews) * 70}%`, minHeight: clicks > 0 ? 3 : 0 }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-2 text-[10px] text-white/40">
                <span><span className="inline-block w-2 h-2 bg-champagne-500/70 rounded-sm mr-1" />Page views</span>
                <span><span className="inline-block w-2 h-2 bg-emerald-500/70 rounded-sm mr-1" />Voting clicks</span>
              </div>
            </div>
          )}
          <p className="text-white/25 text-[10px] mt-2">
            Counts are unique visitors (repeat actions by the same device within a short window are not counted twice).
            Vote counts come straight from the votes table. No voter identity is stored here.
          </p>
        </div>
      </div>
    </div>
  );
}

function CampaignLink({ label, value, copied, onCopy }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-ink-800/60 border border-white/8">
      <div className="flex-1 min-w-0">
        <p className="text-white/40 text-[9px] uppercase tracking-wider font-bold mb-0.5">{label}</p>
        <p className="text-white/70 text-[11px] font-mono truncate">{value}</p>
      </div>
      <button
        onClick={onCopy}
        className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-champagne-500/10 text-champagne-400 border border-champagne-500/30 hover:bg-champagne-500/20"
      >
        {copied ? '✓' : 'Copy'}
      </button>
    </div>
  );
}

function CategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [message, setMessage] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCat, setNewCat] = useState({
    name: '',
    slug: '',
    type: 'self_nomination',
    description: '',
    icon: '🏆',
    voting_open: true,
  });

  const load = (force = false) => {
    setLoading(true);
    api.get('/categories', { force })
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch((e) => setMessage({ type: 'error', text: e.message }))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const toggleVoting = async (c) => {
    const res = await api.put(`/categories/${c.id}`, { voting_open: !c.voting_open });
    setMessage({ type: 'success', text: res.message || 'Updated' });
    load(true);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCat.name) return;
    const slug = newCat.slug || newCat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const res = await api.post('/categories', { ...newCat, slug });
    setMessage({ type: 'success', text: res.message || 'Category created!' });
    setNewCat({ name: '', slug: '', type: 'self_nomination', description: '', icon: '🏆', voting_open: true });
    setShowAddModal(false);
    load(true);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    if (!editingCategory) return;
    const res = await api.put(`/categories/${editingCategory.id}`, {
      name: editingCategory.name,
      slug: editingCategory.slug,
      type: editingCategory.type,
      description: editingCategory.description,
      icon: editingCategory.icon,
      voting_open: editingCategory.voting_open,
    });
    setMessage({ type: 'success', text: res.message || 'Category updated!' });
    setEditingCategory(null);
    load(true);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeleteCategory = async (id, name) => {
    if (!window.confirm(`Permanently delete category "${name}"? This cannot be undone.`)) return;
    const res = await api.delete(`/categories/${id}`);
    setMessage({ type: 'success', text: res.message || 'Category deleted' });
    load(true);
    setTimeout(() => setMessage(null), 3000);
  };

  const filteredCategories = (Array.isArray(categories) ? categories : []).filter((c) => {
    const s = search.toLowerCase();
    const matchesSearch = !search ||
      (c.name || '').toLowerCase().includes(s) ||
      (c.slug || '').toLowerCase().includes(s) ||
      (c.description || '').toLowerCase().includes(s);
    const matchesType = !typeFilter || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-white">Categories Management</h2>
          <p className="text-white/40 text-xs mt-1">Manage official award categories, voting status, and jury designations ({filteredCategories.length} showing).</p>
        </div>
        <button
          onClick={() => setShowAddModal(!showAddModal)}
          className="btn-gold !py-2 text-xs"
        >
          {showAddModal ? '✕ Cancel' : '+ Add Category'}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field !py-2 !text-xs w-full"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: '', label: `All (${categories.length})` },
            { key: 'self_nomination', label: "People's Choice 🏆" },
            { key: 'jury', label: 'Jury 👑' }
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTypeFilter(t.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${typeFilter === t.key ? 'bg-champagne-500 text-ink-900 font-bold' : 'bg-ink-800 text-white/60 border border-white/10 hover:border-champagne-500/40'
                }`}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={() => load(true)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs border border-white/10 flex items-center gap-1"
            title="Reload Categories"
          >
            <span>🔄</span> Refresh
          </button>
        </div>
      </div>

      {message && (
        <div className="px-4 py-3 rounded-xl text-sm bg-emerald-900/30 border border-emerald-500/40 text-emerald-200">{message.text}</div>
      )}

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="glass-card p-6 border border-champagne-500/30">
          <h3 className="text-sm font-bold text-champagne-300 uppercase tracking-wider mb-4">Create New Award Category</h3>
          <form onSubmit={handleCreateCategory} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-white/70 mb-1">Category Name *</label>
              <input
                type="text"
                placeholder="e.g. Best Comedy Creator"
                value={newCat.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewCat({
                    ...newCat,
                    name: val,
                    slug: val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                  });
                }}
                required
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-white/70 mb-1">URL Slug</label>
              <input
                type="text"
                value={newCat.slug}
                onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })}
                className="input-field font-mono"
              />
            </div>
            <div>
              <label className="block text-white/70 mb-1">Type</label>
              <select
                value={newCat.type}
                onChange={(e) => setNewCat({ ...newCat, type: e.target.value })}
                className="input-field"
              >
                <option value="self_nomination">Self-Nomination / People's Choice 🏆</option>
                <option value="jury">Curated / Jury Evaluated 👑</option>
              </select>
            </div>
            <div>
              <label className="block text-white/70 mb-1">Icon / Emoji</label>
              <input
                type="text"
                value={newCat.icon}
                onChange={(e) => setNewCat({ ...newCat, icon: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-white/70 mb-1">Description / Eligibility Criteria</label>
              <textarea
                rows={2}
                value={newCat.description}
                onChange={(e) => setNewCat({ ...newCat, description: e.target.value })}
                placeholder="Criteria for creators in this category..."
                className="input-field"
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/70">Cancel</button>
              <button type="submit" className="btn-gold !py-1.5 text-xs">Create Category</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-6 space-y-4 border border-champagne-500/40">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="font-bold text-white text-sm">Edit Category: {editingCategory.name}</h3>
              <button onClick={() => setEditingCategory(null)} className="text-white/60 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleUpdateCategory} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="block text-white/70 mb-1">Category Name *</label>
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-white/70 mb-1">Type</label>
                <select
                  value={editingCategory.type}
                  onChange={(e) => setEditingCategory({ ...editingCategory, type: e.target.value })}
                  className="input-field"
                >
                  <option value="self_nomination">Self-Nomination / People's Choice 🏆</option>
                  <option value="jury">Curated / Jury Evaluated 👑</option>
                </select>
              </div>
              <div>
                <label className="block text-white/70 mb-1">Icon / Emoji</label>
                <input
                  type="text"
                  value={editingCategory.icon || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-white/70 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingCategory.description || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingCategory(null)} className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70">Cancel</button>
                <button type="submit" className="btn-gold !py-1.5 text-xs">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading && categories.length === 0 ? (
        <div className="text-center py-16 text-white/40">Loading categories...</div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-12 text-white/40 text-sm">No categories match your search or filter.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((c) => (
            <div key={c.id} className={`glass-card p-5 transition-all duration-300 flex flex-col justify-between ${c.voting_open ? '' : 'opacity-70'}`}>
              <div>
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{c.icon || (c.type === 'jury' ? '👑' : '🏆')}</span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-white/10 text-white/50">{c.type === 'jury' ? 'Jury' : "People's Choice"}</span>
                </div>
                <h3 className="font-semibold text-white mb-1">{c.name}</h3>
                {c.description && (
                  <p className="text-white/40 text-xs line-clamp-2 mt-1">{c.description}</p>
                )}
              </div>
              <div className="pt-4 border-t border-white/5 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-medium ${c.voting_open ? 'text-emerald-400' : 'text-white/40'}`}>
                    {c.voting_open ? '● Voting Open' : '○ Voting Closed'}
                  </span>
                  <button
                    onClick={() => toggleVoting(c)}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${c.voting_open ? 'bg-emerald-500' : 'bg-ink-700 border border-white/20'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 ${c.voting_open ? 'left-[22px] bg-white' : 'left-0.5 bg-white/60'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-end gap-2 text-xs">
                  <Link to={`/admin/poster-templates?category=${c.id}`} className="text-champagne-400 hover:text-champagne-300 font-medium">🎨 Poster &amp; Sponsors</Link>
                  <button onClick={() => setEditingCategory(c)} className="text-champagne-400 hover:text-champagne-300 font-medium ml-2">Edit ✏️</button>
                  <button onClick={() => handleDeleteCategory(c.id, c.name)} className="text-burgundy-400 hover:text-burgundy-300 font-medium ml-2">Delete 🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VotesTab() {
  const [votes, setVotes] = useState([]);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const load = (force = false) => {
    setLoading(true);
    api.get(`/admin/votes${flaggedOnly ? '?flagged=1' : ''}`, { force })
      .then((data) => {
        if (Array.isArray(data)) setVotes(data);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [flaggedOnly]);

  const toggleFlag = async (v) => {
    await api.put(`/admin/votes/${v.id}/flag`, { is_flagged: !v.is_flagged, flag_reason: v.is_flagged ? null : 'Manual review' });
    load(true);
  };

  const handleDeleteVote = async (id, nomineeName) => {
    if (!window.confirm(`Permanently delete this vote for ${nomineeName}? The nominee vote count will be decremented.`)) return;
    await api.delete(`/admin/votes/${id}`);
    load(true);
  };

  const filteredVotes = (Array.isArray(votes) ? votes : []).filter((v) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (v.nominee_name || '').toLowerCase().includes(s) ||
      (v.voter_name || '').toLowerCase().includes(s) ||
      (v.voter_phone || '').includes(s) ||
      (v.voter_email || '').toLowerCase().includes(s) ||
      (v.ip_address || '').includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFlaggedOnly(false)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 ${!flaggedOnly ? 'bg-champagne-500 text-ink-900 font-bold' : 'bg-ink-800 text-white/60 border border-white/10'}`}
          >
            All Votes ({votes.length})
          </button>
          <button
            onClick={() => setFlaggedOnly(true)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 ${flaggedOnly ? 'bg-burgundy-800 text-white border border-burgundy-600 font-bold' : 'bg-ink-800 text-white/60 border border-white/10'}`}
          >
            🚩 Flagged Only
          </button>
          <button
            onClick={() => load(true)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs border border-white/10 flex items-center gap-1"
            title="Reload Votes"
          >
            <span>🔄</span> Refresh
          </button>
        </div>
        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search voter, mobile, IP, nominee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field !py-1.5 !text-xs w-full"
          />
        </div>
      </div>
      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-800/50">
              <tr className="text-white/40 text-xs uppercase">
                <th className="px-4 py-4 text-left">Nominee</th>
                <th className="px-4 py-4 text-left">Voter</th>
                <th className="px-4 py-4 text-left">Mobile</th>
                <th className="px-4 py-4 text-left">OTP</th>
                <th className="px-4 py-4 text-left">Date</th>
                <th className="px-4 py-4 text-left">IP</th>
                <th className="px-4 py-4 text-left">Flag</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && votes.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-white/40">Loading live vote stream...</td></tr>
              ) : filteredVotes.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-white/40">No votes {flaggedOnly ? 'flagged' : 'recorded'} matching search.</td></tr>
              ) : (
                filteredVotes.map((v) => (
                  <tr key={v.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-4 text-white font-medium">{v.nominee_name}</td>
                    <td className="px-4 py-4 text-white/60 text-xs">
                      {v.voter_name || 'Anonymous'}<br />{v.voter_email || ''}
                    </td>
                    <td className="px-4 py-4 text-white/60 text-xs">{v.voter_phone || '—'}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${v.otp_verified ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-white/40'}`}>
                        {v.otp_verified ? 'Verified' : 'None'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-white/40 text-xs">{new Date(v.created_at).toLocaleString()}</td>
                    <td className="px-4 py-4 text-white/40 text-xs">{v.ip_address || '—'}</td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleFlag(v)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${v.is_flagged ? 'bg-burgundy-900/50 text-burgundy-400 border border-burgundy-600' : 'bg-white/5 text-white/40 border border-white/10 hover:text-white'
                          }`}
                      >
                        {v.is_flagged ? `🚩 ${v.flag_reason || 'Flagged'}` : 'Flag'}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => handleDeleteVote(v.id, v.nominee_name)}
                        className="text-burgundy-400 hover:text-burgundy-300 text-xs font-medium"
                      >
                        Delete 🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SponsorsTab() {
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', tier: 'gold', website_url: '', tagline: '', logo_url: '' });
  const [editingSponsor, setEditingSponsor] = useState(null);
  const [message, setMessage] = useState(null);

  const load = (force = false) => {
    setLoading(true);
    api.get('/admin/sponsors', { force })
      .then((data) => {
        if (Array.isArray(data)) setSponsors(data);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const createSponsor = async (e) => {
    e.preventDefault();
    const res = await api.post('/admin/sponsors', form);
    setMessage({ type: 'success', text: res.message || 'Sponsor created' });
    setForm({ name: '', tier: 'gold', website_url: '', tagline: '', logo_url: '' });
    load();
    setTimeout(() => setMessage(null), 3000);
  };

  const updateSponsor = async (e) => {
    e.preventDefault();
    if (!editingSponsor) return;
    const res = await api.put(`/admin/sponsors/${editingSponsor.id}`, editingSponsor);
    setMessage({ type: 'success', text: res.message || 'Sponsor updated' });
    setEditingSponsor(null);
    load();
    setTimeout(() => setMessage(null), 3000);
  };

  const deleteSponsor = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sponsor?')) return;
    const res = await api.delete(`/admin/sponsors/${id}`);
    setMessage({ type: 'success', text: res.message || 'Sponsor deleted' });
    load();
    setTimeout(() => setMessage(null), 3000);
  };

  const toggleActive = async (s) => {
    await api.put(`/admin/sponsors/${s.id}`, { is_active: !s.is_active });
    load();
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className="px-4 py-3 rounded-xl text-sm bg-emerald-900/30 border border-emerald-500/40 text-emerald-200">{message.text}</div>
      )}

      {/* Edit Sponsor Modal */}
      {editingSponsor && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-6 space-y-4 border border-champagne-500/40">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="font-bold text-white text-sm">Edit Sponsor: {editingSponsor.name}</h3>
              <button onClick={() => setEditingSponsor(null)} className="text-white/60 hover:text-white">✕</button>
            </div>
            <form onSubmit={updateSponsor} className="space-y-3 text-xs">
              <div>
                <label className="block text-white/70 mb-1">Brand Name *</label>
                <input
                  type="text"
                  value={editingSponsor.name}
                  onChange={(e) => setEditingSponsor({ ...editingSponsor, name: e.target.value })}
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-white/70 mb-1">Partnership Tier</label>
                <select
                  value={editingSponsor.tier}
                  onChange={(e) => setEditingSponsor({ ...editingSponsor, tier: e.target.value })}
                  className="input-field"
                >
                  {['title_partner', 'powered_by', 'co_powered_by', 'gold', 'silver', 'category_partner', 'media_partner', 'digital_partner', 'travel_partner'].map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white/70 mb-1">Website URL</label>
                <input
                  type="url"
                  value={editingSponsor.website_url || ''}
                  onChange={(e) => setEditingSponsor({ ...editingSponsor, website_url: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-white/70 mb-1">Tagline</label>
                <input
                  type="text"
                  value={editingSponsor.tagline || ''}
                  onChange={(e) => setEditingSponsor({ ...editingSponsor, tagline: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <ImageUploader
                  label="Brand Logo (Upload File)"
                  value={editingSponsor.logo_url || ''}
                  onChange={(url) => setEditingSponsor({ ...editingSponsor, logo_url: url })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingSponsor(null)} className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70">Cancel</button>
                <button type="submit" className="btn-gold !py-1.5 text-xs">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-white">Add Official Brand Partner</h2>
          <button
            type="button"
            onClick={() => load(true)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs border border-white/10 flex items-center gap-1"
            title="Reload Sponsors"
          >
            <span>🔄</span> Refresh
          </button>
        </div>
        <form onSubmit={createSponsor} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sponsor Brand Name *" className="input-field" required />
            <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })} className="input-field">
              {['title_partner', 'powered_by', 'co_powered_by', 'gold', 'silver', 'category_partner', 'media_partner', 'digital_partner', 'travel_partner'].map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <input type="url" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} placeholder="Website URL (optional)" className="input-field" />
            <input type="text" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Tagline (optional)" className="input-field" />
          </div>

          <div>
            <ImageUploader
              label="Brand Partner Logo (Upload File)"
              value={form.logo_url}
              onChange={(url) => setForm({ ...form, logo_url: url })}
            />
          </div>

          <div className="text-right">
            <button type="submit" className="btn-gold !py-2.5 text-xs">+ Save Sponsor</button>
          </div>
        </form>
      </div>
      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-800/50">
              <tr className="text-white/40 text-xs uppercase">
                <th className="px-4 py-4 text-left">Brand</th>
                <th className="px-4 py-4 text-left">Tier</th>
                <th className="px-4 py-4 text-left">Website</th>
                <th className="px-4 py-4 text-left">Active</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && sponsors.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-white/40">Loading official partners...</td></tr>
              ) : sponsors.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-white/40">No sponsors yet. Use form above to add partners.</td></tr>
              ) : (
                sponsors.map((s) => (
                  <tr key={s.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-4 text-white font-medium">
                      <div className="flex items-center gap-3">
                        {s.logo_url ? (
                          <div className="w-10 h-10 rounded-lg bg-white/5 p-1 border border-white/10 flex items-center justify-center shrink-0">
                            <img src={getAssetUrl(s.logo_url)} className="max-w-full max-h-full object-contain" alt="" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs text-white/40 shrink-0">
                            🤝
                          </div>
                        )}
                        <div>
                          <div>{s.name}</div>
                          {s.tagline && <div className="text-[10px] text-white/40">{s.tagline}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2.5 py-1 rounded-full bg-champagne-500/15 text-champagne-400 text-xs">{s.tier.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-4 text-white/40 text-xs">{s.website_url || '—'}</td>
                    <td className="px-4 py-4">
                      <button onClick={() => toggleActive(s)} className={`text-xs font-medium ${s.is_active ? 'text-emerald-400' : 'text-white/30'}`}>
                        {s.is_active ? '● Active' : '○ Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-right space-x-2">
                      <button onClick={() => setEditingSponsor(s)} className="text-champagne-400 hover:text-champagne-300 text-xs font-medium">Edit ✏️</button>
                      <button onClick={() => deleteSponsor(s.id)} className="text-burgundy-400 hover:text-burgundy-300 text-xs font-medium">Delete 🗑️</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const [settings, setSettings] = useState({});
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api.get('/settings').then((data) => {
      if (Array.isArray(data)) {
        const obj = {};
        data.forEach((s) => { obj[s.setting_key] = s.setting_value; });
        setSettings(obj);
      }
    }).catch(() => { });
  }, []);

  const save = async () => {
    const toSave = {
      event_name: settings.event_name,
      event_tagline: settings.event_tagline,
      event_date: settings.event_date,
      event_venue: settings.event_venue,
      hero_headline: settings.hero_headline,
      hero_subheadline: settings.hero_subheadline,
      announcement: settings.announcement,
      contact_email: settings.contact_email,
      contact_phone: settings.contact_phone,
      contact_address: settings.contact_address,
    };
    const res = await api.put('/admin/settings', toSave);
    setMessage({ type: 'success', text: res.message || 'Settings saved' });
    setTimeout(() => setMessage(null), 3000);
  };

  const update = (key, value) => setSettings({ ...settings, [key]: value });

  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState(null);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdMsg(null);

    if (!pwdCurrent || !pwdNew || !pwdConfirm) {
      setPwdMsg({ type: 'error', text: 'All password fields are required.' });
      return;
    }
    if (pwdNew.length < 6) {
      setPwdMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setPwdMsg({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setPwdLoading(true);
    try {
      const res = await api.put('/auth/change-password', {
        currentPassword: pwdCurrent,
        newPassword: pwdNew,
      });

      if (res.ok !== false && !res.message?.includes('incorrect')) {
        setPwdMsg({ type: 'success', text: res.message || 'Password changed successfully!' });
        setPwdCurrent('');
        setPwdNew('');
        setPwdConfirm('');
      } else {
        setPwdMsg({ type: 'error', text: res.message || 'Failed to change password.' });
      }
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className="px-4 py-3 rounded-xl text-sm bg-emerald-900/30 border border-emerald-500/40 text-emerald-200">{message.text}</div>
      )}
      <div className="glass-card p-6">
        <h2 className="font-display text-xl font-bold text-white mb-6">Site Content Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/60 mb-2">Event Name</label>
            <input type="text" value={settings.event_name || ''} onChange={(e) => update('event_name', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-2">Event Tagline</label>
            <input type="text" value={settings.event_tagline || ''} onChange={(e) => update('event_tagline', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-2">Event Date & Time</label>
            <input type="text" value={settings.event_date || ''} onChange={(e) => update('event_date', e.target.value)} className="input-field" placeholder="2026-12-10 18:00:00" />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-2">Event Venue</label>
            <input type="text" value={settings.event_venue || ''} onChange={(e) => update('event_venue', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-2">Hero Headline</label>
            <input type="text" value={settings.hero_headline || ''} onChange={(e) => update('hero_headline', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-2">Hero Sub-headline</label>
            <input type="text" value={settings.hero_subheadline || ''} onChange={(e) => update('hero_subheadline', e.target.value)} className="input-field" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-white/60 mb-2">Announcement Bar</label>
            <input type="text" value={settings.announcement || ''} onChange={(e) => update('announcement', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-2">Contact Email</label>
            <input type="text" value={settings.contact_email || ''} onChange={(e) => update('contact_email', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-2">Contact Phone</label>
            <input type="text" value={settings.contact_phone || ''} onChange={(e) => update('contact_phone', e.target.value)} className="input-field" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-white/60 mb-2">Contact Address</label>
            <input type="text" value={settings.contact_address || ''} onChange={(e) => update('contact_address', e.target.value)} className="input-field" />
          </div>
        </div>
        <button onClick={save} className="btn-gold mt-6">Save All Settings</button>
      </div>

      {/* Admin Password & Security */}
      <div className="glass-card p-6">
        <div className="flex items-center space-x-3 mb-2">
          <span className="text-xl">🔐</span>
          <h2 className="font-display text-xl font-bold text-white">Admin Password & Security</h2>
        </div>
        <p className="text-white/40 text-xs mb-6">
          Update the login password for your administrator account.
        </p>

        {pwdMsg && (
          <div
            className={`px-4 py-3 rounded-xl text-sm mb-5 border ${pwdMsg.type === 'error'
              ? 'bg-red-900/30 border-red-500/40 text-red-200'
              : 'bg-emerald-900/30 border-emerald-500/40 text-emerald-200'
              }`}
          >
            {pwdMsg.text}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm text-white/60 mb-2">Current Password</label>
            <input
              type="password"
              value={pwdCurrent}
              onChange={(e) => setPwdCurrent(e.target.value)}
              placeholder="Enter current password"
              className="input-field"
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-2">New Password (minimum 6 characters)</label>
            <input
              type="password"
              value={pwdNew}
              onChange={(e) => setPwdNew(e.target.value)}
              placeholder="Enter new strong password"
              className="input-field"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-2">Confirm New Password</label>
            <input
              type="password"
              value={pwdConfirm}
              onChange={(e) => setPwdConfirm(e.target.value)}
              placeholder="Re-enter new password"
              className="input-field"
              autoComplete="new-password"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={pwdLoading}
              className="btn-gold !py-2.5 px-6 disabled:opacity-50 flex items-center space-x-2"
            >
              {pwdLoading ? <span>Updating...</span> : <span>Update Password</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========== TICKETS & CHECK-IN TAB ==========
function TicketsTab() {
  const [data, setData] = useState({ configs: [], orders: [], stats: {} });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSession, setFilterSession] = useState('');
  const [message, setMessage] = useState(null);

  const load = (force = false) => {
    setLoading(true);
    api.get('/admin/tickets', { force })
      .then((res) => { if (res && res.orders) setData(res); })
      .catch((err) => setMessage({ type: 'error', text: err.message }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleCheckIn = async (order) => {
    const nextState = !order.is_checked_in;
    const res = await api.put(`/admin/tickets/${order.id}/check-in`, { is_checked_in: nextState });
    setMessage({ type: 'success', text: res.message || 'Check-in status updated' });
    load();
    setTimeout(() => setMessage(null), 3000);
  };

  const updateConfig = async (id, availability) => {
    const res = await api.put(`/admin/tickets/config/${id}`, { availability });
    setMessage({ type: 'success', text: res.message || 'Availability updated' });
    load();
    setTimeout(() => setMessage(null), 3000);
  };

  const filteredOrders = (data.orders || []).filter((o) => {
    const matchesSession = !filterSession || String(o.session) === filterSession;
    const matchesSearch = !search ||
      (o.buyer_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.buyer_phone || '').includes(search) ||
      (o.order_code || '').toLowerCase().includes(search.toLowerCase());
    return matchesSession && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm border ${message.type === 'error' ? 'bg-red-900/30 border-red-500/40 text-red-200' : 'bg-emerald-900/30 border-emerald-500/40 text-emerald-200'}`}>
          {message.text}
        </div>
      )}

      {/* Ticket Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Paid Orders" value={data.stats?.total_orders || 0} icon="🎟️" />
        <StatCard label="Total Attendees" value={data.stats?.total_attendees || 0} icon="👥" />
        <StatCard
          label="Total Revenue"
          value={`₹${Math.round((Number(data.stats?.total_revenue_paisa) || 0) / 100).toLocaleString('en-IN')}`}
          icon="💰"
        />
        <StatCard label="Gate Checked In" value={data.stats?.total_checked_in || 0} icon="✅" />
      </div>

      {/* Ticket Tier Management */}
      <div className="glass-card p-6">
        <h2 className="font-display text-lg font-bold text-white mb-4 flex items-center justify-between">
          <span>Session & Tier Availability Control</span>
          <span className="text-xs text-white/40 font-normal">Controls public status display without exposing counts</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(data.configs || []).map((cfg) => (
            <div key={cfg.id} className="p-4 rounded-2xl bg-ink-900/70 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-champagne-400">
                  Session {cfg.session} • {cfg.tier?.toUpperCase()}
                </span>
                <span className="text-xs font-bold text-white">₹{cfg.price_paisa / 100}</span>
              </div>
              <div className="text-xs text-white/60">
                Sold: <strong className="text-white">{cfg.sold}</strong> / Cap: {cfg.inventory || 'Open'}
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-white/40 mb-1">Status</label>
                <select
                  value={cfg.availability}
                  onChange={(e) => updateConfig(cfg.id, e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-ink-800 border border-white/10 text-white text-xs"
                >
                  <option value="available">Available</option>
                  <option value="filling_fast">Filling Fast</option>
                  <option value="almost_sold_out">Almost Sold Out</option>
                  <option value="sold_out">Sold Out</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Orders & Gate Check-in Table */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Attendee Orders & Check-In</h2>
            <p className="text-white/40 text-xs mt-1">Live entry validation for Hitex gate staff.</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, order code..."
              className="px-3.5 py-2 rounded-xl bg-ink-800 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-champagne-500 flex-1 md:w-64"
            />
            <select
              value={filterSession}
              onChange={(e) => setFilterSession(e.target.value)}
              className="px-3 py-2 rounded-xl bg-ink-800 border border-white/10 text-white text-xs"
            >
              <option value="">All Sessions</option>
              <option value="1">Session 1 (Lunch)</option>
              <option value="2">Session 2 (Dinner)</option>
            </select>
            <button
              onClick={() => load(true)}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs border border-white/10 flex items-center gap-1"
              title="Reload Tickets & Orders"
            >
              <span>🔄</span> Refresh
            </button>
          </div>
        </div>

        {loading && (data.orders || []).length === 0 ? (
          <div className="text-center py-16 text-white/40">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-white/40 text-sm">No matching orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-white/40 uppercase border-b border-white/5 pb-2">
                  <th className="pb-3 pr-4">Order Code</th>
                  <th className="pb-3 pr-4">Attendee</th>
                  <th className="pb-3 pr-4">Session & Tier</th>
                  <th className="pb-3 pr-4">Qty</th>
                  <th className="pb-3 pr-4">Meal</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Gate Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 pr-4 font-mono font-semibold text-champagne-400">
                      {ord.order_code}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-bold text-white">{ord.buyer_name}</div>
                      <div className="text-[10px] text-white/40">{ord.buyer_phone} • {ord.buyer_email}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="uppercase font-bold text-white">S{ord.session} • {ord.tier}</span>
                      <div className="text-[10px] text-white/40">₹{ord.price_paisa / 100}</div>
                    </td>
                    <td className="py-3 pr-4 font-bold">{ord.quantity}</td>
                    <td className="py-3 pr-4 capitalize text-emerald-400">{ord.food_entitlement}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${ord.is_checked_in ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/50'
                        }`}>
                        {ord.is_checked_in ? '✓ Inside' : 'Not Checked'}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => toggleCheckIn(ord)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${ord.is_checked_in
                          ? 'bg-ink-800 text-white/60 hover:text-red-400 border border-white/10'
                          : 'bg-emerald-500 text-ink-900 hover:bg-emerald-400 shadow'
                          }`}
                      >
                        {ord.is_checked_in ? 'Undo Check-In' : 'Admit Entry'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ========== PAST EVENTS & AWARDEES TAB ==========
function PastEventsTab() {
  const [activeSubTab, setActiveSubTab] = useState('events'); // 'events' | 'awardees'
  const [events, setEvents] = useState([]);
  const [awardees, setAwardees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Form states
  const [newEvent, setNewEvent] = useState({ slug: '', name: '', year: 2026, venue: 'Hitex, Hyderabad', description: '', poster_url: '' });
  const [newAwardee, setNewAwardee] = useState({ past_event_id: '', name: '', category: '', award_type: 'Winner', year: 2025, photo_url: '', bio: '' });

  const load = (force = false) => {
    setLoading(true);
    Promise.all([
      api.get('/admin/past-events', { force }).catch(() => []),
      api.get('/admin/awardees', { force }).catch(() => []),
    ]).then(([evData, awData]) => {
      if (Array.isArray(evData)) setEvents(evData);
      if (Array.isArray(awData)) setAwardees(awData);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    const res = await api.post('/admin/past-events', newEvent);
    setMessage({ type: 'success', text: res.message || 'Event created' });
    setNewEvent({ slug: '', name: '', year: 2026, venue: 'Hitex, Hyderabad', description: '', poster_url: '' });
    load(true);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    const res = await api.delete(`/admin/past-events/${id}`);
    setMessage({ type: 'success', text: res.message || 'Event deleted' });
    load(true);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCreateAwardee = async (e) => {
    e.preventDefault();
    const res = await api.post('/admin/awardees', newAwardee);
    setMessage({ type: 'success', text: res.message || 'Awardee added' });
    setNewAwardee({ past_event_id: events[0]?.id || '', name: '', category: '', award_type: 'Winner', year: 2025, photo_url: '', bio: '' });
    load(true);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeleteAwardee = async (id) => {
    const res = await api.delete(`/admin/awardees/${id}`);
    setMessage({ type: 'success', text: res.message || 'Awardee removed' });
    load(true);
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className="px-4 py-3 rounded-xl text-sm bg-emerald-900/30 border border-emerald-500/40 text-emerald-200">
          {message.text}
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab('events')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === 'events' ? 'bg-champagne-500 text-ink-900' : 'bg-ink-800 text-white/60 hover:text-white'
              }`}
          >
            Past Events Hub ({events.length})
          </button>
          <button
            onClick={() => setActiveSubTab('awardees')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === 'awardees' ? 'bg-champagne-500 text-ink-900' : 'bg-ink-800 text-white/60 hover:text-white'
              }`}
          >
            Awardees & Hall of Fame ({awardees.length})
          </button>
        </div>
        <button
          onClick={() => load(true)}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs border border-white/10 flex items-center gap-1"
          title="Reload Events & Awardees"
        >
          <span>🔄</span> Refresh
        </button>
      </div>

      {activeSubTab === 'events' ? (
        <div className="space-y-6">
          {/* Add Event Form */}
          <div className="glass-card p-6">
            <h3 className="text-base font-bold text-white mb-4">Add Past Event Archive</h3>
            <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <input
                type="text"
                placeholder="Slug (e.g., stree-shakti-2025)"
                value={newEvent.slug}
                onChange={(e) => setNewEvent({ ...newEvent, slug: e.target.value })}
                required
                className="input-field"
              />
              <input
                type="text"
                placeholder="Event Name"
                value={newEvent.name}
                onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                required
                className="input-field"
              />
              <input
                type="number"
                placeholder="Year"
                value={newEvent.year}
                onChange={(e) => setNewEvent({ ...newEvent, year: e.target.value })}
                required
                className="input-field"
              />
              <input
                type="text"
                placeholder="Venue"
                value={newEvent.venue}
                onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                className="input-field"
              />
              <input
                type="text"
                placeholder="Brief Description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                className="input-field md:col-span-2"
              />
              <div className="md:col-span-3">
                <ImageUploader
                  label="Event Poster Image (Upload File)"
                  value={newEvent.poster_url}
                  onChange={(url) => setNewEvent({ ...newEvent, poster_url: url })}
                />
              </div>
              <div className="md:col-span-3">
                <button type="submit" className="btn-gold !py-2.5 text-xs">+ Save Past Event</button>
              </div>
            </form>
          </div>

          {/* Events List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((ev) => (
              <div key={ev.id} className="glass-card p-5 flex flex-wrap items-start justify-between gap-3 sm:gap-4">
                <div className="flex gap-3 min-w-0 flex-1">
                  {ev.poster_url && (
                    <img
                      src={getAssetUrl(ev.poster_url)}
                      alt=""
                      className="w-16 h-20 object-cover rounded-lg shrink-0 border border-white/10"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="80" viewBox="0 0 64 80" fill="%231a1a24"><rect width="64" height="80" fill="%231a1a24"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff40" font-size="20">🖼️</text></svg>';
                      }}
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-champagne-400 uppercase break-words">{ev.year} • {ev.slug}</div>
                    <h4 className="font-display font-bold text-white text-base mt-1 break-words">{ev.name}</h4>
                    <div className="text-xs text-white/50 mt-1 break-words">{ev.venue}</div>
                    {ev.description && <p className="text-xs text-white/40 mt-2 line-clamp-2 break-words">{ev.description}</p>}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteEvent(ev.id)}
                  className="px-3 py-1.5 rounded-lg bg-red-900/30 text-red-300 border border-red-500/30 text-xs hover:bg-red-900/50 shrink-0"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Add Awardee Form */}
          <div className="glass-card p-6">
            <h3 className="text-base font-bold text-white mb-4">Add Award Winner</h3>
            <form onSubmit={handleCreateAwardee} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <select
                value={newAwardee.past_event_id}
                onChange={(e) => setNewAwardee({ ...newAwardee, past_event_id: e.target.value })}
                required
                className="input-field"
              >
                <option value="">Select Event...</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name} ({ev.year})</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Awardee Name *"
                value={newAwardee.name}
                onChange={(e) => setNewAwardee({ ...newAwardee, name: e.target.value })}
                required
                className="input-field"
              />
              <input
                type="text"
                placeholder="Category Name *"
                value={newAwardee.category}
                onChange={(e) => setNewAwardee({ ...newAwardee, category: e.target.value })}
                required
                className="input-field"
              />
              <input
                type="text"
                placeholder="Award Title (e.g. Winner)"
                value={newAwardee.award_type}
                onChange={(e) => setNewAwardee({ ...newAwardee, award_type: e.target.value })}
                className="input-field"
              />
              <input
                type="number"
                placeholder="Year"
                value={newAwardee.year}
                onChange={(e) => setNewAwardee({ ...newAwardee, year: e.target.value })}
                className="input-field"
              />
              <div className="md:col-span-3">
                <ImageUploader
                  label="Winner Photo (Upload File)"
                  value={newAwardee.photo_url}
                  onChange={(url) => setNewAwardee({ ...newAwardee, photo_url: url })}
                />
              </div>
              <div className="md:col-span-3">
                <button type="submit" className="btn-gold !py-2.5 text-xs">+ Save Awardee</button>
              </div>
            </form>
          </div>

          {/* Awardees Table */}
          <div className="glass-card p-6 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-white/40 uppercase border-b border-white/5 pb-2">
                  <th className="pb-3 pr-4">Winner</th>
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 pr-4">Event & Year</th>
                  <th className="pb-3 pr-4">Title</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {awardees.map((aw) => (
                  <tr key={aw.id} className="hover:bg-white/5">
                    <td className="py-2.5 pr-4 font-bold text-white">
                      <div className="flex items-center gap-2.5">
                        {aw.photo_url ? (
                          <img src={getAssetUrl(aw.photo_url)} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs shrink-0">🏅</div>
                        )}
                        <span>{aw.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-champagne-400">{aw.category}</td>
                    <td className="py-2.5 pr-4">{aw.event_name || 'Past Event'} ({aw.year})</td>
                    <td className="py-2.5 pr-4 font-medium">{aw.award_type || 'Winner'}</td>
                    <td className="py-2.5">
                      <button
                        onClick={() => handleDeleteAwardee(aw.id)}
                        className="text-red-400 hover:text-red-300 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== MEDIA & GALLERY CMS TAB ==========
function MediaTab() {
  const [activeSubTab, setActiveSubTab] = useState('gallery'); // 'gallery' | 'media'
  const [gallery, setGallery] = useState([]);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const [newGallery, setNewGallery] = useState({ category: 'telugu_icon_2026', url: '', title: '', description: '' });
  const [newMedia, setNewMedia] = useState({ item_type: 'press_release', title: '', description: '', url: '', source: 'TIA PR' });

  const load = (force = false) => {
    setLoading(true);
    Promise.all([
      api.get('/admin/gallery', { force }).catch(() => []),
      api.get('/admin/media', { force }).catch(() => []),
    ]).then(([galData, medData]) => {
      if (Array.isArray(galData)) setGallery(galData);
      if (Array.isArray(medData)) setMedia(medData);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreateGallery = async (e) => {
    e.preventDefault();
    const res = await api.post('/admin/gallery', newGallery);
    setMessage({ type: 'success', text: res.message || 'Gallery item added' });
    setNewGallery({ category: 'telugu_icon_2026', url: '', title: '', description: '' });
    load(true);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeleteGallery = async (id) => {
    const res = await api.delete(`/admin/gallery/${id}`);
    setMessage({ type: 'success', text: res.message || 'Gallery item deleted' });
    load(true);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCreateMedia = async (e) => {
    e.preventDefault();
    const res = await api.post('/admin/media', newMedia);
    setMessage({ type: 'success', text: res.message || 'Media release published' });
    setNewMedia({ item_type: 'press_release', title: '', description: '', url: '', source: 'TIA PR' });
    load(true);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeleteMedia = async (id) => {
    const res = await api.delete(`/admin/media/${id}`);
    setMessage({ type: 'success', text: res.message || 'Media release deleted' });
    load(true);
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className="px-4 py-3 rounded-xl text-sm bg-emerald-900/30 border border-emerald-500/40 text-emerald-200">
          {message.text}
        </div>
      )}

      {/* Sub tabs */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab('gallery')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === 'gallery' ? 'bg-champagne-500 text-ink-900' : 'bg-ink-800 text-white/60 hover:text-white'
              }`}
          >
            Photo Gallery ({gallery.length})
          </button>
          <button
            onClick={() => setActiveSubTab('media')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === 'media' ? 'bg-champagne-500 text-ink-900' : 'bg-ink-800 text-white/60 hover:text-white'
              }`}
          >
            Press Releases & News ({media.length})
          </button>
        </div>
        <button
          onClick={() => load(true)}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs border border-white/10 flex items-center gap-1"
          title="Reload Media & Gallery"
        >
          <span>🔄</span> Refresh
        </button>
      </div>

      {activeSubTab === 'gallery' ? (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-base font-bold text-white mb-4">Add Photo to Gallery</h3>
            <form onSubmit={handleCreateGallery} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <select
                value={newGallery.category}
                onChange={(e) => setNewGallery({ ...newGallery, category: e.target.value })}
                className="input-field"
              >
                <option value="telugu_icon_2026">Telugu Icon Awards 2026</option>
                <option value="telugu_icon_digital_2026">Telugu Icon Digital 2026</option>
                <option value="stree_shakti_2025">Stree Shakti 2025</option>
                <option value="press_events">Press Events</option>
                <option value="launch_events">Launch Events</option>
                <option value="behind_scenes">Behind the Scenes</option>
              </select>
              <input
                type="text"
                placeholder="Title / Caption (optional)"
                value={newGallery.title}
                onChange={(e) => setNewGallery({ ...newGallery, title: e.target.value })}
                className="input-field md:col-span-2"
              />
              <div className="md:col-span-3">
                <ImageUploader
                  label="Gallery Image (Upload File)"
                  value={newGallery.url}
                  onChange={(url) => setNewGallery({ ...newGallery, url })}
                  required
                />
              </div>
              <div className="md:col-span-3">
                <button type="submit" className="btn-gold !py-2 text-xs">+ Add Image to Gallery</button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {gallery.map((item) => (
              <div key={item.id} className="relative group rounded-xl overflow-hidden border border-white/10 bg-ink-800">
                <img src={getAssetUrl(item.url)} alt={item.title || 'Gallery'} className="w-full h-36 object-cover" />
                <div className="p-2.5">
                  <div className="text-[10px] text-champagne-400 uppercase truncate">{item.category}</div>
                  <div className="text-xs font-bold text-white truncate">{item.title || 'Photo'}</div>
                  <button
                    onClick={() => handleDeleteGallery(item.id)}
                    className="mt-2 text-[10px] text-red-400 hover:text-red-300 font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-base font-bold text-white mb-4">Publish Press Release / Media Link</h3>
            <form onSubmit={handleCreateMedia} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <select
                value={newMedia.item_type}
                onChange={(e) => setNewMedia({ ...newMedia, item_type: e.target.value })}
                className="input-field"
              >
                <option value="press_release">Press Release</option>
                <option value="news">Media News</option>
                <option value="announcement">Official Announcement</option>
                <option value="kit">Downloadable Kit</option>
              </select>
              <input
                type="text"
                placeholder="Headline / Title"
                value={newMedia.title}
                onChange={(e) => setNewMedia({ ...newMedia, title: e.target.value })}
                required
                className="input-field"
              />
              <input
                type="text"
                placeholder="Source (e.g., Deccan Chronicle, TIA PR)"
                value={newMedia.source}
                onChange={(e) => setNewMedia({ ...newMedia, source: e.target.value })}
                className="input-field"
              />
              <input
                type="text"
                placeholder="Short Description"
                value={newMedia.description}
                onChange={(e) => setNewMedia({ ...newMedia, description: e.target.value })}
                className="input-field md:col-span-2"
              />
              <div className="md:col-span-3">
                <ImageUploader
                  label="Press Article Cover / Media Asset (Upload File)"
                  value={newMedia.url}
                  onChange={(url) => setNewMedia({ ...newMedia, url })}
                />
              </div>
              <div className="md:col-span-3">
                <button type="submit" className="btn-gold !py-2 text-xs">+ Publish Release</button>
              </div>
            </form>
          </div>

          <div className="glass-card p-6 divide-y divide-white/5">
            {media.map((item) => (
              <div key={item.id} className="py-3.5 flex items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <div className="text-[10px] text-champagne-400 uppercase font-semibold break-words">{item.item_type} • {item.source}</div>
                  <div className="text-sm font-bold text-white mt-0.5 break-words">{item.title}</div>
                  {item.description && <p className="text-xs text-white/50 mt-1 line-clamp-1 break-words">{item.description}</p>}
                </div>
                <button
                  onClick={() => handleDeleteMedia(item.id)}
                  className="text-xs text-red-400 hover:text-red-300 shrink-0 font-medium"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ========== SPONSOR LEADS TAB ==========
function SponsorLeadsTab() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const load = (force = false) => {
    setLoading(true);
    api.get('/admin/sponsor-leads', { force })
      .then((data) => { if (Array.isArray(data)) setLeads(data); })
      .catch((err) => setMessage({ type: 'error', text: err.message }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await api.put(`/admin/sponsor-leads/${id}/read`, {});
    load(true);
  };

  const deleteLead = async (id, company) => {
    if (!window.confirm(`Delete enquiry from "${company}"?`)) return;
    const res = await api.delete(`/admin/sponsor-leads/${id}`);
    setMessage({ type: 'success', text: res.message || 'Enquiry deleted' });
    load(true);
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className="px-4 py-3 rounded-xl text-sm bg-emerald-900/30 border border-emerald-500/40 text-emerald-200">{message.text}</div>
      )}
      <div className="glass-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <h2 className="font-display text-xl font-bold text-white min-w-0 break-words">Partner &amp; Sponsor Enquiries</h2>
          <button
            onClick={() => load(true)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs border border-white/10 flex items-center gap-1"
            title="Reload Inquiries"
          >
            <span>🔄</span> Refresh
          </button>
        </div>
        <p className="text-white/40 text-xs mb-6">Inbound leads captured through the "Become a Partner" form ({leads.length} records).</p>

        {loading && leads.length === 0 ? (
          <div className="text-center py-16 text-white/40">Loading partner leads...</div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12 text-white/40 text-sm">No partner inquiries yet.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {leads.map((lead) => (
              <div key={lead.id} className={`py-4 ${lead.is_read ? 'opacity-70' : ''}`}>
                {/* flex-wrap lets the action buttons drop below the details on a
                    narrow screen instead of squeezing the row. */}
                <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-base break-words">{lead.company}</span>
                      {lead.package_interest && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-champagne-500/10 text-champagne-400 border border-champagne-500/30 uppercase">
                          {lead.package_interest}
                        </span>
                      )}
                      {!lead.is_read && (
                        <span className="w-2 h-2 rounded-full bg-champagne-400 shrink-0" title="New" />
                      )}
                    </div>
                    <div className="text-xs text-white/60 mt-1 flex flex-wrap items-center gap-x-1 gap-y-1">
                      <span>
                        Contact: <strong className="text-white">{lead.contact_person}</strong>
                      </span>
                      <a href={`tel:${lead.mobile}`} className="text-champagne-400 hover:underline break-all">{lead.mobile}</a>
                      <a href={`mailto:${lead.email}`} className="text-white/40 hover:underline break-all">{lead.email}</a>
                    </div>
                    {lead.industry && (
                      <div className="text-[11px] text-white/40 mt-1 break-words">Industry: {lead.industry}</div>
                    )}
                    {lead.message && (
                      <p className="text-xs text-white/70 mt-2 p-3 rounded-xl bg-ink-900/60 border border-white/5 break-words">
                        "{lead.message}"
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!lead.is_read && (
                      <button
                        onClick={() => markRead(lead.id)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs shrink-0 whitespace-nowrap"
                      >
                        Mark Read
                      </button>
                    )}
                    <button
                      onClick={() => deleteLead(lead.id, lead.company)}
                      className="px-3 py-1.5 rounded-lg bg-burgundy-900/30 hover:bg-burgundy-900/50 text-burgundy-300 border border-burgundy-500/20 text-xs whitespace-nowrap"
                    >
                      Delete 🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ========== EVENT PHASE SWITCHER TAB ==========
function PhaseTab() {
  const [currentPhase, setCurrentPhase] = useState('phase_2');
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/settings').then((data) => {
      if (Array.isArray(data)) {
        const item = data.find((s) => s.setting_key === 'event_phase');
        if (item) setCurrentPhase(item.setting_value);
      }
    }).catch(() => { });
  }, []);

  const savePhase = async (phase) => {
    setSaving(true);
    try {
      const res = await api.put('/admin/event-phase', { phase });
      setCurrentPhase(phase);
      setMessage({ type: 'success', text: res.message || 'Phase updated' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const PHASES = [
    {
      id: 'phase_1',
      num: 1,
      title: 'Nominations Open',
      desc: 'Campaign launch. Hero highlights self and peer nomination forms. Countdown targets June 30, 2026.',
      cta: 'Nominate Now',
    },
    {
      id: 'phase_2',
      num: 2,
      title: 'Public Voting Live',
      desc: 'Official nominees published. OTP-verified voting engine active. Real-time public leaderboard.',
      cta: 'Vote Now',
    },
    {
      id: 'phase_3',
      num: 3,
      title: 'Jury & Audit Review',
      desc: 'Voting closes. Final verification & forensic vote audits. Ticket sales highlighted.',
      cta: 'Book Tickets',
    },
    {
      id: 'phase_4',
      num: 4,
      title: 'Event Day (August 30, 2026)',
      desc: 'Grand Gala day at Hitex. Gate QR code scanning, session schedule, and live streams.',
      cta: 'Gate Ticket Pass',
    },
    {
      id: 'phase_5',
      num: 5,
      title: 'Post-Event Archival',
      desc: 'Winners announced in Hall of Fame. Full photo gallery, event highlight reels, and press coverage.',
      cta: 'View Awardees',
    },
  ];

  return (
    <div className="space-y-5 max-w-4xl">
      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm border ${message.type === 'error' ? 'bg-red-900/30 border-red-500/40 text-red-200' : 'bg-emerald-900/30 border-emerald-500/40 text-emerald-200'}`}>
          {message.text}
        </div>
      )}

      {(() => {
        const active = PHASES.find((p) => p.id === currentPhase);
        return (
          <div className="rounded-2xl border border-champagne-500/40 bg-champagne-500/10 p-4 sm:p-5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-champagne-400 font-bold mb-1">
              Currently live on the site
            </div>
            <div className="font-display text-lg sm:text-xl font-bold text-white break-words">
              {active ? `Phase ${active.num} · ${active.title}` : 'Loading phase...'}
            </div>
            {active && (
              <p className="text-xs text-white/60 mt-1.5 leading-relaxed break-words">{active.desc}</p>
            )}
          </div>
        );
      })()}

      <div className="glass-card p-4 sm:p-6">
        <h2 className="font-display text-lg sm:text-xl font-bold text-white mb-2">5-Phase Lifecycle Control</h2>
        <p className="text-white/40 text-[11px] sm:text-xs mb-5">
          Instantly switches public countdown banners, hero calls-to-action, and voting availability across the entire website.
        </p>

        <div className="space-y-3 sm:space-y-4">
          {PHASES.map((p) => {
            const isActive = currentPhase === p.id;
            return (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                onClick={() => !isActive && savePhase(p.id)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !isActive) {
                    e.preventDefault();
                    savePhase(p.id);
                  }
                }}
                className={`relative rounded-2xl border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne-400 ${isActive
                  ? 'bg-champagne-500/15 border-champagne-500 shadow-gold'
                  : 'bg-ink-900/60 border-white/5 hover:border-white/20 active:border-champagne-500/50'
                  }`}
              >
                <span className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-full ${isActive ? 'bg-champagne-400' : 'bg-transparent'}`} aria-hidden="true" />

                <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                  <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold shrink-0 ${isActive ? 'bg-champagne-500 text-ink-900' : 'bg-white/10 text-white/60'
                    }`}>
                    {p.num}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h4 className="font-display font-bold text-white text-[15px] sm:text-base leading-snug break-words">{p.title}</h4>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-champagne-500 text-ink-900 uppercase tracking-wide shrink-0">
                          Active Now
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] sm:text-xs text-white/60 mt-1 leading-relaxed break-words">{p.desc}</p>
                    <div className="text-[10px] sm:text-[11px] text-champagne-400 font-semibold mt-1.5 break-words">
                      Hero CTA &rarr; &ldquo;{p.cta}&rdquo;
                    </div>
                  </div>
                </div>

                {/* A styled span, not a <button>: the whole card is the control,
                    and nesting a real button inside it breaks keyboard/AT semantics. */}
                <span
                  aria-hidden="true"
                  className={`w-full sm:w-auto shrink-0 text-center sm:text-left px-4 py-2 rounded-xl text-xs font-bold transition-colors pointer-events-none ${isActive
                    ? 'bg-champagne-500/25 text-champagne-300 border border-champagne-500/50'
                    : 'bg-white/5 text-white/60 border border-white/10'
                    }`}
                >
                  {isActive ? 'Current Phase' : (saving ? 'Switching...' : 'Switch to this')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ========== AUDIT LOGS TAB ==========
function AuditTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = (force = false) => {
    setLoading(true);
    api.get('/admin/audit-logs', { force })
      .then((data) => { if (Array.isArray(data)) setLogs(data); })
      .catch(() => { })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleExportVotes = () => {
    const token = localStorage.getItem('admin_token');
    window.open(`/api/admin/votes/export${token ? `?token=${token}` : ''}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-xl font-bold text-white">System & Forensic Audit Logs</h2>
            <p className="text-white/40 text-xs mt-1">Immutable administrative actions and anti-fraud quarantine logs ({logs.length} records).</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(true)}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs border border-white/10 flex items-center gap-1"
              title="Reload Audit Logs"
            >
              <span>🔄</span> Refresh
            </button>
            <button
              onClick={handleExportVotes}
              className="btn-gold !py-2 text-xs flex items-center gap-2"
            >
              <span>📥</span> Export CSV
            </button>
          </div>
        </div>

        {loading && logs.length === 0 ? (
          <div className="text-center py-16 text-white/40">Loading audit records...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-ink-900/40 border border-white/5 text-white/40 text-xs">
            No audit anomalies recorded yet. Forensic monitoring is active.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-white/40 uppercase border-b border-white/5 pb-2">
                  <th className="pb-3 pr-4">Timestamp</th>
                  <th className="pb-3 pr-4">Admin / Origin</th>
                  <th className="pb-3 pr-4">Action</th>
                  <th className="pb-3 pr-4">Entity</th>
                  <th className="pb-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5">
                    <td className="py-2.5 pr-4 text-white/40 font-mono">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 font-semibold text-white">{log.admin_email || 'System'}</td>
                    <td className="py-2.5 pr-4 text-champagne-400 font-bold uppercase">{log.action}</td>
                    <td className="py-2.5 pr-4">{log.entity_type} #{log.entity_id}</td>
                    <td className="py-2.5 text-white/60">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}