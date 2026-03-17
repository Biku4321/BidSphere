'use client';
import { useState } from 'react';
import { useAuctionStore, useAuthStore } from '@/store';
import { useAuctionSocket } from '@/hooks/useAuctionSocket';
import { Zap, TrendingUp, Lock, ChevronUp } from 'lucide-react';
import api from '@/lib/api';

interface BidPanelProps {
  auctionId: string;
  bidIncrement: number;
  startingPrice: number;
}

export function BidPanel({ auctionId, bidIncrement, startingPrice }: BidPanelProps) {
  const { currentPrice, bidCount, isEnded, winner } = useAuctionStore();
  const { user, wallet, refreshWallet } = useAuthStore();
  const { placeBid, setAutoBid } = useAuctionSocket(auctionId);

  const [bidAmount, setBidAmount] = useState('');
  const [autoBidMax, setAutoBidMax] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);
  const [autoBidActive, setAutoBidActive] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState<'manual' | 'auto'>('manual');

  const minBid = currentPrice + bidIncrement;
  const balance = (wallet?.balance || 0) - (wallet?.lockedBalance || 0);
  const canAfford = balance >= minBid;

  const quickBids = [
    minBid,
    minBid + bidIncrement,
    minBid + bidIncrement * 3,
    minBid + bidIncrement * 10,
  ];

  const handleBid = async (amount?: number) => {
    const finalAmount = amount ?? Number(bidAmount);
    if (!finalAmount || finalAmount < minBid) {
      setError(`Minimum bid is ₹${minBid.toLocaleString()}`);
      return;
    }
    if (finalAmount > balance) {
      setError('Insufficient credits in wallet');
      return;
    }
    setError('');
    setIsPlacing(true);
    try {
      await placeBid(finalAmount);
      setSuccess(`Bid of ₹${finalAmount.toLocaleString()} placed!`);
      setBidAmount('');
      await refreshWallet();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Bid failed. Try again.');
    } finally {
      setIsPlacing(false);
    }
  };

  const handleAutoBid = async () => {
    const max = Number(autoBidMax);
    if (!max || max < minBid) {
      setError(`Auto-bid max must be at least ₹${minBid.toLocaleString()}`);
      return;
    }
    setError('');
    try {
      await setAutoBid(max);
      setAutoBidActive(true);
      setSuccess(`Auto-bid active up to ₹${max.toLocaleString()}`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (isEnded) {
    return (
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 text-center">
        {winner ? (
          <>
            <div className="text-3xl mb-3">🏆</div>
            <p className="text-white font-semibold text-lg">Auction Ended</p>
            <p className="text-zinc-400 text-sm mt-1">
              Won by <span className="text-orange-400 font-medium">{winner.name}</span> for{' '}
              <span className="text-white font-bold">₹{winner.amount?.toLocaleString()}</span>
            </p>
          </>
        ) : (
          <p className="text-zinc-400">Auction ended with no winner.</p>
        )}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 text-center">
        <Lock size={28} className="text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-300 font-medium mb-1">Sign in to bid</p>
        <p className="text-zinc-500 text-sm mb-4">Create a free account to participate</p>
        <a href="/auth/login" className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors">
          Sign In
        </a>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-zinc-800">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-zinc-400 text-xs uppercase tracking-widest">Current Bid</span>
          <span className="text-zinc-500 text-xs">{bidCount} bids</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white tabular-nums">
            ₹{currentPrice.toLocaleString()}
          </span>
          <span className="text-emerald-400 text-sm flex items-center gap-0.5">
            <ChevronUp size={14} />
            {(((currentPrice - startingPrice) / startingPrice) * 100).toFixed(1)}%
          </span>
        </div>

        {/* Wallet balance */}
        <div className="flex items-center gap-1.5 mt-2.5">
          <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${canAfford ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
            Wallet: ₹{balance.toLocaleString()}
          </div>
          {autoBidActive && (
            <div className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 flex items-center gap-1">
              <Zap size={10} /> Auto-bid ON
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {(['manual', 'auto'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-sm py-2.5 font-medium transition-colors ${
              tab === t ? 'text-orange-400 border-b-2 border-orange-500' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t === 'manual' ? 'Manual Bid' : 'Auto-Bid'}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-4">
        {tab === 'manual' ? (
          <>
            {/* Quick bid buttons */}
            <div>
              <p className="text-zinc-500 text-xs mb-2">Quick bid</p>
              <div className="grid grid-cols-2 gap-2">
                {quickBids.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => handleBid(amt)}
                    disabled={isPlacing || amt > balance}
                    className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-lg transition-colors border border-zinc-700 hover:border-zinc-600"
                  >
                    ₹{amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom bid input */}
            <div>
              <p className="text-zinc-500 text-xs mb-2">Custom amount</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">₹</span>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={minBid.toString()}
                    min={minBid}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-7 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-zinc-600"
                    onKeyDown={(e) => e.key === 'Enter' && handleBid()}
                  />
                </div>
                <button
                  onClick={() => handleBid()}
                  disabled={isPlacing || !canAfford}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {isPlacing ? (
                    <span className="animate-spin text-base">⟳</span>
                  ) : (
                    <><TrendingUp size={15} /> Bid</>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-blue-950/30 border border-blue-900/40 rounded-xl p-4">
              <p className="text-blue-300 text-sm font-medium mb-1 flex items-center gap-1.5">
                <Zap size={14} /> How Auto-Bid works
              </p>
              <p className="text-blue-400/70 text-xs leading-relaxed">
                Set a maximum amount. BidSphere will automatically bid the minimum increment needed to keep you winning — up to your limit.
              </p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-2">Maximum bid limit</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">₹</span>
                  <input
                    type="number"
                    value={autoBidMax}
                    onChange={(e) => setAutoBidMax(e.target.value)}
                    placeholder={`e.g. ${(minBid * 5).toLocaleString()}`}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-7 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-zinc-600"
                  />
                </div>
                <button
                  onClick={handleAutoBid}
                  disabled={autoBidActive}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Zap size={14} />
                  {autoBidActive ? 'Active' : 'Set'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Feedback */}
        {error && (
          <div className="bg-red-950/50 border border-red-800/50 text-red-400 text-xs rounded-lg px-3 py-2 animate-fade-in">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-950/50 border border-emerald-800/50 text-emerald-400 text-xs rounded-lg px-3 py-2 animate-fade-in">
            {success}
          </div>
        )}

        <p className="text-zinc-600 text-xs text-center">
          Min increment: ₹{bidIncrement.toLocaleString()} · Your bid is binding
        </p>
      </div>
    </div>
  );
}
