'use client';
import Link from 'next/link';
import { useAuthStore } from '@/store';
import { Wallet, LogOut, LayoutDashboard, Gavel } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const { user, wallet, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const balance = (wallet?.balance || 0) - (wallet?.lockedBalance || 0);

  return (
    <header className="h-16 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-700 rounded-lg flex items-center justify-center">
            <Gavel size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">
            Bid<span className="text-orange-500">Sphere</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/auctions" className="text-zinc-400 hover:text-white text-sm font-medium transition-colors">
            Auctions
          </Link>
          {user?.role === 'admin' && (
            <Link href="/admin" className="text-zinc-400 hover:text-white text-sm font-medium transition-colors">
              Admin
            </Link>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Wallet balance */}
              <Link
                href="/wallet"
                className="hidden sm:flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-sm font-medium px-3 py-1.5 rounded-xl transition-colors"
              >
                <Wallet size={13} className="text-orange-400" />
                ₹{balance.toLocaleString()}
              </Link>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl px-3 py-1.5 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center text-white text-xs font-bold">
                    {user.name[0].toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-white text-sm font-medium max-w-24 truncate">{user.name}</span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2.5 px-4 py-3 text-zinc-300 hover:text-white hover:bg-zinc-800 text-sm transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      <LayoutDashboard size={14} />
                      Dashboard
                    </Link>
                    <Link
                      href="/wallet"
                      className="flex items-center gap-2.5 px-4 py-3 text-zinc-300 hover:text-white hover:bg-zinc-800 text-sm transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Wallet size={14} />
                      Wallet
                    </Link>
                    <div className="border-t border-zinc-800" />
                    <button
                      onClick={() => { logout(); setMenuOpen(false); }}
                      className="flex items-center gap-2.5 w-full px-4 py-3 text-red-400 hover:text-red-300 hover:bg-zinc-800 text-sm transition-colors"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login" className="text-zinc-400 hover:text-white text-sm font-medium px-3 py-1.5 transition-colors">
                Sign In
              </Link>
              <Link href="/auth/register" className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-1.5 rounded-xl transition-colors">
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
