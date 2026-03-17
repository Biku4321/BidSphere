const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const { getRedis } = require('../config/redis');

// Track active timers so we don't double-register
const activeTimers = new Map();

const registerAuctionHandlers = (io, socket) => {

  // ── Request current auction state ────────────────────────
  socket.on('auction:state', async ({ auctionId }, callback) => {
    try {
      const auction = await Auction.findById(auctionId).populate('winner', 'name avatar');
      const topBids = await Bid.find({ auction: auctionId })
        .populate('bidder', 'name avatar')
        .sort({ amount: -1 })
        .limit(10);

      callback?.({ auction, topBids });
    } catch (err) {
      callback?.({ error: err.message });
    }
  });

  // ── Admin: force end auction ─────────────────────────────
  socket.on('auction:force-end', async ({ auctionId }, callback) => {
    if (socket.user?.role !== 'admin') {
      return callback?.({ success: false, error: 'Admin only' });
    }
    try {
      await endAuction(auctionId, io);
      callback?.({ success: true });
    } catch (err) {
      callback?.({ success: false, error: err.message });
    }
  });

  // ── Timer tick broadcast (start for each auction room) ───
  socket.on('auction:subscribe-timer', async ({ auctionId }) => {
    socket.join(`auction:${auctionId}`);

    // Start a timer broadcaster for this auction if not running
    if (!activeTimers.has(auctionId)) {
      startTimerBroadcast(auctionId, io);
    }
  });
};

// Broadcast countdown every second to auction room
const startTimerBroadcast = (auctionId, io) => {
  const interval = setInterval(async () => {
    try {
      const auction = await Auction.findById(auctionId).select('status endTime currentPrice bidCount');
      if (!auction || auction.status === 'ended' || auction.status === 'cancelled') {
        clearInterval(interval);
        activeTimers.delete(auctionId);
        return;
      }

      const secondsLeft = Math.max(0, (new Date(auction.endTime) - new Date()) / 1000);
      io.to(`auction:${auctionId}`).emit('timer:tick', {
        auctionId,
        secondsLeft: Math.floor(secondsLeft),
        endTime: auction.endTime,
        currentPrice: auction.currentPrice,
        bidCount: auction.bidCount,
      });

      // Trigger end if time is up
      if (secondsLeft <= 0) {
        clearInterval(interval);
        activeTimers.delete(auctionId);
        await endAuction(auctionId, io);
      }
    } catch (err) {
      clearInterval(interval);
      activeTimers.delete(auctionId);
    }
  }, 1000);

  activeTimers.set(auctionId, interval);
};

const endAuction = async (auctionId, io) => {
  const auction = await Auction.findById(auctionId);
  if (!auction || auction.status === 'ended') return;

  const winningBid = await Bid.findOne({ auction: auctionId, isWinning: true })
    .populate('bidder', 'name email avatar');

  auction.status = 'ended';
  if (winningBid) auction.winner = winningBid.bidder._id;
  await auction.save();

  io.to(`auction:${auctionId}`).emit('auction:ended', {
    auctionId,
    winner: winningBid ? {
      id: winningBid.bidder._id,
      name: winningBid.bidder.name,
      avatar: winningBid.bidder.avatar,
      amount: winningBid.amount,
    } : null,
    finalPrice: auction.currentPrice,
  });
};

module.exports = { registerAuctionHandlers, startTimerBroadcast };
