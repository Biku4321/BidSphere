const Bid = require('../models/Bid');
const Auction = require('../models/Auction');
const Wallet = require('../models/Wallet');
const { getRedis } = require('../config/redis');

// In-memory auto-bid store (fallback when Redis unavailable)
const autoBidMap = new Map();

const registerBidHandlers = (io, socket) => {

  // ── Real-time bid via socket ─────────────────────────
  socket.on('bid:place', async (data, callback) => {
    if (!socket.user) {
      return callback?.({ success: false, error: 'Authentication required' });
    }

    const { auctionId, amount } = data;
    try {
      const auction = await Auction.findById(auctionId);
      if (!auction || auction.status !== 'live') {
        return callback?.({ success: false, error: 'Auction not active' });
      }
      if (new Date() > auction.endTime) {
        return callback?.({ success: false, error: 'Auction has ended' });
      }

      const minBid = auction.currentPrice + auction.bidIncrement;
      if (amount < minBid) {
        return callback?.({ success: false, error: `Minimum bid is ₹${minBid}` });
      }

      const wallet = await Wallet.findOne({ user: socket.user._id });
      if (!wallet || wallet.availableBalance() < amount) {
        return callback?.({ success: false, error: 'Insufficient credits' });
      }

      // Refund previous top bidder
      const prevTopBid = await Bid.findOne({ auction: auctionId, isWinning: true });
      if (prevTopBid && prevTopBid.bidder.toString() !== socket.user._id.toString()) {
        const prevWallet = await Wallet.findOne({ user: prevTopBid.bidder });
        if (prevWallet) {
          await prevWallet.addCredits(prevTopBid.amount, 'Outbid refund', 'bid_refund', auctionId);
        }
        await Bid.findByIdAndUpdate(prevTopBid._id, { isWinning: false });
      }

      // Deduct from bidder
      await wallet.deductCredits(amount, `Bid on "${auction.title}"`, 'bid_placed', auctionId);

      // Create bid
      const bid = await Bid.create({
        auction: auctionId,
        bidder: socket.user._id,
        amount,
        isWinning: true,
        ipAddress: socket.handshake.address,
      });

      // Anti-snipe
      const secondsLeft = (new Date(auction.endTime) - new Date()) / 1000;
      const antiSnipeExtended = secondsLeft <= auction.antiSnipeWindow;

      const updateData = {
        currentPrice: amount,
        winner: socket.user._id,
        $inc: { bidCount: 1 },
        $addToSet: { participants: socket.user._id },
      };
      if (antiSnipeExtended) {
        const newEnd = new Date(auction.endTime.getTime() + auction.antiSnipeExtend * 1000);
        updateData.endTime = newEnd;
        updateData.$inc.antiSnipeExtensions = 1;
      }
      const updated = await Auction.findByIdAndUpdate(auctionId, updateData, { new: true });

      // Redis leaderboard (optional)
      try {
        const redis = getRedis();
        if (redis) {
          await redis.zadd(`leaderboard:${auctionId}`, amount, socket.user._id.toString());
          await redis.expire(`leaderboard:${auctionId}`, 86400);
        }
      } catch (_) {}

      // Broadcast
      const populatedBid = await Bid.findById(bid._id).populate('bidder', 'name avatar');
      const payload = {
        bid: populatedBid,
        currentPrice: amount,
        bidCount: updated.bidCount,
        endTime: updated.endTime,
        antiSnipeExtended,
        bidderId: socket.user._id.toString(),
        bidderName: socket.user.name,
      };

      io.to(`auction:${auctionId}`).emit('bid:new', payload);

      // Leaderboard update
      const topBids = await Bid.find({ auction: auctionId })
        .populate('bidder', 'name avatar')
        .sort({ amount: -1 })
        .limit(10);
      io.to(`auction:${auctionId}`).emit('leaderboard:update', { topBids });

      // Trigger auto-bids from other users
      await processAutoBids(auctionId, amount, socket.user._id.toString(), io);

      callback?.({ success: true, bid: populatedBid, currentPrice: amount });
    } catch (err) {
      console.error('bid:place error:', err.message);
      callback?.({ success: false, error: err.message });
    }
  });

  // ── Auto-bid setup ───────────────────────────────────
  socket.on('autobid:set', async (data, callback) => {
    if (!socket.user) return callback?.({ success: false, error: 'Auth required' });

    const { auctionId, maxAmount } = data;
    const key = `${auctionId}:${socket.user._id}`;

    // Save to in-memory map
    autoBidMap.set(key, {
      maxAmount,
      userId: socket.user._id.toString(),
      auctionId,
    });

    // Also try Redis
    try {
      const redis = getRedis();
      if (redis) {
        await redis.set(
          `autobid:${key}`,
          JSON.stringify({ maxAmount, userId: socket.user._id.toString() }),
          'EX', 86400
        );
      }
    } catch (_) {}

    console.log(`Auto-bid set: user ${socket.user.name}, auction ${auctionId}, max ₹${maxAmount}`);
    callback?.({ success: true, message: `Auto-bid set up to ₹${maxAmount}` });
  });
};

