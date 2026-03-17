import Link from 'next/link';
import { Brain, Zap, Shield, TrendingUp, ArrowRight } from 'lucide-react';

const FEATURES = [
  {
    icon: Zap,
    color: 'text-orange-400',
    bg: 'bg-orange-950/40 border-orange-900/40',
    title: 'Real-Time Bidding',
    desc: 'WebSocket-powered live auction engine. Every bid is broadcast instantly to all participants — zero refresh needed.',
  },
  {
    icon: Brain,
    color: 'text-violet-400',
    bg: 'bg-violet-950/40 border-violet-900/40',
    title: 'AI Price Prediction',
    desc: 'Machine learning models trained on historical auction data predict expected final prices with confidence scores.',
  },
  {
    icon: Shield,
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/40 border-emerald-900/40',
    title: 'Fraud Detection',
    desc: 'Real-time shill bidding and bot detection. Every bid is scored for risk and flagged automatically.',
  },
  {
    icon: TrendingUp,
    color: 'text-blue-400',
    bg: 'bg-blue-950/40 border-blue-900/40',
    title: 'Smart Strategy',
    desc: 'AI agent analyzes competition intensity and time pressure to recommend optimal bidding strategy.',
  },
];

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 pt-24 pb-20 text-center relative">
        <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-full px-4 py-1.5 text-xs text-zinc-400 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          Powered by WebSockets + Machine Learning
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
          Intelligent{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
            Real-Time
          </span>
          <br />Auctions
        </h1>

        <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          BidSphere combines live bidding with AI-powered price prediction, fraud detection,
          and smart strategy recommendations — for a fairer, smarter auction experience.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/auctions"
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            Browse Live Auctions
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/auth/register"
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            Get Started Free
          </Link>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-8 mt-16 flex-wrap">
          {[
            { label: 'Live Auctions', value: '50+' },
            { label: 'Active Bidders', value: '2,400+' },
            { label: 'Fraud Detected', value: '99.2%' },
            { label: 'Avg Prediction Accuracy', value: '87%' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-zinc-500 text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Why BidSphere is Different
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className={`rounded-2xl border p-6 ${f.bg}`}>
              <f.icon size={24} className={`${f.color} mb-4`} />
              <h3 className="text-white font-semibold mb-2">{f.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="bg-gradient-to-br from-orange-950/40 to-zinc-900 border border-orange-900/30 rounded-3xl p-10">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to bid smarter?</h2>
          <p className="text-zinc-400 mb-8">Get 100 free credits when you sign up today.</p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors"
          >
            Create Free Account
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
