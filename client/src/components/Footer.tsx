import Link from 'next/link';

const LINKS = {
  Platform: [
    { label: 'Browse Auctions', href: '/auctions' },
    { label: 'How It Works',    href: '/#how-it-works' },
    { label: 'Wallet & Credits',href: '/wallet' },
    { label: 'Leaderboard',     href: '/auctions' },
  ],
  Account: [
    { label: 'Sign In',         href: '/auth/login' },
    { label: 'Register Free',   href: '/auth/register' },
    { label: 'Dashboard',       href: '/dashboard' },
    { label: 'Admin Panel',     href: '/admin' },
  ],
  Technology: [
    { label: 'Socket.IO Bidding',  href: '#' },
    { label: 'AI Price Prediction',href: '#' },
    { label: 'Fraud Detection',    href: '#' },
    { label: 'API Docs',           href: 'http://localhost:8000/docs' },
  ],
};

const TECH_BADGES = [
  'Next.js 14', 'Node.js', 'Socket.IO', 'FastAPI', 'MongoDB', 'Redis', 'Tailwind CSS', 'Zustand',
];

export function Footer() {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-800/60 mt-20">
      {/* Top section */}
      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">

          {/* Brand col */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">B</div>
              <span className="font-bold text-xl text-white tracking-tight">
                Bid<span className="text-orange-500">Sphere</span>
              </span>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mb-5">
              AI-powered real-time auction platform with fraud detection, price prediction, and smart bidding strategy. Built for hackathon 2025.
            </p>

            {/* Status badges */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-zinc-400 text-xs">All systems operational</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <span className="text-zinc-400 text-xs">WebSocket server live</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                <span className="text-zinc-400 text-xs">AI service running</span>
              </div>
            </div>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([group, links]) => (
            <div key={group}>
              <p className="text-white font-semibold text-sm mb-4">{group}</p>
              <ul className="space-y-2.5">
                {links.map(link => (
                  <li key={link.label}>
                    <Link href={link.href}
                      className="text-zinc-400 hover:text-orange-400 text-sm transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Tech stack badges */}
        <div className="mt-12 pt-8 border-t border-zinc-800/60">
          <p className="text-zinc-600 text-xs uppercase tracking-widest mb-4">Built with</p>
          <div className="flex flex-wrap gap-2">
            {TECH_BADGES.map(t => (
              <span key={t}
                className="text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full hover:border-zinc-600 hover:text-zinc-300 transition-colors">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-zinc-800/60">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-zinc-600 text-xs">
            © 2026 BidSphere · Built for CodeBidz · All rights reserved
          </p>
          <div className="flex items-center gap-5">
            <span className="text-zinc-700 text-xs">Full-Stack + AI/ML Project</span>
            <div className="flex items-center gap-1.5 text-xs text-zinc-600">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              CodeBidz 2026
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}