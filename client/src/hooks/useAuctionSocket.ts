'use client';
import { useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useAuctionStore } from '@/store';
import { useAuthStore } from '@/store';

export const useAuctionSocket = (auctionId: string) => {
  const { addBid, setTopBids, setTimer, setEnded } = useAuctionStore();
  const { token } = useAuthStore();
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (!auctionId) return;

    const socket = connectSocket(token || undefined);
    socketRef.current = socket;

    // Join room
    socket.emit('auction:join', { auctionId });
    socket.emit('auction:subscribe-timer', { auctionId });

    // ── Listeners ─────────────────────────────────────────
    socket.on('bid:new', (data: any) => {
      addBid(data.bid, {
        currentPrice: data.currentPrice,
        bidCount: data.bidCount,
        endTime: data.endTime,
        antiSnipeExtended: data.antiSnipeExtended,
      });
    });

    socket.on('leaderboard:update', (data: any) => {
      setTopBids(data.topBids);
    });

    socket.on('timer:tick', (data: any) => {
      if (data.auctionId === auctionId) {
        setTimer(data.secondsLeft, data.endTime);
      }
    });

    socket.on('auction:ended', (data: any) => {
      if (data.auctionId === auctionId) {
        setEnded(data.winner, data.finalPrice);
      }
    });

    return () => {
      socket.emit('auction:leave', { auctionId });
      socket.off('bid:new');
      socket.off('leaderboard:update');
      socket.off('timer:tick');
      socket.off('auction:ended');
    };
  }, [auctionId, token]);

  const placeBid = (amount: number): Promise<any> => {
    return new Promise((resolve, reject) => {
      socketRef.current?.emit('bid:place', { auctionId, amount }, (res: any) => {
        if (res?.success) resolve(res);
        else reject(new Error(res?.error || 'Bid failed'));
      });
    });
  };

  const setAutoBid = (maxAmount: number): Promise<any> => {
    return new Promise((resolve, reject) => {
      socketRef.current?.emit('autobid:set', { auctionId, maxAmount }, (res: any) => {
        if (res?.success) resolve(res);
        else reject(new Error(res?.error || 'Auto-bid failed'));
      });
    });
  };

  return { placeBid, setAutoBid };
};
