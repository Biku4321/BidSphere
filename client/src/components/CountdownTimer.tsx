'use client';
import { useAuctionStore } from '@/store';
import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';

function formatTime(secs: number) {
  if (secs <= 0) return '00:00:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function CountdownTimer() {
  const { secondsLeft, antiSnipeExtended, isEnded } = useAuctionStore();
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (antiSnipeExtended) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 2000);
      return () => clearTimeout(t);
    }
  }, [antiSnipeExtended]);

  const urgency = secondsLeft < 30 ? 'critical' : secondsLeft < 120 ? 'warning' : 'normal';

  const colorMap = {
    critical: 'text-red-400',
    warning:  'text-orange-400',
    normal:   'text-emerald-400',
  };

  if (isEnded) {
    return (
      <div className="flex items-center gap-2 bg-zinc-800/60 rounded-xl px-4 py-3 border border-zinc-700">
        <span className="text-zinc-400 text-sm font-medium">Auction Ended</span>
      </div>
    );
  }

  return (
    <div className={`relative flex items-center gap-3 rounded-xl px-4 py-3 border transition-all duration-300
      ${urgency === 'critical' ? 'bg-red-950/40 border-red-800/50' : 'bg-zinc-800/60 border-zinc-700'}
      ${flash ? 'ring-2 ring-orange-500/60' : ''}
    `}>
      {antiSnipeExtended && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-orange-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
          <Zap size={9} />
          +30s Anti-Snipe
        </div>
      )}
      <div className="flex flex-col items-center">
        <span className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">Time Left</span>
        <span className={`font-mono text-2xl font-bold tabular-nums ${colorMap[urgency]} ${urgency === 'critical' ? 'animate-pulse-fast' : ''}`}>
          {formatTime(secondsLeft)}
        </span>
      </div>
    </div>
  );
}
