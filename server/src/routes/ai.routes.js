const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/auth');
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');

const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// ── POST /api/ai/predict/:auctionId ─── Price prediction ─
router.get('/predict/:auctionId', protect, async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.auctionId);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    const bidHistory = await Bid.find({ auction: req.params.auctionId })
      .sort({ timestamp: 1 })
      .select('amount timestamp');

    const response = await axios.post(`${AI_URL}/predict/price`, {
      auction_id: req.params.auctionId,
      category: auction.category,
      starting_price: auction.startingPrice,
      current_price: auction.currentPrice,
      bid_count: auction.bidCount,
      time_elapsed_pct: getTimeElapsedPct(auction),
      time_remaining_sec: Math.max(0, (new Date(auction.endTime) - new Date()) / 1000),
      bid_history: bidHistory.map(b => ({ amount: b.amount, timestamp: b.timestamp })),
    }, { timeout: 3000 });

    res.json(response.data);
  } catch (err) {
    // Fallback: simple heuristic if AI service is down
    const auction = await Auction.findById(req.params.auctionId);
    res.json({
      predicted_price: Math.round(auction.currentPrice * 1.15),
      confidence: 0.5,
      source: 'heuristic',
    });
  }
});

// ── GET /api/ai/strategy/:auctionId ─── Bidding strategy ─
router.get('/strategy/:auctionId', protect, async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.auctionId);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    const [myBids, allBids] = await Promise.all([
      Bid.find({ auction: req.params.auctionId, bidder: req.user._id }).sort({ amount: -1 }),
      Bid.find({ auction: req.params.auctionId }).sort({ timestamp: -1 }).limit(20),
    ]);

    const response = await axios.post(`${AI_URL}/strategy/recommend`, {
      auction_id: req.params.auctionId,
      current_price: auction.currentPrice,
      starting_price: auction.startingPrice,
      bid_increment: auction.bidIncrement,
      bid_count: auction.bidCount,
      time_remaining_sec: Math.max(0, (new Date(auction.endTime) - new Date()) / 1000),
      my_highest_bid: myBids[0]?.amount || 0,
      recent_bids: allBids.map(b => ({ amount: b.amount, timestamp: b.timestamp })),
      user_id: req.user._id.toString(),
    }, { timeout: 3000 });

    res.json(response.data);
  } catch (err) {
    res.json({
      recommendation: 'moderate',
      suggested_bid: null,
      winning_probability: null,
      message: 'AI strategy service temporarily unavailable',
      source: 'fallback',
    });
  }
});

function getTimeElapsedPct(auction) {
  const total = new Date(auction.endTime) - new Date(auction.startTime);
  const elapsed = new Date() - new Date(auction.startTime);
  return Math.min(1, Math.max(0, elapsed / total));
}

module.exports = router;
