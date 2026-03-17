'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';

const DEMO_USERS = [
  { role: 'Admin',  email: 'admin@bidsphere.com', password: 'Admin@123', color: 'text-orange-400', bg: 'bg-orange-950/40 border-orange-800/40 hover:bg-orange-950/70', badge: '🔐' },
  { role: 'User 1', email: 'rahul@test.com',       password: 'rahul123',  color: 'text-blue-400',   bg: 'bg-blue-950/40 border-blue-800/40 hover:bg-blue-950/70',     badge: '👤' },
  { role: 'User 2', email: 'priya@test.com',        password: 'priya123',  color: 'text-emerald-400',bg: 'bg-emerald-950/40 border-emerald-800/40 hover:bg-emerald-950/70', badge: '👤' },
];

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const { login, isLoading }    = useAuthStore();
  const router                  = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      router.push('/auctions');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fillDemo = (u: typeof DEMO_USERS[0]) => {
    setEmail(u.email);
    setPassword(u.password);
    setError('');
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 bg-orange-500 rounded-2xl items-center justify-center mb-4 text-white font-bold text-xl">B</div>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-zinc-400 text-sm mt-1">Sign in to your BidSphere account</p>
        </div>

        {/* ── Demo credentials box ── */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Demo Login</span>
            <span className="text-zinc-600 text-xs">— click to fill</span>
          </div>
          <div className="space-y-2">
            {DEMO_USERS.map(u => (
              <button key={u.role} onClick={() => fillDemo(u)} type="button"
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors text-left ${u.bg}`}>
                <span className="text-base">{u.badge}</span>
                <div className="flex-1 min-w-0">
                  <span className={`text-xs font-semibold ${u.color}`}>{u.role}</span>
                  <p className="text-zinc-400 text-xs font-mono truncate">{u.email}</p>
                </div>
                <span className="text-zinc-600 text-xs font-mono shrink-0">{u.password}</span>
              </button>
            ))}
          </div>
          <p className="text-zinc-600 text-xs text-center mt-2">Click any row to auto-fill credentials</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-zinc-400 text-xs font-medium mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-zinc-600"/>
          </div>
          <div>
            <label className="block text-zinc-400 text-xs font-medium mb-1.5">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-zinc-600"/>
          </div>

          {error && (
            <div className="bg-red-950/50 border border-red-800/50 text-red-400 text-xs rounded-xl px-4 py-3">{error}</div>
          )}

          <button type="submit" disabled={isLoading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors">
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-zinc-500 text-sm mt-6">
          No account?{' '}
          <Link href="/auth/register" className="text-orange-400 hover:text-orange-300 font-medium">Create one free</Link>
        </p>
      </div>
    </div>
  );
}