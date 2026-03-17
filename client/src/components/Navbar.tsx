'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';

export function Navbar() {
  const pathname              = usePathname();
  const router                = useRouter();
  const { user, wallet, _hasHydrated, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef               = useRef<HTMLDivElement>(null);

  const balance = (wallet?.balance || 0) - (wallet?.lockedBalance || 0);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const handleLogout = () => {
    logout();
    router.push('/');
    setMenuOpen(false);
  };

  const isActive = (href: string) =>
    pathname === href ? 'text-white' : 'text-zinc-400 hover:text-white';

  // While hydrating — show skeleton
  if (!_hasHydrated) {
    return (
      <header className="h-16 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">B</div>
            <span className="font-bold text-lg text-white tracking-tight">Bid<span className="text-orange-500">Sphere</span></span>
          </Link>
          <div className="w-24 h-8 bg-zinc-800 rounded-xl animate-pulse" />
        </div>
      </header>
    );
  }

  return (
    <header className="h-16 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">B</div>
          <span className="font-bold text-lg text-white tracking-tight">
            Bid<span className="text-orange-500">Sphere</span>
          </span>
        </Link>

        {/* Nav links — middle */}
        <nav className="hidden md:flex items-center gap-6 flex-1 justify-center">
          <Link href="/auctions" className={`text-sm font-medium transition-colors ${isActive('/auctions')}`}>
            Auctions
          </Link>

          {/* Admin link — only for admin role */}
          {user?.role === 'admin' && (
            <Link href="/admin" className={`text-sm font-medium transition-colors ${isActive('/admin')}`}>
              Admin
            </Link>
          )}

          {/* Dashboard link — only when logged in */}
          {user && (
            <Link href="/dashboard" className={`text-sm font-medium transition-colors ${isActive('/dashboard')}`}>
              Dashboard
            </Link>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">

          {/* ── LOGGED OUT ── */}
          {!user && (
            <>
              <Link href="/auth/login"
                className="text-zinc-400 hover:text-white text-sm font-medium px-3 py-1.5 transition-colors">
                Sign In
              </Link>
              <Link href="/auth/register"
                className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-1.5 rounded-xl transition-colors">
                Get Started
              </Link>
            </>
          )}

          {/* ── LOGGED IN ── */}
          {user && (
            <>
              {/* Wallet balance pill */}
              <Link href="/wallet"
                className="hidden sm:flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white text-sm font-medium px-3 py-1.5 rounded-xl transition-colors">
                <span className="text-orange-400 text-xs">₹</span>
                <span className="tabular-nums">{balance.toLocaleString()}</span>
              </Link>

              {/* Profile dropdown */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl px-2.5 py-1.5 transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {user.name[0].toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-white text-sm font-medium max-w-[100px] truncate">
                    {user.name.split(' ')[0]}
                  </span>
                  {/* Admin badge */}
                  {user.role === 'admin' && (
                    <span className="hidden sm:block text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-md font-medium">
                      Admin
                    </span>
                  )}
                  {/* Chevron */}
                  <svg className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${menuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>

                {/* Dropdown menu */}
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-fade-in z-50">

                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-zinc-800">
                      <p className="text-white text-sm font-semibold truncate">{user.name}</p>
                      <p className="text-zinc-500 text-xs truncate">{user.email}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-orange-400 text-xs font-medium">₹{balance.toLocaleString()}</span>
                        <span className="text-zinc-700 text-xs">credits</span>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                      <Link href="/dashboard"
                        className="flex items-center gap-3 px-4 py-2.5 text-zinc-300 hover:text-white hover:bg-zinc-800 text-sm transition-colors">
                        <span>📊</span> Dashboard
                      </Link>
                      <Link href="/auctions"
                        className="flex items-center gap-3 px-4 py-2.5 text-zinc-300 hover:text-white hover:bg-zinc-800 text-sm transition-colors">
                        <span>🏷️</span> Browse Auctions
                      </Link>
                      <Link href="/wallet"
                        className="flex items-center gap-3 px-4 py-2.5 text-zinc-300 hover:text-white hover:bg-zinc-800 text-sm transition-colors">
                        <span>💰</span> Wallet
                      </Link>

                      {/* Admin only links */}
                      {user.role === 'admin' && (
                        <>
                          <div className="border-t border-zinc-800 my-1" />
                          <Link href="/admin"
                            className="flex items-center gap-3 px-4 py-2.5 text-orange-400 hover:text-orange-300 hover:bg-zinc-800 text-sm transition-colors">
                            <span>🔐</span> Admin Panel
                          </Link>
                        </>
                      )}

                      <div className="border-t border-zinc-800 my-1" />
                      <button onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-zinc-800 text-sm transition-colors text-left">
                        <span>🚪</span> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}