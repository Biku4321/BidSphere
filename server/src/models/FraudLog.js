const mongoose = require('mongoose');

const fraudLogSchema = new mongoose.Schema({
  auction: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['shill_bidding', 'rapid_bidding', 'bid_manipulation', 'bot_activity', 'coordinated_bidding', 'other'],
    required: true,
  },
  riskScore: { type: Number, min: 0, max: 100, required: true },
  details: { type: Object },
  isResolved: { type: Boolean, default: false },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,
  action: {
    type: String,
    enum: ['flagged', 'warned', 'suspended', 'dismissed'],
    default: 'flagged',
  },
}, { timestamps: true });

module.exports = mongoose.model('FraudLog', fraudLogSchema);