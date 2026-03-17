'use client';
import { useState, useEffect } from 'react';
import { AuctionCard } from '@/components/AuctionCard';
import api from '@/lib/api';
import { Search, SlidersHorizontal } from 'lucide-react';

const CATEGORIES = ['all', 'electronics', 'collectibles', 'art', 'fashion', 'vehicles', 'real-estate', 'other'];
const STATUSES   = ['live', 'upcoming', 'ended'];

export default function AuctionsPage() {
  const [auctions, setAuctions]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [status, setStatus]         = useState('live');
  const [category, setCategory]     = useState('all');
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetch = async () => {
    setLoading(true);
    try {
      const params: any = { status, page, limit: 12 };
      if (category !== 'all') params.category = category;
      if (search) params.search = search;
      const { data } = await api.get('/auctions', { params });
      setAuctions(data.auctions);
      setTotalPages(data.pages);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [status, category, page]);
  useEffect(() => {
    const t = setTimeout(fetch, 400);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Auctions</h1>
        <p className="text-zinc-400">Browse live, upcoming, and ended auctions.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search auctions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-zinc-600"
          />
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                status === s ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 flex-wrap mb-8">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => { setCategory(c); setPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors border ${
              category === c
                ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
            }`}
          >
            {c === 'all' ? 'All Categories' : c}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-zinc-900 rounded-2xl border border-zinc-800 h-72 animate-pulse" />
          ))}
        </div>
      ) : auctions.length === 0 ? (
        <div className="text-center py-24 text-zinc-600">
          <p className="text-4xl mb-4">🏷️</p>
          <p className="font-medium">No auctions found</p>
          <p className="text-sm mt-1">Try a different filter or check back later.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {auctions.map((a) => <AuctionCard key={a._id} auction={a} />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-10">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                page === p ? 'bg-orange-500 text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
