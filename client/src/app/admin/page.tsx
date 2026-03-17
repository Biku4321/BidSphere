'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store';

// ─── Types ────────────────────────────────────────────────
interface Stats {
  totalUsers: number;
  totalAuctions: number;
  liveAuctions: number;
  totalBids: number;
  fraudFlags: number;
  totalRevenue: number;
}
interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  totalBids: number;
  totalWins: number;
  createdAt: string;
}
interface FraudLog {
  _id: string;
  type: string;
  riskScore: number;
  isResolved: boolean;
  createdAt: string;
  auction?: { title: string };
  user?: { name: string; email: string };
}
interface AuctionForm {
  title: string;
  description: string;
  category: string;
  startingPrice: string;
  bidIncrement: string;
  startTime: string;
  endTime: string;
  images: string;
}

const CATEGORIES = ['electronics','collectibles','art','fashion','vehicles','real-estate','other'];

const FRAUD_TYPE_LABELS: Record<string, string> = {
  shill_bidding: 'Shill Bidding',
  rapid_bidding: 'Rapid Bidding',
  bid_manipulation: 'Bid Manipulation',
  bot_activity: 'Bot Activity',
  coordinated_bidding: 'Coordinated',
  other: 'Other',
};

// ─── Stat Card ────────────────────────────────────────────
function StatCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: string
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors">
      <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${accent || 'text-white'}`}>{value}</p>
      {sub && <p className="text-zinc-600 text-xs mt-1">{sub}</p>}
    </div>
  );
}

// ─── Helper: local datetime string for input ──────────────
function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function nowLocal(): string {
  return toLocalDatetimeValue(new Date());
}

function futureLocal(hours: number): string {
  return toLocalDatetimeValue(new Date(Date.now() + hours * 3600000));
}

// ─── Main Component ───────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();

  const [tab, setTab]             = useState<'dashboard'|'create'|'users'|'fraud'>('dashboard');
  const [stats, setStats]         = useState<Stats | null>(null);
  const [users, setUsers]         = useState<User[]>([]);
  const [fraudLogs, setFraudLogs] = useState<FraudLog[]>([]);
  const [loading, setLoading]     = useState(false);
  const [msg, setMsg]             = useState('');
  const [form, setForm]           = useState<AuctionForm>({
    title: '', description: '', category: 'electronics',
    startingPrice: '', bidIncrement: '500',
    startTime: nowLocal(),
    endTime: futureLocal(24),
    images: '',
  });

  // ── Auth guard — wait for hydration first ─────────────
  useEffect(() => {
    if (!_hasHydrated) return;        // wait for localStorage to load
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (user.role !== 'admin') {
      router.push('/');
      return;
    }
    loadDashboard();
  }, [_hasHydrated, user]);

  useEffect(() => {
    if (tab === 'users' && users.length === 0) loadUsers();
    if (tab === 'fraud' && fraudLogs.length === 0) loadFraud();
  }, [tab]);

  const loadDashboard = async () => {
    try {
      const { data } = await api.get('/admin/dashboard');
      setStats(data.stats);
    } catch (e: any) {
      setMsg(e.response?.data?.error || 'Failed to load dashboard');
    }
  };

  const loadUsers = async () => {
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data.users);
    } catch (_) {}
  };

  const loadFraud = async () => {
    try {
      const { data } = await api.get('/admin/fraud-logs');
      setFraudLogs(data.logs);
    } catch (_) {}
  };

  // ── Create auction ─────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const startDate = new Date(form.startTime);
      const payload = {
        title:          form.title,
        description:    form.description,
        category:       form.category,
        startingPrice:  Number(form.startingPrice),
        currentPrice:   Number(form.startingPrice),
        bidIncrement:   Number(form.bidIncrement),
        startTime:      startDate.toISOString(),
        endTime:        new Date(form.endTime).toISOString(),
        originalEndTime: new Date(form.endTime).toISOString(),
        status:         startDate <= new Date() ? 'live' : 'upcoming',
        images:         form.images ? [form.images] : [],
      };
      await api.post('/auctions', payload);
      setMsg('✅ Auction created successfully! Go to /auctions to see it.');
      setForm(f => ({
        ...f,
        title: '', description: '', startingPrice: '', images: '',
        startTime: nowLocal(), endTime: futureLocal(24),
      }));
    } catch (e: any) {
      setMsg('❌ ' + (e.response?.data?.error || 'Failed to create auction'));
    }
    setLoading(false);
  };

  const toggleUser = async (userId: string) => {
    try {
      await api.patch(`/admin/users/${userId}/toggle`);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isActive: !u.isActive } : u));
    } catch (_) {}
  };

  const resolveFraud = async (logId: string) => {
    try {
      await api.patch(`/admin/fraud-logs/${logId}/resolve`, { action: 'dismissed' });
      setFraudLogs(prev => prev.map(l => l._id === logId ? { ...l, isResolved: true } : l));
    } catch (_) {}
  };

  const setF = (k: keyof AuctionForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  // ── Loading state ──────────────────────────────────────
  // Show spinner while hydrating from localStorage
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  // After hydration — check auth
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-zinc-400">Admin access required.</p>
          <a href="/auth/login"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm">
            Login as Admin
          </a>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'create',    label: '➕ Create Auction' },
    { id: 'users',     label: '👥 Users' },
    { id: 'fraud',     label: '🛡️ Fraud Logs' },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Logged in as <span className="text-orange-400">{user.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-zinc-400 text-xs">System Online</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-zinc-800">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setMsg(''); }}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'text-orange-400 border-orange-500'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Message banner */}
      {msg && (
        <div className={`mb-6 px-4 py-3 rounded-xl text-sm border ${
          msg.startsWith('✅')
            ? 'bg-emerald-950/50 border-emerald-800/50 text-emerald-400'
            : 'bg-red-950/50 border-red-800/50 text-red-400'
        }`}>
          {msg}
        </div>
      )}

      {/* ── DASHBOARD TAB ─────────────────────────────── */}
      {tab === 'dashboard' && (
        <div className="space-y-8">
          {stats ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard label="Total Users"    value={stats.totalUsers} />
                <StatCard label="Total Auctions" value={stats.totalAuctions} accent="text-blue-400" />
                <StatCard label="Live Now"        value={stats.liveAuctions} sub="Active" accent="text-emerald-400" />
                <StatCard label="Total Bids"      value={stats.totalBids.toLocaleString()} accent="text-orange-400" />
                <StatCard label="Fraud Flags"     value={stats.fraudFlags} sub="Unresolved" accent={stats.fraudFlags > 0 ? 'text-red-400' : 'text-emerald-400'} />
                <StatCard label="Revenue"         value={`₹${(stats.totalRevenue||0).toLocaleString()}`} accent="text-violet-400" />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <button onClick={() => setTab('create')}
                  className="bg-orange-500/10 hover:bg-orange-500/20 border border-orange-900/40 rounded-2xl p-5 text-left transition-colors">
                  <div className="text-2xl mb-2">➕</div>
                  <p className="text-orange-300 font-semibold">Create Auction</p>
                  <p className="text-zinc-500 text-xs mt-1">Add new auction item</p>
                </button>
                <button onClick={() => { setTab('users'); loadUsers(); }}
                  className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-900/40 rounded-2xl p-5 text-left transition-colors">
                  <div className="text-2xl mb-2">👥</div>
                  <p className="text-blue-300 font-semibold">Manage Users</p>
                  <p className="text-zinc-500 text-xs mt-1">{stats.totalUsers} registered users</p>
                </button>
                <button onClick={() => { setTab('fraud'); loadFraud(); }}
                  className={`border rounded-2xl p-5 text-left transition-colors ${
                    stats.fraudFlags > 0
                      ? 'bg-red-500/10 hover:bg-red-500/20 border-red-900/40'
                      : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800'
                  }`}>
                  <div className="text-2xl mb-2">🛡️</div>
                  <p className={`font-semibold ${stats.fraudFlags > 0 ? 'text-red-300' : 'text-zinc-300'}`}>Fraud Logs</p>
                  <p className="text-zinc-500 text-xs mt-1">
                    {stats.fraudFlags > 0 ? `${stats.fraudFlags} unresolved!` : 'All clear'}
                  </p>
                </button>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <p className="text-zinc-400 text-sm font-medium mb-3">Demo Credentials</p>
                <div className="grid md:grid-cols-3 gap-3">
                  {[
                    { role: 'Admin', email: 'admin@bidsphere.com', pass: 'Admin@123', color: 'text-orange-400' },
                    { role: 'User 1', email: 'rahul@test.com', pass: 'Test@123', color: 'text-blue-400' },
                    { role: 'User 2', email: 'priya@test.com', pass: 'Test@123', color: 'text-emerald-400' },
                  ].map(c => (
                    <div key={c.role} className="bg-zinc-800/60 rounded-xl px-4 py-3">
                      <p className={`text-xs font-semibold mb-1 ${c.color}`}>{c.role}</p>
                      <p className="text-zinc-300 text-xs font-mono">{c.email}</p>
                      <p className="text-zinc-500 text-xs font-mono">{c.pass}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* ── CREATE AUCTION TAB ────────────────────────── */}
      {tab === 'create' && (
        <div className="max-w-2xl">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold text-lg mb-6">Create New Auction</h2>
            <form onSubmit={handleCreate} className="space-y-5">

              <div>
                <label className="block text-zinc-400 text-xs font-medium mb-1.5">Title *</label>
                <input type="text" value={form.title} onChange={setF('title')} required
                  placeholder="e.g. iPhone 16 Pro — Sealed Box"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-zinc-600" />
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-medium mb-1.5">Description *</label>
                <textarea value={form.description} onChange={setF('description')} required rows={3}
                  placeholder="Describe the item..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-zinc-600 resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 text-xs font-medium mb-1.5">Category *</label>
                  <select value={form.category} onChange={setF('category')}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500">
                    {CATEGORIES.map(c => (
                      <option key={c} value={c} className="bg-zinc-800 capitalize">{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs font-medium mb-1.5">Bid Increment (₹)</label>
                  <input type="number" value={form.bidIncrement} onChange={setF('bidIncrement')} min="1"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500" />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-medium mb-1.5">Starting Price (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">₹</span>
                  <input type="number" value={form.startingPrice} onChange={setF('startingPrice')} required min="1"
                    placeholder="50000"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-7 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-zinc-600" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 text-xs font-medium mb-1.5">Start Time *</label>
                  <input
                    type="datetime-local"
                    value={form.startTime}
                    onChange={setF('startTime')}
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
                  />
                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, startTime: nowLocal() }))}
                    className="text-xs text-orange-400 mt-1 hover:underline">
                    Set to now
                  </button>
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs font-medium mb-1.5">End Time *</label>
                  <input
                    type="datetime-local"
                    value={form.endTime}
                    onChange={setF('endTime')}
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
                  />
                  <div className="flex gap-2 mt-1">
                    {[1, 6, 24].map(h => (
                      <button key={h} type="button"
                        onClick={() => setForm(f => ({ ...f, endTime: futureLocal(h) }))}
                        className="text-xs text-orange-400 hover:underline">+{h}h</button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-medium mb-1.5">Image URL (optional)</label>
                <input type="url" value={form.images} onChange={setF('images')}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-zinc-600" />
              </div>

              {form.images && (
                <div className="rounded-xl overflow-hidden h-32 bg-zinc-800 border border-zinc-700">
                  <img src={form.images} alt="preview" className="w-full h-full object-cover" />
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : '🏷️ Create Auction'}
              </button>
            </form>
          </div>

          <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-zinc-500 text-xs mb-3">Quick Unsplash images (click to use):</p>
            <div className="space-y-1.5">
              {[
                { label: 'MacBook',  url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600' },
                { label: 'Watch',    url: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600' },
                { label: 'Camera',   url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600' },
                { label: 'Sneakers', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600' },
                { label: 'Art',      url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600' },
              ].map(img => (
                <button key={img.label}
                  onClick={() => setForm(f => ({ ...f, images: img.url }))}
                  className="w-full text-left text-xs text-zinc-400 hover:text-orange-400 transition-colors font-mono truncate">
                  [{img.label}] {img.url}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── USERS TAB ─────────────────────────────────── */}
      {tab === 'users' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-zinc-400 text-sm">{users.length} total users</p>
            <button onClick={loadUsers} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">↻ Refresh</button>
          </div>

          {users.length === 0 ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      {['User','Role','Bids','Wins','Joined','Status','Action'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-zinc-500 text-xs font-medium uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {users.map(u => (
                      <tr key={u._id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
                              {u.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">{u.name}</p>
                              <p className="text-zinc-500 text-xs">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            u.role === 'admin' ? 'bg-orange-950/60 text-orange-400' : 'bg-zinc-800 text-zinc-400'
                          }`}>{u.role}</span>
                        </td>
                        <td className="px-5 py-3.5 text-zinc-300 text-sm tabular-nums">{u.totalBids || 0}</td>
                        <td className="px-5 py-3.5 text-zinc-300 text-sm tabular-nums">{u.totalWins || 0}</td>
                        <td className="px-5 py-3.5 text-zinc-500 text-xs">
                          {new Date(u.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            u.isActive ? 'bg-emerald-950/60 text-emerald-400' : 'bg-red-950/60 text-red-400'
                          }`}>{u.isActive ? 'Active' : 'Suspended'}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          {u.role !== 'admin' && (
                            <button onClick={() => toggleUser(u._id)}
                              className={`text-xs font-medium px-3 py-1 rounded-lg border transition-colors ${
                                u.isActive
                                  ? 'border-red-800/50 text-red-400 hover:bg-red-950/50'
                                  : 'border-emerald-800/50 text-emerald-400 hover:bg-emerald-950/50'
                              }`}>
                              {u.isActive ? 'Suspend' : 'Activate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FRAUD LOGS TAB ────────────────────────────── */}
      {tab === 'fraud' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-zinc-400 text-sm">
              {fraudLogs.filter(l => !l.isResolved).length} unresolved
              <span className="text-zinc-600 ml-2">/ {fraudLogs.length} total</span>
            </p>
            <button onClick={loadFraud} className="text-xs text-zinc-500 hover:text-zinc-300">↻ Refresh</button>
          </div>

          {fraudLogs.length === 0 ? (
            <div className="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-2xl">
              <p className="text-4xl mb-3">🛡️</p>
              <p className="text-zinc-400 font-medium">No fraud logs yet</p>
              <p className="text-zinc-600 text-sm mt-1">Place rapid bids to trigger fraud detection</p>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      {['User','Type','Auction','Risk Score','Time','Status','Action'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-zinc-500 text-xs font-medium uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {fraudLogs.map(log => (
                      <tr key={log._id} className={`hover:bg-zinc-800/40 transition-colors ${!log.isResolved ? 'bg-red-950/10' : ''}`}>
                        <td className="px-5 py-3.5">
                          <p className="text-white text-sm font-medium">{log.user?.name || 'Unknown'}</p>
                          <p className="text-zinc-500 text-xs">{log.user?.email || ''}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-medium text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-full">
                            {FRAUD_TYPE_LABELS[log.type] || log.type}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-zinc-400 text-xs max-w-xs truncate">
                          {log.auction?.title || 'N/A'}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${
                                log.riskScore >= 70 ? 'bg-red-500' : log.riskScore >= 40 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`} style={{ width: `${log.riskScore}%` }} />
                            </div>
                            <span className={`text-xs font-bold tabular-nums ${
                              log.riskScore >= 70 ? 'text-red-400' : log.riskScore >= 40 ? 'text-amber-400' : 'text-emerald-400'
                            }`}>{log.riskScore}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-zinc-500 text-xs">
                          {new Date(log.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            log.isResolved ? 'bg-zinc-800 text-zinc-500' : 'bg-red-950/60 text-red-400'
                          }`}>{log.isResolved ? 'Resolved' : 'Pending'}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          {!log.isResolved && (
                            <button onClick={() => resolveFraud(log._id)}
                              className="text-xs font-medium px-3 py-1 rounded-lg border border-emerald-800/50 text-emerald-400 hover:bg-emerald-950/50 transition-colors">
                              Resolve
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-zinc-400 text-sm font-medium mb-3">Risk Score Guide</p>
            <div className="grid md:grid-cols-3 gap-3">
              {[
                { score: '0–39', level: 'Low', color: 'text-emerald-400', bg: 'bg-emerald-950/30', desc: 'Normal — no action needed' },
                { score: '40–69', level: 'Medium', color: 'text-amber-400', bg: 'bg-amber-950/30', desc: 'Monitor, warn if continues' },
                { score: '70–100', level: 'High', color: 'text-red-400', bg: 'bg-red-950/30', desc: 'Auto-flagged for admin review' },
              ].map(r => (
                <div key={r.level} className={`${r.bg} rounded-xl px-4 py-3`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${r.color}`}>{r.level}</span>
                    <span className="text-zinc-600 text-xs font-mono">{r.score}</span>
                  </div>
                  <p className="text-zinc-500 text-xs">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}