const express = require('express');
const router = express.Router();
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const { protect, adminOnly } = require('../middleware/auth');
const { getRedis } = require('../config/redis');
const axios = require('axios');

// ── GET /api/auctions ─── List all auctions ──────────────
router.get('/', async (req, res) => {
  try {
    const { status = 'live', category, page = 1, limit = 12, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) filter.$text = { $search: search };

    const skip = (page - 1) * limit;
    const [auctions, total] = await Promise.all([
      Auction.find(filter)
        .populate('createdBy', 'name avatar')
        .populate('winner', 'name avatar')
        .sort({ endTime: 1 })
        .skip(skip)
        .limit(Number(limit)),
      Auction.countDocuments(filter),
    ]);

    res.json({ auctions, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/auctions/:id ─── Single auction ─────────────
router.get('/:id', async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate('createdBy', 'name avatar')
      .populate('winner', 'name avatar')
      .populate('participants', 'name avatar');

    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    // Fetch top 10 bids for leaderboard
    const topBids = await Bid.find({ auction: auction._id })
      .populate('bidder', 'name avatar')
      .sort({ amount: -1 })
      .limit(10);

    // Try AI price prediction
    let aiPrediction = null;
    try {
      const aiRes = await axios.post(
        `${process.env.AI_SERVICE_URL}/predict/price`,
        { auction_id: req.params.id, current_price: auction.currentPrice, bid_count: auction.bidCount },
        { timeout: 2000 }
      );
      aiPrediction = aiRes.data;
    } catch (_) {}

    res.json({ auction, topBids, aiPrediction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auctions ─── Create auction (admin) ────────
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const auction = await Auction.create({ ...req.body, createdBy: req.user._id, currentPrice: req.body.startingPrice, originalEndTime: req.body.endTime });

    // Schedule status transitions
    const io = req.app.get('io');
    scheduleAuctionTransitions(auction, io);

    res.status(201).json({ auction });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── PATCH /api/auctions/:id ─── Update (admin) ───────────
router.patch('/:id', protect, adminOnly, async (req, res) => {
  try {
    const auction = await Auction.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    res.json({ auction });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── DELETE /api/auctions/:id ─── Cancel (admin) ──────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const auction = await Auction.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    const io = req.app.get('io');
    io.to(`auction:${req.params.id}`).emit('auction:cancelled', { auctionId: req.params.id });

    res.json({ message: 'Auction cancelled', auction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: schedule auction status transitions
function scheduleAuctionTransitions(auction, io) {
  const now = Date.now();
  const startDelay = new Date(auction.startTime).getTime() - now;
  const endDelay = new Date(auction.endTime).getTime() - now;

  if (startDelay > 0) {
    setTimeout(async () => {
      await Auction.findByIdAndUpdate(auction._id, { status: 'live' });
      io.emit('auction:started', { auctionId: auction._id.toString() });
    }, startDelay);
  }

  if (endDelay > 0) {
    setTimeout(async () => {
      const finalAuction = await Auction.findById(auction._id);
      if (finalAuction.status !== 'live') return;

      const winningBid = await Bid.findOne({ auction: auction._id }).sort({ amount: -1 }).populate('bidder', 'name email');

      finalAuction.status = 'ended';
      if (winningBid) {
        finalAuction.winner = winningBid.bidder._id;
      }
      await finalAuction.save();

      io.to(`auction:${auction._id}`).emit('auction:ended', {
        auctionId: auction._id.toString(),
        winner: winningBid ? { id: winningBid.bidder._id, name: winningBid.bidder.name, amount: winningBid.amount } : null,
      });
    }, endDelay);
  }
}

module.exports = router;