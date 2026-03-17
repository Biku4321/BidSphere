'use client';
import { useState, useEffect } from 'react';
import { Brain, TrendingUp, Target, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import api from '@/lib/api';
import { useAuctionStore } from '@/store';

interface AIInsights {
  prediction?: {
    predicted_price: number;
    lower_bound: number;
    upper_bound: number;
    confidence: number;
    price_increase_pct: number;
    insight: string;
  };
  strategy?: {
    recommendation: string;
    suggested_bid: number | null;
    winning_probability: number | null;
    urgency: string;
    message: string;
    tips: string[];
  };
}

const URGENCY_COLORS: Record<string, string> = {
  low:      'text-emerald-400 bg-emerald-950/40 border-emerald-900/40',
  medium:   'text-blue-400 bg-blue-950/40 border-blue-900/40',
  high:     'text-orange-400 bg-orange-950/40 border-orange-900/40',
  critical: 'text-red-400 bg-red-950/40 border-red-900/40',
};

const REC_LABELS: Record<string, string> = {
  wait:       '⏳ Wait',
  bid_now:    '⚡ Bid Now',
  bid_soon:   '🎯 Bid Soon',
  aggressive: '🔥 Go Aggressive',
  snipe:      '🎯 Snipe',
};

export function AIInsightPanel({ auctionId }: { auctionId: string }) {
  const [insights, setInsights] = useState<AIInsights>({});
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const { currentPrice } = useAuctionStore();

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const [predRes, stratRes] = await Promise.allSettled([
        api.get(`/ai/predict/${auctionId}`),
        api.get(`/ai/strategy/${auctionId}`),
      ]);
      setInsights({
        prediction: predRes.status === 'fulfilled' ? predRes.value.data : undefined,
        strategy:   stratRes.status === 'fulfilled' ? stratRes.value.data : undefined,
      });
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchInsights();
    const interval = setInterval(fetchInsights, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [auctionId]);

  const { prediction, strategy } = insights;

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-violet-400" />
          <span className="text-white font-semibold text-sm">AI Insights</span>
          {loading && <span className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />}
        </div>
        {expanded ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
      </button>

      {expanded && (
        <div className="border-t border-zinc-800 divide-y divide-zinc-800/60">

          {/* Price Prediction */}
          {prediction && (
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-1.5 text-zinc-400 text-xs uppercase tracking-widest">
                <TrendingUp size={12} />
                Price Forecast
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-violet-300 tabular-nums">
                  ₹{Math.round(prediction.predicted_price).toLocaleString()}
                </span>
                <span className={`text-xs font-medium ${prediction.price_increase_pct > 0 ? 'text-orange-400' : 'text-zinc-500'}`}>
                  +{prediction.price_increase_pct}% expected
                </span>
              </div>

              {/* Confidence bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-zinc-600 text-xs">Confidence</span>
                  <span className="text-zinc-400 text-xs font-medium">{Math.round(prediction.confidence * 100)}%</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full transition-all duration-700"
                    style={{ width: `${prediction.confidence * 100}%` }}
                  />
                </div>
              </div>

              {/* Range */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-800/60 rounded-lg px-3 py-2">
                  <p className="text-zinc-600 text-[10px] mb-0.5">Low estimate</p>
                  <p className="text-zinc-300 text-xs font-semibold tabular-nums">₹{Math.round(prediction.lower_bound).toLocaleString()}</p>
                </div>
                <div className="bg-zinc-800/60 rounded-lg px-3 py-2">
                  <p className="text-zinc-600 text-[10px] mb-0.5">High estimate</p>
                  <p className="text-zinc-300 text-xs font-semibold tabular-nums">₹{Math.round(prediction.upper_bound).toLocaleString()}</p>
                </div>
              </div>

              <p className="text-zinc-500 text-xs leading-relaxed">{prediction.insight}</p>
            </div>
          )}

          {/* Strategy Recommendation */}
          {strategy && (
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-1.5 text-zinc-400 text-xs uppercase tracking-widest">
                <Target size={12} />
                Strategy
              </div>

              {/* Urgency badge */}
              <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border ${URGENCY_COLORS[strategy.urgency] || URGENCY_COLORS.low}`}>
                {REC_LABELS[strategy.recommendation] || strategy.recommendation}
                <span className="opacity-60">·</span>
                <span className="capitalize opacity-80">{strategy.urgency} urgency</span>
              </div>

              <p className="text-zinc-300 text-xs leading-relaxed">{strategy.message}</p>

              {strategy.suggested_bid && (
                <div className="bg-zinc-800/60 rounded-lg px-3 py-2.5 flex items-center justify-between">
                  <span className="text-zinc-500 text-xs">Suggested bid</span>
                  <span className="text-white text-sm font-bold tabular-nums">₹{strategy.suggested_bid.toLocaleString()}</span>
                </div>
              )}

              {strategy.winning_probability !== null && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-zinc-600 text-xs">Win probability</span>
                    <span className="text-emerald-400 text-xs font-medium">
                      {Math.round((strategy.winning_probability || 0) * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-700 to-emerald-400 rounded-full transition-all duration-700"
                      style={{ width: `${(strategy.winning_probability || 0) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Tips */}
              {strategy.tips.length > 0 && (
                <div className="space-y-1.5">
                  {strategy.tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-zinc-500">
                      <Lightbulb size={11} className="text-amber-500 mt-0.5 shrink-0" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!prediction && !strategy && !loading && (
            <div className="px-5 py-6 text-center text-zinc-600 text-sm">
              AI insights unavailable right now.
            </div>
          )}

          {/* Refresh button */}
          <div className="px-5 py-3">
            <button
              onClick={fetchInsights}
              disabled={loading}
              className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1 disabled:opacity-40"
            >
              {loading ? 'Refreshing...' : '↻ Refresh insights'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
