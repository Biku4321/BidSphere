const mongoose = require('mongoose');

const auctionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  category: {
    type: String,
    enum: ['electronics', 'collectibles', 'art', 'fashion', 'vehicles', 'real-estate', 'other'],
    required: true,
  },
  images: [{ type: String }],

  // Pricing
  startingPrice: { type: Number, required: true, min: 0 },
  currentPrice: { type: Number, default: 0 },
  reservePrice: { type: Number, default: 0 },
  bidIncrement: { type: Number, default: 10 },
  buyNowPrice: { type: Number, default: null },

  // Timing
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  originalEndTime: { type: Date },  // for anti-snipe tracking

  // Status
  status: {
    type: String,
    enum: ['draft', 'upcoming', 'live', 'ended', 'cancelled'],
    default: 'draft',
  },

  // Participants
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bidCount: { type: Number, default: 0 },

  // Anti-snipe: extend by 30s if bid placed in last 30s
  antiSnipeExtensions: { type: Number, default: 0 },
  antiSnipeWindow: { type: Number, default: 30 },   // seconds
  antiSnipeExtend: { type: Number, default: 30 },   // seconds to add

  // AI fields
  aiPredictedPrice: { type: Number, default: null },
  aiConfidence: { type: Number, default: null },

  // Fraud flags
  fraudFlags: [{
    reason: String,
    userId: mongoose.Schema.Types.ObjectId,
    timestamp: Date,
    riskScore: Number,
  }],
  fraudRiskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low',
  },

  tags: [{ type: String }],
}, { timestamps: true });

auctionSchema.index({ status: 1, endTime: 1 });
auctionSchema.index({ category: 1 });
auctionSchema.index({ createdBy: 1 });

auctionSchema.virtual('isActive').get(function () {
  return this.status === 'live' && this.endTime > new Date();
});

module.exports = mongoose.model('Auction', auctionSchema);