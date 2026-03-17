const express = require('express');
const router = express.Router();
const Wallet = require('../models/Wallet');
const { protect } = require('../middleware/auth');

// ── GET /api/wallet ─── My wallet ────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) wallet = await Wallet.create({ user: req.user._id, balance: 0 });
    res.json({ wallet });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/wallet/add-credits ─── Add credits (mock payment) ─
router.post('/add-credits', protect, async (req, res) => {
  const { amount, paymentRef } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  if (amount > 100000) return res.status(400).json({ error: 'Max single top-up is ₹1,00,000' });

  try {
    // In production: verify payment with Razorpay/Stripe before crediting
    const wallet = await Wallet.findOne({ user: req.user._id });
    await wallet.addCredits(amount, `Credits purchased — ₹${amount}`, 'credit_purchase', paymentRef);
    res.json({ wallet, message: `₹${amount} credits added successfully!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/wallet/transactions ─── Transaction history ─
router.get('/transactions', protect, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id });
    const transactions = wallet?.transactions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50) || [];
    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;