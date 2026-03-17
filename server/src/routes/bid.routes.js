const express = require('express');
const router = express.Router();
const Bid = require('../models/Bid');
const Auction = require('../models/Auction');
const Wallet = require('../models/Wallet');
const FraudLog = require('../models/FraudLog');
const { protect } = require('../middleware/auth');
const { getRedis } = require('../config/redis');
const axios = require('axios');

// ── POST /api/bids ─── Place a bid ───────────────────────
router.post('/', protect, async (req, res) => {
  const { auctionId, amount } = req.body;
  const io = req.app.get('io');

  try {
    // 1. Validate auction
    const auction = await Auction.findById(auctionId);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    if (auction.status !== 'live') return res.status(400).json({ error: 'Auction is not live' });
    if (new Date() > auction.endTime) return res.status(400).json({ error: 'Auction has ended' });

    // 2. Validate amount
    const minBid = auction.currentPrice + auction.bidIncrement;
    if (amount < minBid) {
      return res.status(400).json({ error: `Minimum bid is ₹${minBid}` });
    }

    // 3. Check wallet
    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet || wallet.availableBalance() < amount) {
      return res.status(400).json({ error: 'Insufficient credits' });
    }

    // 4. Check bidder is not seller
    if (auction.createdBy.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot bid on your own auction' });
    }

    // 5. Fraud detection (async — don't block bid)
    let fraudScore = 0;
    try {
      const recentBids = await Bid.find({
        auction: auctionId,
        bidder: req.user._id,
        timestamp: { $gte: new Date(Date.now() - 60000) },
      });

      const fraudRes = await axios.post(
        `${process.env.AI_SERVICE_URL}/fraud/analyze`,
        {
          user_id: req.user._id.toString(),
          auction_id: auctionId,
          bid_amount: amount,
          current_price: auction.currentPrice,
          recent_bid_count: recentBids.length,
          time_remaining: (new Date(auction.endTime) - new Date()) / 1000,
        },
        { timeout: 1500 }
      );
      fraudScore = fraudRes.data.risk_score || 0;
    } catch (_) {}

    // 6. Refund previous top bidder's credits
    const prevTopBid = await Bid.findOne({ auction: auctionId, isWinning: true });
    if (prevTopBid && prevTopBid.bidder.toString() !== req.user._id.toString()) {
      const prevWallet = await Wallet.findOne({ user: prevTopBid.bidder });
      if (prevWallet) {
        await prevWallet.addCredits(prevTopBid.amount, `Outbid refund — auction #${auctionId}`, 'bid_refund', auctionId);
      }
      await Bid.findByIdAndUpdate(prevTopBid._id, { isWinning: false });
    }

    // 7. Deduct from new bidder's wallet
    await wallet.deductCredits(amount, `Bid on "${auction.title}"`, 'bid_placed', auctionId);

    // 8. Create bid record
    const bid = await Bid.create({
      auction: auctionId,
      bidder: req.user._id,
      amount,
      isWinning: true,
      fraudScore,
      isFlagged: fraudScore > 70,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // 9. Log fraud if high risk
    if (fraudScore > 70) {
      await FraudLog.create({
        auction: auctionId,
        user: req.user._id,
        type: 'rapid_bidding',
        riskScore: fraudScore,
        details: { bidAmount: amount, currentPrice: auction.currentPrice },
      });
      await Auction.findByIdAndUpdate(auctionId, { fraudRiskLevel: 'high', $push: { fraudFlags: { reason: 'High fraud score', userId: req.user._id, timestamp: new Date(), riskScore: fraudScore } } });
    }

    // 10. Update auction price & bid count
    const antiSnipeExtended = checkAntiSnipe(auction);
    const updateData = {
      currentPrice: amount,
      winner: req.user._id,
      $inc: { bidCount: 1 },
      $addToSet: { participants: req.user._id },
    };
    if (antiSnipeExtended) {
      const newEndTime = new Date(auction.endTime.getTime() + auction.antiSnipeExtend * 1000);
      updateData.endTime = newEndTime;
      updateData.$inc.antiSnipeExtensions = 1;
    }
    const updatedAuction = await Auction.findByIdAndUpdate(auctionId, updateData, { new: true });

    // 11. Update Redis leaderboard
    const redis = getRedis();
    if (redis) {
      await redis.zadd(`leaderboard:${auctionId}`, amount, req.user._id.toString());
      await redis.set(`auction:${auctionId}:price`, amount);
    }

    // 12. Broadcast via Socket.IO
    const populatedBid = await Bid.findById(bid._id).populate('bidder', 'name avatar');
    const payload = {
      bid: populatedBid,
      currentPrice: amount,
      bidCount: updatedAuction.bidCount,
      endTime: updatedAuction.endTime,
      antiSnipeExtended,
    };

    io.to(`auction:${auctionId}`).emit('bid:new', payload);

    // Update leaderboard broadcast
    const topBids = await Bid.find({ auction: auctionId })
      .populate('bidder', 'name avatar')
      .sort({ amount: -1 })
      .limit(10);
    io.to(`auction:${auctionId}`).emit('leaderboard:update', { topBids });

    // Update user bid count (gamification)
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user._id, { $inc: { totalBids: 1 } });

    res.status(201).json({ bid: populatedBid, currentPrice: amount, antiSnipeExtended });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── GET /api/bids/auction/:id ─── Bid history ────────────
router.get('/auction/:id', async (req, res) => {
  try {
    const bids = await Bid.find({ auction: req.params.id })
      .populate('bidder', 'name avatar')
      .sort({ amount: -1 })
      .limit(50);
    res.json({ bids });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/bids/my ─── My bid history ──────────────────
router.get('/my', protect, async (req, res) => {
  try {
    const bids = await Bid.find({ bidder: req.user._id })
      .populate('auction', 'title status currentPrice endTime images')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ bids });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function checkAntiSnipe(auction) {
  const secondsRemaining = (new Date(auction.endTime) - new Date()) / 1000;
  return secondsRemaining <= auction.antiSnipeWindow;
}

module.exports = router;