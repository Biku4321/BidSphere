'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store';
import { Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';

const TOPUP_PRESETS = [500, 1000, 2500, 5000, 10000];

const TX_ICONS: Record<string, any> = {
  credit_purchase: { icon: Plus,          color: 'text-emerald-400 bg-emerald-950/50' },
  bid_placed:      { icon: ArrowUpRight,  color: 'text-orange-400 bg-orange-950/50'  },
  bid_refund:      { icon: ArrowDownLeft, color: 'text-blue-400 bg-blue-950/50'      },
  win_deduction:   { icon: ArrowUpRight,  color: 'text-red-400 bg-red-950/50'        },
  admin_credit:    { icon: Plus,          color: 'text-violet-400 bg-violet-950/50'  },
};

export default function WalletPage() {
  const { wallet, refreshWallet } = useAuthStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const balance = (wallet?.balance || 0) - (wallet?.lockedBalance || 0);

  useEffect(() => {
    refreshWallet();
    api.get('/wallet/transactions').then(({ data }) => setTransactions(data.transactions));
  }, []);

  const handleTopUp = async (amount: number) => {
    if (!amount || amount <= 0) return;
    setLoading(true);
    setMsg('');
    try {
      const { data } = await api.post('/wallet/add-credits', { amount });
      setMsg(data.message);
      await refreshWallet();
      const { data: txData } = await api.get('/wallet/transactions');
      setTransactions(txData.transactions);
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'Top-up failed');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">My Wallet</h1>

      {/* Balance card */}
      <div className="bg-gradient-to-br from-orange-950/40 to-zinc-900 border border-orange-900/30 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-3">
          <WalletIcon size={15} />
          Available Balance
        </div>
        <p className="text-4xl font-bold text-white tabular-nums mb-1">₹{balance.toLocaleString()}</p>
        {(wallet?.lockedBalance || 0) > 0 && (
          <p className="text-zinc-500 text-sm">₹{wallet?.lockedBalance?.toLocaleString()} locked in active bids</p>
        )}
      </div>

      {/* Top-up section */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 mb-6">
        <h2 className="text-white font-semibold mb-4">Add Credits</h2>

        <div className="grid grid-cols-5 gap-2 mb-4">
          {TOPUP_PRESETS.map((amt) => (
            <button
              key={amt}
              onClick={() => handleTopUp(amt)}
              disabled={loading}
              className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              ₹{amt >= 1000 ? `${amt / 1000}K` : amt}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">₹</span>
            <input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="Custom amount"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-7 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-zinc-600"
            />
          </div>
          <button
            onClick={() => handleTopUp(Number(customAmount))}
            disabled={loading || !customAmount}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold text-sm px-5 rounded-xl transition-colors"
          >
            {loading ? '...' : 'Add'}
          </button>
        </div>

        {msg && (
          <p className={`text-xs mt-3 ${msg.includes('successfully') || msg.includes('added') ? 'text-emerald-400' : 'text-red-400'}`}>
            {msg}
          </p>
        )}

        <p className="text-zinc-600 text-xs mt-3">
          Demo mode: credits are added instantly without real payment.
        </p>
      </div>

      {/* Transactions */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
          <Clock size={14} className="text-zinc-500" />
          <span className="text-white font-semibold text-sm">Transaction History</span>
        </div>

        {transactions.length === 0 ? (
          <div className="px-5 py-10 text-center text-zinc-600 text-sm">No transactions yet.</div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {transactions.map((tx, i) => {
              const cfg = TX_ICONS[tx.type] || TX_ICONS.admin_credit;
              const Icon = cfg.icon;
              const isPositive = tx.amount > 0;
              return (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-200 text-sm truncate">{tx.description}</p>
                    <p className="text-zinc-600 text-xs">{new Date(tx.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <p className={`text-sm font-bold tabular-nums shrink-0 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isPositive ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
