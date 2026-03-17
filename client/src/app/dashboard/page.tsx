'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store';

interface Bid {
  _id: string;
  amount: number;
  isWinning: boolean;
  createdAt: string;
  auction?: { _id: string; title: string; status: string; currentPrice: number; endTime: string; images: string[] };
}

const BADGE_INFO: Record<string, { emoji: string; label: string; color: string }> = {
  first_bid:     { emoji: '🎯', label: 'First Bid',     color: 'bg-blue-950/60 text-blue-400 border-blue-800/40' },
  top_bidder:    { emoji: '🏆', label: 'Top Bidder',    color: 'bg-amber-950/60 text-amber-400 border-amber-800/40' },
  auction_winner:{ emoji: '🥇', label: 'Auction Winner',color: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40' },
  power_bidder:  { emoji: '⚡', label: 'Power Bidder',  color: 'bg-violet-950/60 text-violet-400 border-violet-800/40' },
  legend:        { emoji: '👑', label: 'Legend',         color: 'bg-orange-950/60 text-orange-400 border-orange-800/40' },
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, wallet, _hasHydrated, refreshWallet } = useAuthStore();
  const [myBids, setMyBids]   = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user) { router.push('/auth/login'); return; }
    loadData();
  }, [_hasHydrated, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bidsRes] = await Promise.all([
        api.get('/bids/my'),
        refreshWallet(),
      ]);
      setMyBids(bidsRes.data.bids || []);
    } catch (_) {}
    setLoading(false);
  };

  if (!_hasHydrated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const balance      = (wallet?.balance || 0) - (wallet?.lockedBalance || 0);
  const winningBids  = myBids.filter(b => b.isWinning);
  const activeBids   = myBids.filter(b => b.auction?.status === 'live');
  const wonAuctions  = myBids.filter(b => b.auction?.status === 'ended' && b.isWinning);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-2xl font-bold text-orange-400">
            {user.name[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Hey, {user.name.split(' ')[0]}! 👋</h1>
            <p className="text-zinc-500 text-sm">{user.email}</p>
          </div>
        </div>
        {user.role === 'admin' && (
          <Link href="/admin"
            className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm font-medium px-4 py-2 rounded-xl hover:bg-orange-500/20 transition-colors">
            🔐 Admin Panel
          </Link>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Wallet Balance',  value: `₹${balance.toLocaleString()}`,     accent: 'text-emerald-400', sub: wallet?.lockedBalance ? `₹${wallet.lockedBalance.toLocaleString()} locked` : 'No active bids' },
          { label: 'Total Bids',      value: user.totalBids || myBids.length,    accent: 'text-orange-400',  sub: 'All time' },
          { label: 'Active Bids',     value: activeBids.length,                  accent: 'text-blue-400',    sub: 'Currently winning' },
          { label: 'Auctions Won',    value: user.totalWins || wonAuctions.length,accent:'text-amber-400',   sub: 'All time' },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">{s.label}</p>
            <p className={`text-2xl font-bold tabular-nums ${s.accent}`}>{s.value}</p>
            <p className="text-zinc-600 text-xs mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">

        {/* My Bids — main column */}
        <div className="lg:col-span-2 space-y-5">

          {/* Active bids */}
          {activeBids.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-white font-semibold text-sm">Active Bids</span>
                <span className="text-zinc-600 text-xs ml-1">({activeBids.length})</span>
              </div>
              <div className="divide-y divide-zinc-800/60">
                {activeBids.slice(0, 5).map(bid => (
                  <Link key={bid._id} href={`/auctions/${bid.auction?._id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-800/40 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 overflow-hidden shrink-0">
                      {bid.auction?.images?.[0]
                        ? <img src={bid.auction.images[0]} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-lg">🏷️</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{bid.auction?.title || 'Auction'}</p>
                      <p className="text-zinc-500 text-xs">
                        Current: ₹{bid.auction?.currentPrice?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-orange-400 font-bold text-sm tabular-nums">₹{bid.amount.toLocaleString()}</p>
                      <p className={`text-xs font-medium ${bid.isWinning ? 'text-emerald-400' : 'text-red-400'}`}>
                        {bid.isWinning ? '🏆 Winning' : '❌ Outbid'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* All bid history */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-white font-semibold text-sm">Bid History</span>
              <span className="text-zinc-600 text-xs">{myBids.length} total</span>
            </div>
            {myBids.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">🏷️</p>
                <p className="text-zinc-400 font-medium text-sm">No bids yet</p>
                <p className="text-zinc-600 text-xs mt-1">Find an auction and start bidding!</p>
                <Link href="/auctions"
                  className="inline-block mt-4 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors">
                  Browse Auctions →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60 max-h-96 overflow-y-auto">
                {myBids.map(bid => {
                  const statusColor =
                    bid.auction?.status === 'live' && bid.isWinning ? 'text-emerald-400' :
                    bid.auction?.status === 'live' && !bid.isWinning ? 'text-red-400' :
                    bid.auction?.status === 'ended' && bid.isWinning ? 'text-amber-400' :
                    'text-zinc-500';
                  const statusLabel =
                    bid.auction?.status === 'live' && bid.isWinning ? '🏆 Winning' :
                    bid.auction?.status === 'live' && !bid.isWinning ? '❌ Outbid' :
                    bid.auction?.status === 'ended' && bid.isWinning ? '🥇 Won!' :
                    bid.auction?.status === 'ended' ? 'Ended' : bid.auction?.status || '—';

                  return (
                    <Link key={bid._id} href={`/auctions/${bid.auction?._id}`}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-800/40 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-zinc-800 overflow-hidden shrink-0">
                        {bid.auction?.images?.[0]
                          ? <img src={bid.auction.images[0]} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-sm">🏷️</div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-zinc-200 text-sm truncate">{bid.auction?.title || 'Auction'}</p>
                        <p className="text-zinc-600 text-xs">{new Date(bid.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white text-sm font-semibold tabular-nums">₹{bid.amount.toLocaleString()}</p>
                        <p className={`text-xs font-medium ${statusColor}`}>{statusLabel}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">

          {/* Wallet quick card */}
          <div className="bg-gradient-to-br from-orange-950/30 to-zinc-900 border border-orange-900/30 rounded-2xl p-5">
            <p className="text-zinc-400 text-xs uppercase tracking-widest mb-1">Wallet</p>
            <p className="text-3xl font-bold text-white tabular-nums mb-1">₹{balance.toLocaleString()}</p>
            {(wallet?.lockedBalance || 0) > 0 && (
              <p className="text-zinc-500 text-xs mb-3">+ ₹{wallet?.lockedBalance?.toLocaleString()} locked in bids</p>
            )}
            <Link href="/wallet"
              className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm py-2.5 rounded-xl text-center transition-colors mt-3">
              Add Credits →
            </Link>
          </div>

          {/* Badges */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-white font-semibold text-sm mb-4">Badges</p>
            {user.badges && user.badges.length > 0 ? (
              <div className="space-y-2">
                {user.badges.map(badge => {
                  const info = BADGE_INFO[badge] || { emoji: '🏅', label: badge, color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
                  return (
                    <div key={badge} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border ${info.color}`}>
                      <span className="text-lg">{info.emoji}</span>
                      <span className="text-sm font-medium">{info.label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-4xl mb-2">🏅</p>
                <p className="text-zinc-500 text-xs">No badges yet</p>
                <p className="text-zinc-600 text-xs mt-1">Start bidding to earn badges!</p>
              </div>
            )}
            {/* Locked badges */}
            <div className="mt-3 space-y-1.5">
              {Object.entries(BADGE_INFO)
                .filter(([key]) => !user.badges?.includes(key))
                .slice(0, 3)
                .map(([key, info]) => (
                  <div key={key} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-zinc-800/40 opacity-40">
                    <span className="text-base grayscale">{info.emoji}</span>
                    <span className="text-xs text-zinc-500">{info.label}</span>
                    <span className="ml-auto text-zinc-700 text-xs">🔒</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-white font-semibold text-sm mb-3">Quick Links</p>
            <div className="space-y-2">
              {[
                { href: '/auctions',        label: '🏷️ Browse Auctions' },
                { href: '/wallet',          label: '💰 Wallet & Credits' },
                { href: '/auctions?status=live', label: '⚡ Live Auctions' },
              ].map(l => (
                <Link key={l.href} href={l.href}
                  className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm px-3 py-2 rounded-xl hover:bg-zinc-800 transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}