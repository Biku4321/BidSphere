'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store';

interface Stats { totalUsers:number; totalAuctions:number; liveAuctions:number; totalBids:number; fraudFlags:number; totalRevenue:number; }
interface User { _id:string; name:string; email:string; role:string; isActive:boolean; totalBids:number; totalWins:number; createdAt:string; }
interface Auction { _id:string; title:string; status:string; currentPrice:number; startingPrice:number; bidCount:number; endTime:string; startTime:string; category:string; description:string; bidIncrement:number; images:string[]; }
interface FraudLog { _id:string; type:string; riskScore:number; isResolved:boolean; createdAt:string; auction?:{title:string}; user?:{name:string;email:string}; }
interface AuctionForm { title:string; description:string; category:string; startingPrice:string; bidIncrement:string; startTime:string; endTime:string; images:string; }

const CATS = ['electronics','collectibles','art','fashion','vehicles','real-estate','other'];
const FRAUD_LABELS:Record<string,string> = { shill_bidding:'Shill Bidding', rapid_bidding:'Rapid Bidding', bid_manipulation:'Bid Manipulation', bot_activity:'Bot Activity', coordinated_bidding:'Coordinated', other:'Other' };

function pad(n:number){ return String(n).padStart(2,'0'); }
function toLocal(d:Date){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function nowLocal(){ return toLocal(new Date()); }
function futureLocal(h:number){ return toLocal(new Date(Date.now()+h*3600000)); }

function StatCard({label,value,sub,accent}:{label:string;value:string|number;sub?:string;accent?:string}){
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors">
      <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${accent||'text-white'}`}>{value}</p>
      {sub&&<p className="text-zinc-600 text-xs mt-1">{sub}</p>}
    </div>
  );
}

// ── Edit Auction Modal ────────────────────────────────────
function EditModal({ auction, onClose, onSave }: { auction: Auction; onClose: ()=>void; onSave: ()=>void; }) {
  const [form, setForm] = useState({
    title:       auction.title,
    description: auction.description,
    endTime:     toLocal(new Date(auction.endTime)),
    status:      auction.status,
    bidIncrement: String(auction.bidIncrement),
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState('');

  const setF = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
    setForm(f=>({...f,[k]:e.target.value}));

  const handleSave = async () => {
    setLoading(true);
    setMsg('');
    try {
      await api.patch(`/auctions/${auction._id}`, {
        title:        form.title,
        description:  form.description,
        endTime:      new Date(form.endTime).toISOString(),
        status:       form.status,
        bidIncrement: Number(form.bidIncrement),
      });
      setMsg('✅ Saved!');
      setTimeout(()=>{ onSave(); onClose(); }, 800);
    } catch(e:any){
      setMsg('❌ '+( e.response?.data?.error||'Failed'));
    }
    setLoading(false);
  };

  // Extend helpers
  const extend = (hours:number) => {
    const current = new Date(form.endTime);
    setForm(f=>({...f, endTime: toLocal(new Date(current.getTime()+hours*3600000))}));
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold text-lg">Edit Auction</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-zinc-400 text-xs font-medium block mb-1">Title</label>
            <input value={form.title} onChange={setF('title')}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"/>
          </div>

          {/* Description */}
          <div>
            <label className="text-zinc-400 text-xs font-medium block mb-1">Description</label>
            <textarea value={form.description} onChange={setF('description')} rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 resize-none"/>
          </div>

          {/* Status */}
          <div>
            <label className="text-zinc-400 text-xs font-medium block mb-1">Status</label>
            <select value={form.status} onChange={setF('status')}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500">
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="ended">Ended</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <p className="text-zinc-600 text-xs mt-1">Change to "ended" to stop auction, "cancelled" to void it</p>
          </div>

          {/* End Time + Quick Extend */}
          <div>
            <label className="text-zinc-400 text-xs font-medium block mb-1">End Time</label>
            <input type="datetime-local" value={form.endTime} onChange={setF('endTime')}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"/>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-zinc-600 text-xs">Quick extend:</span>
              {[1,3,6,12,24].map(h=>(
                <button key={h} type="button" onClick={()=>extend(h)}
                  className="text-xs text-orange-400 hover:text-orange-300 bg-orange-950/30 hover:bg-orange-950/50 px-2 py-1 rounded-lg transition-colors">
                  +{h}h
                </button>
              ))}
            </div>
          </div>

          {/* Bid Increment */}
          <div>
            <label className="text-zinc-400 text-xs font-medium block mb-1">Bid Increment (₹)</label>
            <input type="number" value={form.bidIncrement} onChange={setF('bidIncrement')} min="1"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"/>
          </div>
        </div>

        {msg && (
          <div className={`mt-4 px-4 py-2.5 rounded-xl text-sm ${msg.startsWith('✅')?'bg-emerald-950/50 border border-emerald-800/50 text-emerald-400':'bg-red-950/50 border border-red-800/50 text-red-400'}`}>
            {msg}
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2.5 rounded-xl transition-colors text-sm">
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();

  const [tab, setTab]               = useState<'dashboard'|'create'|'auctions'|'users'|'fraud'>('dashboard');
  const [stats, setStats]           = useState<Stats|null>(null);
  const [users, setUsers]           = useState<User[]>([]);
  const [auctions, setAuctions]     = useState<Auction[]>([]);
  const [fraudLogs, setFraudLogs]   = useState<FraudLog[]>([]);
  const [editAuction, setEditAuction] = useState<Auction|null>(null);
  const [loading, setLoading]       = useState(false);
  const [msg, setMsg]               = useState('');
  const [auctionFilter, setAuctionFilter] = useState<'all'|'live'|'upcoming'|'ended'>('all');
  const [form, setForm] = useState<AuctionForm>({
    title:'', description:'', category:'electronics',
    startingPrice:'', bidIncrement:'500',
    startTime: nowLocal(), endTime: futureLocal(24), images:'',
  });

  // Auth guard
  useEffect(()=>{
    if(!_hasHydrated) return;
    if(!user){ router.push('/auth/login'); return; }
    if(user.role!=='admin'){ router.push('/'); return; }
    loadDashboard();
  },[_hasHydrated, user]);

  useEffect(()=>{
    if(tab==='users' && users.length===0) loadUsers();
    if(tab==='fraud' && fraudLogs.length===0) loadFraud();
    if(tab==='auctions') loadAuctions();
  },[tab]);

  const loadDashboard = async()=>{
    try{ const {data}=await api.get('/admin/dashboard'); setStats(data.stats); }
    catch(e:any){ setMsg(e.response?.data?.error||'Failed'); }
  };
  const loadUsers    = async()=>{ try{ const {data}=await api.get('/admin/users'); setUsers(data.users); }catch(_){} };
  const loadFraud    = async()=>{ try{ const {data}=await api.get('/admin/fraud-logs'); setFraudLogs(data.logs); }catch(_){} };
  const loadAuctions = async()=>{
    try{
      const {data}=await api.get('/auctions',{params:{status: auctionFilter==='all'?undefined:auctionFilter, limit:50}});
      setAuctions(data.auctions);
    }catch(_){}
  };

  useEffect(()=>{ if(tab==='auctions') loadAuctions(); },[auctionFilter]);

  const handleCreate = async(e:React.FormEvent)=>{
    e.preventDefault(); setLoading(true); setMsg('');
    try{
      const start = new Date(form.startTime);
      await api.post('/auctions',{
        title: form.title, description: form.description, category: form.category,
        startingPrice: Number(form.startingPrice), currentPrice: Number(form.startingPrice),
        bidIncrement: Number(form.bidIncrement),
        startTime: start.toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        originalEndTime: new Date(form.endTime).toISOString(),
        status: start<=new Date()?'live':'upcoming',
        images: form.images?[form.images]:[],
      });
      setMsg('✅ Auction created! Go to /auctions to see it.');
      setForm(f=>({...f,title:'',description:'',startingPrice:'',images:'',startTime:nowLocal(),endTime:futureLocal(24)}));
      loadDashboard();
    }catch(e:any){ setMsg('❌ '+(e.response?.data?.error||'Failed')); }
    setLoading(false);
  };

  const toggleUser   = async(id:string)=>{ try{ await api.patch(`/admin/users/${id}/toggle`); setUsers(prev=>prev.map(u=>u._id===id?{...u,isActive:!u.isActive}:u)); }catch(_){} };
  const resolveFraud = async(id:string)=>{ try{ await api.patch(`/admin/fraud-logs/${id}/resolve`,{action:'dismissed'}); setFraudLogs(prev=>prev.map(l=>l._id===id?{...l,isResolved:true}:l)); }catch(_){} };

  const setF=(k:keyof AuctionForm)=>(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>)=>setForm(f=>({...f,[k]:e.target.value}));

  const STATUS_COLORS:Record<string,string>={
    live:      'bg-emerald-950/60 text-emerald-400',
    upcoming:  'bg-blue-950/60 text-blue-400',
    ended:     'bg-zinc-800 text-zinc-500',
    cancelled: 'bg-red-950/60 text-red-400',
    draft:     'bg-zinc-800 text-zinc-500',
  };

  const filteredAuctions = auctionFilter==='all' ? auctions : auctions.filter(a=>a.status===auctionFilter);

  if(!_hasHydrated){
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"/></div>;
  }
  if(!user||user.role!=='admin'){
    return <div className="min-h-screen flex items-center justify-center"><div className="text-center space-y-4"><p className="text-zinc-400">Admin access required.</p><a href="/auth/login" className="inline-block bg-orange-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm">Login as Admin</a></div></div>;
  }

  const TABS=[
    {id:'dashboard',label:'📊 Dashboard'},
    {id:'create',   label:'➕ Create'},
    {id:'auctions', label:'🏷️ Auctions'},
    {id:'users',    label:'👥 Users'},
    {id:'fraud',    label:'🛡️ Fraud'},
  ] as const;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {editAuction && (
        <EditModal
          auction={editAuction}
          onClose={()=>setEditAuction(null)}
          onSave={()=>{ loadAuctions(); loadDashboard(); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
          <p className="text-zinc-500 text-sm mt-1">Logged in as <span className="text-orange-400">{user.name}</span></p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
          <span className="text-zinc-400 text-xs">Online</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-zinc-800">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);setMsg('');}}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab===t.id?'text-orange-400 border-orange-500':'text-zinc-500 border-transparent hover:text-zinc-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {msg&&(
        <div className={`mb-6 px-4 py-3 rounded-xl text-sm border ${msg.startsWith('✅')?'bg-emerald-950/50 border-emerald-800/50 text-emerald-400':'bg-red-950/50 border-red-800/50 text-red-400'}`}>{msg}</div>
      )}

      {/* ── DASHBOARD ──────────────────────────────────── */}
      {tab==='dashboard'&&(
        <div className="space-y-8">
          {stats?(
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard label="Users"    value={stats.totalUsers}/>
                <StatCard label="Auctions" value={stats.totalAuctions} accent="text-blue-400"/>
                <StatCard label="Live"     value={stats.liveAuctions}  accent="text-emerald-400"/>
                <StatCard label="Bids"     value={stats.totalBids.toLocaleString()} accent="text-orange-400"/>
                <StatCard label="Fraud"    value={stats.fraudFlags} accent={stats.fraudFlags>0?'text-red-400':'text-emerald-400'}/>
                <StatCard label="Revenue"  value={`₹${(stats.totalRevenue||0).toLocaleString()}`} accent="text-violet-400"/>
              </div>
              <div className="grid md:grid-cols-4 gap-4">
                {[
                  {id:'create',   emoji:'➕', color:'orange', title:'Create Auction',  sub:'Add new item'},
                  {id:'auctions', emoji:'🏷️', color:'blue',   title:'Manage Auctions', sub:`${stats.liveAuctions} live now`},
                  {id:'users',    emoji:'👥', color:'blue',   title:'Manage Users',    sub:`${stats.totalUsers} total`},
                  {id:'fraud',    emoji:'🛡️', color:'red',    title:'Fraud Logs',      sub:stats.fraudFlags>0?`${stats.fraudFlags} unresolved!`:'All clear'},
                ].map(card=>(
                  <button key={card.id} onClick={()=>setTab(card.id as any)}
                    className={`border rounded-2xl p-5 text-left transition-colors ${
                      card.color==='orange'?'bg-orange-500/10 hover:bg-orange-500/20 border-orange-900/40':
                      card.color==='red'&&stats.fraudFlags>0?'bg-red-500/10 hover:bg-red-500/20 border-red-900/40':
                      'bg-zinc-900 hover:bg-zinc-800 border-zinc-800'
                    }`}>
                    <div className="text-2xl mb-2">{card.emoji}</div>
                    <p className={`font-semibold ${card.color==='orange'?'text-orange-300':card.color==='red'&&stats.fraudFlags>0?'text-red-300':'text-zinc-300'}`}>{card.title}</p>
                    <p className="text-zinc-500 text-xs mt-1">{card.sub}</p>
                  </button>
                ))}
              </div>
            </>
          ):(
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"/>
            </div>
          )}
        </div>
      )}

      {/* ── CREATE ─────────────────────────────────────── */}
      {tab==='create'&&(
        <div className="max-w-2xl">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold text-lg mb-6">Create New Auction</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-zinc-400 text-xs font-medium block mb-1.5">Title *</label>
                <input type="text" value={form.title} onChange={setF('title')} required placeholder="e.g. iPhone 16 Pro"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-zinc-600"/>
              </div>
              <div>
                <label className="text-zinc-400 text-xs font-medium block mb-1.5">Description *</label>
                <textarea value={form.description} onChange={setF('description')} required rows={3} placeholder="Describe the item..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-zinc-600 resize-none"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-400 text-xs font-medium block mb-1.5">Category *</label>
                  <select value={form.category} onChange={setF('category')}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500">
                    {CATS.map(c=><option key={c} value={c} className="bg-zinc-800 capitalize">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 text-xs font-medium block mb-1.5">Bid Increment (₹)</label>
                  <input type="number" value={form.bidIncrement} onChange={setF('bidIncrement')} min="1"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"/>
                </div>
              </div>
              <div>
                <label className="text-zinc-400 text-xs font-medium block mb-1.5">Starting Price (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">₹</span>
                  <input type="number" value={form.startingPrice} onChange={setF('startingPrice')} required min="1" placeholder="50000"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-7 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-zinc-600"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-400 text-xs font-medium block mb-1.5">Start Time *</label>
                  <input type="datetime-local" value={form.startTime} onChange={setF('startTime')} required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"/>
                  <button type="button" onClick={()=>setForm(f=>({...f,startTime:nowLocal()}))}
                    className="text-xs text-orange-400 mt-1 hover:underline">Set to now</button>
                </div>
                <div>
                  <label className="text-zinc-400 text-xs font-medium block mb-1.5">End Time *</label>
                  <input type="datetime-local" value={form.endTime} onChange={setF('endTime')} required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"/>
                  <div className="flex gap-2 mt-1">
                    {[1,6,24].map(h=>(
                      <button key={h} type="button" onClick={()=>setForm(f=>({...f,endTime:futureLocal(h)}))}
                        className="text-xs text-orange-400 hover:underline">+{h}h</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-zinc-400 text-xs font-medium block mb-1.5">Image URL (optional)</label>
                <input type="url" value={form.images} onChange={setF('images')} placeholder="https://images.unsplash.com/..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-zinc-600"/>
              </div>
              {form.images&&<div className="rounded-xl overflow-hidden h-28 bg-zinc-800 border border-zinc-700"><img src={form.images} alt="preview" className="w-full h-full object-cover"/></div>}
              <button type="submit" disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
                {loading?<span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Creating...</span>:'🏷️ Create Auction'}
              </button>
            </form>
          </div>
          <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-zinc-500 text-xs mb-3">Quick images:</p>
            <div className="space-y-1.5">
              {[
                {l:'MacBook',  u:'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600'},
                {l:'Watch',    u:'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600'},
                {l:'Camera',   u:'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600'},
                {l:'Sneakers', u:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'},
                {l:'Art',      u:'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600'},
              ].map(img=>(
                <button key={img.l} onClick={()=>setForm(f=>({...f,images:img.u}))}
                  className="w-full text-left text-xs text-zinc-400 hover:text-orange-400 transition-colors font-mono truncate">
                  [{img.l}] {img.u}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── AUCTIONS TAB (NEW) ──────────────────────────── */}
      {tab==='auctions'&&(
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
              {(['all','live','upcoming','ended'] as const).map(s=>(
                <button key={s} onClick={()=>setAuctionFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${auctionFilter===s?'bg-orange-500 text-white':'text-zinc-400 hover:text-white'}`}>
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-zinc-500 text-sm">{filteredAuctions.length} auctions</span>
              <button onClick={loadAuctions} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">↻ Refresh</button>
            </div>
          </div>

          {filteredAuctions.length===0?(
            <div className="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-2xl">
              <p className="text-4xl mb-3">🏷️</p>
              <p className="text-zinc-400 font-medium">No auctions found</p>
              <button onClick={()=>setTab('create')} className="mt-4 text-orange-400 text-sm hover:underline">Create one →</button>
            </div>
          ):(
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      {['Auction','Status','Current Price','Bids','End Time','Actions'].map(h=>(
                        <th key={h} className="text-left px-5 py-3 text-zinc-500 text-xs font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredAuctions.map(a=>{
                      const timeLeft = Math.max(0, Math.floor((new Date(a.endTime).getTime()-Date.now())/1000));
                      const tStr = timeLeft===0?'Ended':timeLeft<60?`${timeLeft}s`:timeLeft<3600?`${Math.floor(timeLeft/60)}m`:timeLeft<86400?`${Math.floor(timeLeft/3600)}h ${Math.floor((timeLeft%3600)/60)}m`:`${Math.floor(timeLeft/86400)}d`;
                      return (
                        <tr key={a._id} className="hover:bg-zinc-800/40 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              {a.images?.[0]&&(
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                                  <img src={a.images[0]} alt="" className="w-full h-full object-cover"/>
                                </div>
                              )}
                              <div>
                                <p className="text-white text-sm font-medium max-w-xs truncate">{a.title}</p>
                                <p className="text-zinc-500 text-xs capitalize">{a.category}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[a.status]||'bg-zinc-800 text-zinc-400'}`}>
                              {a.status==='live'&&<span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block mr-1 animate-pulse"/>}
                              {a.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="text-white font-semibold text-sm tabular-nums">₹{a.currentPrice.toLocaleString()}</p>
                            <p className="text-zinc-600 text-xs">start: ₹{a.startingPrice.toLocaleString()}</p>
                          </td>
                          <td className="px-5 py-3.5 text-zinc-300 text-sm tabular-nums">{a.bidCount}</td>
                          <td className="px-5 py-3.5">
                            <p className={`text-sm font-mono font-medium ${timeLeft<300&&a.status==='live'?'text-red-400':timeLeft<3600&&a.status==='live'?'text-orange-400':'text-zinc-400'}`}>{tStr}</p>
                            <p className="text-zinc-600 text-xs">{new Date(a.endTime).toLocaleDateString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              {/* Edit button */}
                              <button onClick={()=>setEditAuction(a)}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors">
                                ✏️ Edit
                              </button>
                              {/* View button */}
                              <a href={`/auctions/${a._id}`} target="_blank"
                                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white transition-colors">
                                👁️
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-500 text-xs font-medium mb-2">Edit options available:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-zinc-500">
              <div>✏️ <span className="text-zinc-400">Change title/description</span></div>
              <div>⏰ <span className="text-zinc-400">Extend end time (+1h to +24h)</span></div>
              <div>📋 <span className="text-zinc-400">Change status (live/ended/cancelled)</span></div>
              <div>💰 <span className="text-zinc-400">Update bid increment</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ── USERS ──────────────────────────────────────── */}
      {tab==='users'&&(
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-zinc-400 text-sm">{users.length} total users</p>
            <button onClick={loadUsers} className="text-xs text-zinc-500 hover:text-zinc-300">↻ Refresh</button>
          </div>
          {users.length===0?(
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"/></div>
          ):(
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      {['User','Role','Bids','Wins','Joined','Status','Action'].map(h=>(
                        <th key={h} className="text-left px-5 py-3 text-zinc-500 text-xs font-medium uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {users.map(u=>(
                      <tr key={u._id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">{u.name?.[0]?.toUpperCase()||'?'}</div>
                            <div><p className="text-white text-sm font-medium">{u.name}</p><p className="text-zinc-500 text-xs">{u.email}</p></div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.role==='admin'?'bg-orange-950/60 text-orange-400':'bg-zinc-800 text-zinc-400'}`}>{u.role}</span></td>
                        <td className="px-5 py-3.5 text-zinc-300 text-sm tabular-nums">{u.totalBids||0}</td>
                        <td className="px-5 py-3.5 text-zinc-300 text-sm tabular-nums">{u.totalWins||0}</td>
                        <td className="px-5 py-3.5 text-zinc-500 text-xs">{new Date(u.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
                        <td className="px-5 py-3.5"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.isActive?'bg-emerald-950/60 text-emerald-400':'bg-red-950/60 text-red-400'}`}>{u.isActive?'Active':'Suspended'}</span></td>
                        <td className="px-5 py-3.5">
                          {u.role!=='admin'&&(
                            <button onClick={()=>toggleUser(u._id)}
                              className={`text-xs font-medium px-3 py-1 rounded-lg border transition-colors ${u.isActive?'border-red-800/50 text-red-400 hover:bg-red-950/50':'border-emerald-800/50 text-emerald-400 hover:bg-emerald-950/50'}`}>
                              {u.isActive?'Suspend':'Activate'}
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

      {/* ── FRAUD ──────────────────────────────────────── */}
      {tab==='fraud'&&(
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-zinc-400 text-sm">{fraudLogs.filter(l=>!l.isResolved).length} unresolved <span className="text-zinc-600">/ {fraudLogs.length} total</span></p>
            <button onClick={loadFraud} className="text-xs text-zinc-500 hover:text-zinc-300">↻ Refresh</button>
          </div>
          {fraudLogs.length===0?(
            <div className="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-2xl">
              <p className="text-4xl mb-3">🛡️</p>
              <p className="text-zinc-400 font-medium">No fraud logs yet</p>
              <p className="text-zinc-600 text-sm mt-1">Place rapid bids to trigger detection</p>
            </div>
          ):(
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      {['User','Type','Auction','Risk','Time','Status','Action'].map(h=>(
                        <th key={h} className="text-left px-5 py-3 text-zinc-500 text-xs font-medium uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {fraudLogs.map(log=>(
                      <tr key={log._id} className={`hover:bg-zinc-800/40 transition-colors ${!log.isResolved?'bg-red-950/10':''}`}>
                        <td className="px-5 py-3.5"><p className="text-white text-sm font-medium">{log.user?.name||'Unknown'}</p><p className="text-zinc-500 text-xs">{log.user?.email||''}</p></td>
                        <td className="px-5 py-3.5"><span className="text-xs font-medium text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-full">{FRAUD_LABELS[log.type]||log.type}</span></td>
                        <td className="px-5 py-3.5 text-zinc-400 text-xs max-w-xs truncate">{log.auction?.title||'N/A'}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-14 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${log.riskScore>=70?'bg-red-500':log.riskScore>=40?'bg-amber-500':'bg-emerald-500'}`} style={{width:`${log.riskScore}%`}}/>
                            </div>
                            <span className={`text-xs font-bold tabular-nums ${log.riskScore>=70?'text-red-400':log.riskScore>=40?'text-amber-400':'text-emerald-400'}`}>{log.riskScore}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-zinc-500 text-xs">{new Date(log.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
                        <td className="px-5 py-3.5"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${log.isResolved?'bg-zinc-800 text-zinc-500':'bg-red-950/60 text-red-400'}`}>{log.isResolved?'Resolved':'Pending'}</span></td>
                        <td className="px-5 py-3.5">
                          {!log.isResolved&&(
                            <button onClick={()=>resolveFraud(log._id)} className="text-xs font-medium px-3 py-1 rounded-lg border border-emerald-800/50 text-emerald-400 hover:bg-emerald-950/50 transition-colors">Resolve</button>
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
    </div>
  );
}