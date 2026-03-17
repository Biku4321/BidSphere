import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  totalBids: number;
  totalWins: number;
  badges: string[];
}

interface Wallet {
  balance: number;
  lockedBalance: number;
}

interface AuthState {
  user: User | null;
  wallet: Wallet | null;
  token: string | null;
  isLoading: boolean;
  _hasHydrated: boolean;           // ← NEW
  setHasHydrated: (v: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshWallet: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      wallet: null,
      token: null,
      isLoading: false,
      _hasHydrated: false,

      setHasHydrated: (v) => set({ _hasHydrated: v }),

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          localStorage.setItem('token', data.token);
          set({ user: data.user, token: data.token, isLoading: false });
          await get().refreshWallet();
        } catch (err: any) {
          set({ isLoading: false });
          throw new Error(err.response?.data?.error || 'Login failed');
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/register', { name, email, password });
          localStorage.setItem('token', data.token);
          set({ user: data.user, token: data.token, isLoading: false });
          await get().refreshWallet();
        } catch (err: any) {
          set({ isLoading: false });
          throw new Error(err.response?.data?.error || 'Registration failed');
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, wallet: null, token: null });
      },

      refreshWallet: async () => {
        try {
          const { data } = await api.get('/wallet');
          set({ wallet: data.wallet });
        } catch (_) {}
      },
    }),
    {
      name: 'bidsphere-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        // Called after localStorage is read — mark hydration complete
        state?.setHasHydrated(true);
      },
    }
  )
);

// ── Auction store ──────────────────────────────────────────
interface Bid {
  _id: string;
  bidder: { _id: string; name: string; avatar?: string };
  amount: number;
  timestamp: string;
}

interface AuctionState {
  currentPrice: number;
  bidCount: number;
  endTime: string | null;
  topBids: Bid[];
  recentBids: Bid[];
  secondsLeft: number;
  antiSnipeExtended: boolean;
  isEnded: boolean;
  winner: any;
  setCurrentPrice: (price: number) => void;
  addBid: (bid: Bid, meta: { currentPrice: number; bidCount: number; endTime: string; antiSnipeExtended: boolean }) => void;
  setTopBids: (bids: Bid[]) => void;
  setTimer: (seconds: number, endTime: string) => void;
  setEnded: (winner: any, finalPrice: number) => void;
  reset: () => void;
}

export const useAuctionStore = create<AuctionState>((set) => ({
  currentPrice: 0,
  bidCount: 0,
  endTime: null,
  topBids: [],
  recentBids: [],
  secondsLeft: 0,
  antiSnipeExtended: false,
  isEnded: false,
  winner: null,

  setCurrentPrice: (price) => set({ currentPrice: price }),

  addBid: (bid, meta) => set((state) => ({
    currentPrice: meta.currentPrice,
    bidCount: meta.bidCount,
    endTime: meta.endTime,
    antiSnipeExtended: meta.antiSnipeExtended,
    recentBids: [bid, ...state.recentBids].slice(0, 20),
  })),

  setTopBids: (bids) => set({ topBids: bids }),

  setTimer: (seconds, endTime) => set({ secondsLeft: seconds, endTime }),

  setEnded: (winner, finalPrice) => set({ isEnded: true, winner, currentPrice: finalPrice }),

  reset: () => set({
    currentPrice: 0, bidCount: 0, endTime: null, topBids: [],
    recentBids: [], secondsLeft: 0, antiSnipeExtended: false,
    isEnded: false, winner: null,
  }),
}));