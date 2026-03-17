const express = require('express');
const router = express.Router();
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const User = require('../models/User');
const FraudLog = require('../models/FraudLog');
const Wallet = require('../models/Wallet');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

// ── GET /api/admin/dashboard ─── Stats overview ──────────
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers, totalAuctions, liveAuctions,
      totalBids, fraudFlags, recentUsers
    ] = await Promise.all([
      User.countDocuments(),
      Auction.countDocuments(),
      Auction.countDocuments({ status: 'live' }),
      Bid.countDocuments(),
      FraudLog.countDocuments({ isResolved: false }),
      User.find().sort({ createdAt: -1 }).limit(5).select('name email createdAt'),
    ]);

    const revenue = await Bid.aggregate([
      { $match: { isWinning: true } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.json({
      stats: {
        totalUsers, totalAuctions, liveAuctions,
        totalBids, fraudFlags,
        totalRevenue: revenue[0]?.total || 0,
      },
      recentUsers,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/fraud-logs ─── Fraud reports ──────────
router.get('/fraud-logs', async (req, res) => {
  try {
    const logs = await FraudLog.find()
      .populate('auction', 'title')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/admin/fraud-logs/:id/resolve ─── Resolve ──
router.patch('/fraud-logs/:id/resolve', async (req, res) => {
  try {
    const log = await FraudLog.findByIdAndUpdate(
      req.params.id,
      { isResolved: true, resolvedBy: req.user._id, resolvedAt: new Date(), action: req.body.action || 'dismissed' },
      { new: true }
    );
    res.json({ log });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/users ─── All users ───────────────────
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select('-password');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/admin/users/:id/toggle ─── Suspend/activate user ─
router.patch('/users/:id/toggle', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/credits/:userId ─── Manually add credits ─
router.post('/credits/:userId', async (req, res) => {
  const { amount, reason } = req.body;
  try {
    const wallet = await Wallet.findOne({ user: req.params.userId });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
    await wallet.addCredits(amount, reason || 'Admin credit', 'admin_credit');
    res.json({ wallet, message: `Added ₹${amount} credits to user` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;