'use client';
import Link from 'next/link';
import { Clock, TrendingUp, Users } from 'lucide-react';

interface Auction {
  _id: string;
  title: string;
  description: string;
  category: string;
  images: string[];
  currentPrice: number;
  startingPrice: number;
  endTime: string;
  status: string;
  bidCount: number;
  createdBy?: { name: string };
}

interface AuctionCardProps {
  auction: Auction;
}

function useCountdown(endTime: string) {
  const diff = Math.max(0, Math.floor((new Date(endTime).getTime() - Date.now()) / 1000));
  if (diff === 0) return 'Ended';
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
  return `${Math.floor(diff / 86400)}d`;
}

const CATEGORY_COLORS: Record<string, string> = {
  electronics:  'text-blue-400 bg-blue-950/60',
  collectibles: 'text-amber-400 bg-amber-950/60',
  art:          'text-violet-400 bg-violet-950/60',
  fashion:      'text-pink-400 bg-pink-950/60',
  vehicles:     'text-cyan-400 bg-cyan-950/60',
  'real-estate':'text-emerald-400 bg-emerald-950/60',
  other:        'text-zinc-400 bg-zinc-800/60',
};

export function AuctionCard({ auction }: AuctionCardProps) {
  const timeLeft = useCountdown(auction.endTime);
  const priceGain = (((auction.currentPrice - auction.startingPrice) / auction.startingPrice) * 100).toFixed(0);
  const isLive = auction.status === 'live';
  const isUrgent = isLive && (new Date(auction.endTime).getTime() - Date.now()) < 300000;

  return (
    <Link href={`/auctions/${auction._id}`}>
      <div className="auction-card group bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5">

        {/* Image */}
        <div className="relative h-44 bg-zinc-800 overflow-hidden">
          {auction.images?.[0] ? (
            <img
              src={auction.images[0]}
              alt={auction.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-700 text-4xl">
              🏷️
            </div>
          )}

          {/* Status badge */}
          <div className="absolute top-3 left-3">
            {isLive ? (
              <span className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-900/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            ) : auction.status === 'upcoming' ? (
              <span className="bg-black/70 backdrop-blur-sm text-blue-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-900/50">
                UPCOMING
              </span>
            ) : (
              <span className="bg-black/70 backdrop-blur-sm text-zinc-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                ENDED
              </span>
            )}
          </div>

          {/* Time remaining */}
          {isLive && (
            <div className={`absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-xs font-mono font-bold px-2.5 py-1 rounded-full ${isUrgent ? 'text-red-400 border border-red-800/50 animate-pulse' : 'text-white'}`}>
              {timeLeft}
            </div>
          )}

          {/* Category */}
          <div className="absolute bottom-3 left-3">
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${CATEGORY_COLORS[auction.category] || CATEGORY_COLORS.other}`}>
              {auction.category}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-white font-semibold text-sm leading-snug mb-3 line-clamp-2 group-hover:text-orange-300 transition-colors">
            {auction.title}
          </h3>

          {/* Price row */}
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-0.5">Current Bid</p>
              <p className="text-white font-bold text-lg tabular-nums">₹{auction.currentPrice.toLocaleString()}</p>
            </div>
            {Number(priceGain) > 0 && (
              <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium bg-emerald-950/50 px-2 py-1 rounded-lg">
                <TrendingUp size={11} />
                +{priceGain}%
              </div>
            )}
          </div>

          {/* Footer stats */}
          <div className="flex items-center justify-between text-zinc-500 text-xs border-t border-zinc-800 pt-3">
            <div className="flex items-center gap-1">
              <Users size={11} />
              <span>{auction.bidCount} bids</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={11} />
              <span>{timeLeft}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
