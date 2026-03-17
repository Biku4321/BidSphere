'use client';
import { useAuctionStore } from '@/store';
import { Crown, TrendingUp } from 'lucide-react';

const RANK_ICONS = ['🥇', '🥈', '🥉'];

export function Leaderboard() {
  const { topBids, recentBids } = useAuctionStore();

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown size={16} className="text-amber-400" />
          <span className="text-white font-semibold text-sm">Leaderboard</span>
        </div>
        <div className="live-dot text-zinc-400 text-xs">Live</div>
      </div>

      {topBids.length === 0 ? (
        <div className="px-5 py-8 text-center text-zinc-600 text-sm">
          No bids yet — be the first!
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/60">
          {topBids.slice(0, 10).map((bid, i) => (
            <div
              key={bid._id}
              className={`flex items-center gap-3 px-5 py-3 transition-colors ${i === 0 ? 'bg-amber-950/20' : 'hover:bg-zinc-800/40'}`}
            >
              {/* Rank */}
              <div className="w-7 text-center">
                {i < 3 ? (
                  <span className="text-base">{RANK_ICONS[i]}</span>
                ) : (
                  <span className="text-zinc-600 text-xs font-mono">#{i + 1}</span>
                )}
              </div>

              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
                {bid.bidder?.name?.[0]?.toUpperCase() || '?'}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${i === 0 ? 'text-amber-300' : 'text-zinc-200'}`}>
                  {bid.bidder?.name || 'Anonymous'}
                </p>
              </div>

              {/* Amount */}
              <div className="text-right shrink-0">
                <p className={`text-sm font-bold tabular-nums ${i === 0 ? 'text-amber-400' : 'text-white'}`}>
                  ₹{bid.amount.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent activity feed */}
      {recentBids.length > 0 && (
        <div className="border-t border-zinc-800">
          <div className="px-5 py-3 flex items-center gap-2">
            <TrendingUp size={13} className="text-zinc-500" />
            <span className="text-zinc-500 text-xs uppercase tracking-widest">Recent Activity</span>
          </div>
          <div className="px-5 pb-4 space-y-1.5 max-h-36 overflow-y-auto">
            {recentBids.slice(0, 8).map((bid) => (
              <div key={bid._id} className="flex items-center gap-2 text-xs animate-slide-up">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                <span className="text-zinc-400 truncate">
                  <span className="text-zinc-200 font-medium">{bid.bidder?.name}</span>
                  {' '}bid{' '}
                  <span className="text-orange-400 font-semibold">₹{bid.amount.toLocaleString()}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
