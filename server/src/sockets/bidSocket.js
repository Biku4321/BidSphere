const Bid = require('../models/Bid');
const Auction = require('../models/Auction');
const Wallet = require('../models/Wallet');
const { getRedis } = require('../config/redis');

const registerBidHandlers = (io, socket) => {

  // ── Real-time bid via socket (alternative to REST) ──────
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

      // Wallet check
      const wallet = await Wallet.findOne({ user: socket.user._id });
      if (!wallet || wallet.availableBalance() < amount) {
        return callback?.({ success: false, error: 'Insufficient credits' });
      }

      // Refund previous top bidder
      const prevTopBid = await Bid.findOne({ auction: auctionId, isWinning: true });
      if (prevTopBid && prevTopBid.bidder.toString() !== socket.user._id.toString()) {
        const prevWallet = await Wallet.findOne({ user: prevTopBid.bidder });
        if (prevWallet) {
          await prevWallet.addCredits(prevTopBid.amount, `Outbid refund`, 'bid_refund', auctionId);
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

      // Anti-snipe check
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

      // Redis leaderboard
      const redis = getRedis();
      if (redis) {
        await redis.zadd(`leaderboard:${auctionId}`, amount, socket.user._id.toString());
        await redis.expire(`leaderboard:${auctionId}`, 86400);
      }

      // Broadcast to room
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

      // Update leaderboard
      const topBids = await Bid.find({ auction: auctionId })
        .populate('bidder', 'name avatar')
        .sort({ amount: -1 })
        .limit(10);
      io.to(`auction:${auctionId}`).emit('leaderboard:update', { topBids });

      callback?.({ success: true, bid: populatedBid, currentPrice: amount });
    } catch (err) {
      callback?.({ success: false, error: err.message });
    }
  });

  // ── Auto-bid setup ───────────────────────────────────────
  socket.on('autobid:set', async (data, callback) => {
    if (!socket.user) return callback?.({ success: false, error: 'Auth required' });

    const { auctionId, maxAmount } = data;
    const redis = getRedis();
    if (redis) {
      await redis.set(
        `autobid:${auctionId}:${socket.user._id}`,
        JSON.stringify({ maxAmount, userId: socket.user._id.toString() }),
        'EX', 86400
      );
    }
    callback?.({ success: true, message: `Auto-bid set up to ₹${maxAmount}` });
  });
};

module.exports = { registerBidHandlers };