// Process auto-bids after a new bid is placed
async function processAutoBids(auctionId, currentPrice, winnerId, io) {
  try {
    const auction = await Auction.findById(auctionId);
    if (!auction || auction.status !== 'live') return;

    const nextMin = currentPrice + auction.bidIncrement;

    // Get all auto-bids for this auction
    const autoBids = [];

    // From in-memory map
    for (const [key, val] of autoBidMap.entries()) {
      if (key.startsWith(auctionId) && val.userId !== winnerId) {
        autoBids.push(val);
      }
    }

    // Also check Redis
    try {
      const redis = getRedis();
      if (redis) {
        const keys = await redis.keys(`autobid:${auctionId}:*`);
        for (const k of keys) {
          const val = await redis.get(k);
          if (val) {
            const parsed = JSON.parse(val);
            if (parsed.userId !== winnerId) {
              const exists = autoBids.find(a => a.userId === parsed.userId);
              if (!exists) autoBids.push({ ...parsed, auctionId });
            }
          }
        }
      }
    } catch (_) {}

    // Process first eligible auto-bidder
    for (const autoBid of autoBids) {
      if (nextMin > autoBid.maxAmount) continue;

      const wallet = await Wallet.findOne({ user: autoBid.userId });
      if (!wallet || wallet.availableBalance() < nextMin) continue;

      // Refund current winner
      const prevWinBid = await Bid.findOne({ auction: auctionId, isWinning: true });
      if (prevWinBid) {
        const prevW = await Wallet.findOne({ user: prevWinBid.bidder });
        if (prevW) await prevW.addCredits(prevWinBid.amount, 'Auto-bid outbid refund', 'bid_refund', auctionId);
        await Bid.findByIdAndUpdate(prevWinBid._id, { isWinning: false });
      }

      // Deduct
      await wallet.deductCredits(nextMin, `Auto-bid on auction`, 'bid_placed', auctionId);

      // Create auto bid
      const newBid = await Bid.create({
        auction: auctionId,
        bidder: autoBid.userId,
        amount: nextMin,
        isWinning: true,
        isAutoBid: true,
      });

      // Update auction
      const updated = await Auction.findByIdAndUpdate(
        auctionId,
        { currentPrice: nextMin, winner: autoBid.userId, $inc: { bidCount: 1 } },
        { new: true }
      );

      const populated = await Bid.findById(newBid._id).populate('bidder', 'name avatar');
      io.to(`auction:${auctionId}`).emit('bid:new', {
        bid: populated,
        currentPrice: nextMin,
        bidCount: updated.bidCount,
        endTime: updated.endTime,
        antiSnipeExtended: false,
        isAutoBid: true,
      });

      const topBids = await Bid.find({ auction: auctionId })
        .populate('bidder', 'name avatar')
        .sort({ amount: -1 })
        .limit(10);
      io.to(`auction:${auctionId}`).emit('leaderboard:update', { topBids });

      break; // Only one auto-bid per trigger
    }
  } catch (err) {
    console.error('Auto-bid error:', err.message);
  }
}

module.exports = { registerBidHandlers };