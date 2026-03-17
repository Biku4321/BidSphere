const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['credit_purchase', 'bid_placed', 'bid_refund', 'win_deduction', 'admin_credit'],
    required: true,
  },
  amount: { type: Number, required: true },
  description: { type: String },
  auctionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction' },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed',
  },
  paymentRef: String,
  timestamp: { type: Date, default: Date.now },
});

const walletSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  balance: { type: Number, default: 0, min: 0 },
  lockedBalance: { type: Number, default: 0 },
  totalCreditsEarned: { type: Number, default: 0 },
  totalCreditsSpent: { type: Number, default: 0 },
  transactions: [transactionSchema],
}, { timestamps: true });

walletSchema.methods.availableBalance = function () {
  return this.balance - this.lockedBalance;
};

// ✅ FIX - 'next' parameter hataya, async/await use kiya
walletSchema.methods.addCredits = async function (amount, description, type, ref) {
  this.balance += amount;
  this.totalCreditsEarned += amount;
  this.transactions.push({
    type: type || 'credit_purchase',
    amount,
    description,
    paymentRef: ref || null,
    status: 'completed',
  });
  return this.save();
};

walletSchema.methods.deductCredits = async function (amount, description, type, auctionId) {
  if (this.availableBalance() < amount) {
    throw new Error('Insufficient credits');
  }
  this.balance -= amount;
  this.totalCreditsSpent += amount;
  this.transactions.push({
    type: type || 'bid_placed',
    amount: -amount,
    description,
    auctionId: auctionId || null,
    status: 'completed',
  });
  return this.save();
};

module.exports = mongoose.model('Wallet', walletSchema);