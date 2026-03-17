const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  auction: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true },
  bidder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 0 },
  isAutoBid: { type: Boolean, default: false },
  isWinning: { type: Boolean, default: false },

  // Fraud detection fields
  ipAddress: String,
  userAgent: String,
  fraudScore: { type: Number, default: 0 },
  isFlagged: { type: Boolean, default: false },
  flagReason: String,

  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

bidSchema.index({ auction: 1, amount: -1 });
bidSchema.index({ bidder: 1 });
bidSchema.index({ auction: 1, timestamp: -1 });

module.exports = mongoose.model('Bid', bidSchema);