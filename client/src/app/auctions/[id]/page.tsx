'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuctionStore } from '@/store';
import { BidPanel } from '@/components/BidPanel';
import { Leaderboard } from '@/components/Leaderboard';
import { CountdownTimer } from '@/components/CountdownTimer';
import { AIInsightPanel } from '@/components/AIInsightPanel';
import { useAuctionSocket } from '@/hooks/useAuctionSocket';
import { Tag, User, BarChart2, AlertTriangle } from 'lucide-react';

export default function AuctionPage() {
  const { id } = useParams<{ id: string }>();
  const [auction, setAuction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { reset, setTopBids, setTimer } = useAuctionStore();

  // Connect socket
  useAuctionSocket(id);

  useEffect(() => {
    reset();
    const load = async () => {
      try {
        const { data } = await api.get(`/auctions/${id}`);
        setAuction(data.auction);
        setTopBids(data.topBids);
        // Init store from server state
        useAuctionStore.setState({
          currentPrice: data.auction.currentPrice,
          bidCount: data.auction.bidCount,
          endTime: data.auction.endTime,
          secondsLeft: Math.max(0, Math.floor((new Date(data.auction.endTime).getTime() - Date.now()) / 1000)),
          isEnded: data.auction.status === 'ended',
          winner: data.auction.winner,
        });
      } catch (_) {}
      setLoading(false);
    };
    load();
    return () => reset();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-6 animate-pulse">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-80 bg-zinc-900 rounded-2xl border border-zinc-800" />
            <div className="h-40 bg-zinc-900 rounded-2xl border border-zinc-800" />
          </div>
          <div className="space-y-4">
            <div className="h-48 bg-zinc-900 rounded-2xl border border-zinc-800" />
            <div className="h-48 bg-zinc-900 rounded-2xl border border-zinc-800" />
          </div>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center text-zinc-500">
        Auction not found.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Left: Auction details */}
        <div className="lg:col-span-2 space-y-5">

          {/* Image */}
          <div className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800">
            {auction.images?.[0] ? (
              <img src={auction.images[0]} alt={auction.title} className="w-full h-80 object-cover" />
            ) : (
              <div className="w-full h-80 flex items-center justify-center text-zinc-700 text-6xl">🏷️</div>
            )}

            {/* Fraud warning */}
            {auction.fraudRiskLevel === 'high' && (
              <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-red-950/90 border border-red-800 text-red-300 text-xs font-medium px-3 py-2 rounded-xl">
                <AlertTriangle size={13} />
                Suspicious bidding activity detected on this auction
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-2xl font-bold text-white leading-snug">{auction.title}</h1>
              <CountdownTimer />
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="flex items-center gap-1 text-xs text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-full border border-zinc-700">
                <Tag size={10} /> {auction.category}
              </span>
              <span className="flex items-center gap-1 text-xs text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-full border border-zinc-700">
                <User size={10} /> by {auction.createdBy?.name}
              </span>
              <span className="flex items-center gap-1 text-xs text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-full border border-zinc-700">
                <BarChart2 size={10} /> {auction.bidCount} bids
              </span>
            </div>

            <p className="text-zinc-400 text-sm leading-relaxed">{auction.description}</p>

            {/* Pricing details */}
            <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-zinc-800">
              <div>
                <p className="text-zinc-600 text-xs mb-1">Starting Price</p>
                <p className="text-zinc-300 font-semibold text-sm">₹{auction.startingPrice.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-zinc-600 text-xs mb-1">Bid Increment</p>
                <p className="text-zinc-300 font-semibold text-sm">₹{auction.bidIncrement.toLocaleString()}</p>
              </div>
              {auction.buyNowPrice && (
                <div>
                  <p className="text-zinc-600 text-xs mb-1">Buy Now</p>
                  <p className="text-orange-400 font-semibold text-sm">₹{auction.buyNowPrice.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Leaderboard (large screen goes here) */}
          <div className="lg:hidden">
            <Leaderboard />
          </div>
        </div>

        {/* Right: Bid panel + AI + Leaderboard */}
        <div className="space-y-5">
          <BidPanel
            auctionId={id}
            bidIncrement={auction.bidIncrement}
            startingPrice={auction.startingPrice}
          />
          <AIInsightPanel auctionId={id} />
          <div className="hidden lg:block">
            <Leaderboard />
          </div>
        </div>
      </div>
    </div>
  );
}
