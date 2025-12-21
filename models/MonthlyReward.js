// File: ./models/MonthlyReward.js
import mongoose from 'mongoose';

/**
 * MonthlyReward Model
 * Tracks monthly reward distribution for transparency and auditing
 * 
 * Used for:
 * - Recording who received what rewards
 * - Preventing duplicate reward distribution
 * - Reward history and analytics
 */
const monthlyRewardSchema = new mongoose.Schema({
  // ==========================================
  // IDENTIFICATION
  // ==========================================
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
    index: true
  },
  
  year: {
    type: Number,
    required: true,
    min: 2020,
    index: true
  },
  
  category: {
    type: String,
    enum: ['global', 'students', 'teachers'],
    required: true,
    index: true
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // ==========================================
  // REWARD DETAILS
  // ==========================================
  rank: {
    type: Number,
    required: true,
    min: 1
  },
  
  tier: {
    type: String,
    enum: ['CHAMPION', 'ELITE', 'ACHIEVER', 'PERFORMER'],
    required: true,
    index: true
  },
  
  coinsAwarded: {
    type: Number,
    required: true,
    min: 0
  },
  
  badgeAwarded: {
    type: String,
    required: true
  },
  
  // ==========================================
  // REFERENCES
  // ==========================================
  snapshotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MonthlyRankingSnapshot',
    required: true,
    index: true
  },
  
  // ==========================================
  // STATUS
  // ==========================================
  status: {
    type: String,
    enum: ['pending', 'awarded', 'failed'],
    default: 'pending',
    index: true
  },
  
  errorMessage: {
    type: String,
    default: null
  },
  
  awardedAt: {
    type: Date,
    default: null
  }
  
}, {
  timestamps: true
});

// Compound indexes for fast lookups
monthlyRewardSchema.index({ userId: 1, year: 1, month: 1 });
monthlyRewardSchema.index({ year: 1, month: 1, category: 1, tier: 1 });
monthlyRewardSchema.index({ status: 1, year: 1, month: 1 });

// Static methods
monthlyRewardSchema.statics.findByUser = function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ year: -1, month: -1 })
    .limit(limit)
    .populate('snapshotId', 'month year category');
};

monthlyRewardSchema.statics.findByMonth = function(month, year, category) {
  return this.find({ month, year, category })
    .populate('userId', 'name email role')
    .sort({ rank: 1 });
};

monthlyRewardSchema.statics.findPending = function() {
  return this.find({ status: 'pending' }).sort({ year: 1, month: 1 });
};

const MonthlyReward = mongoose.model('MonthlyReward', monthlyRewardSchema);

export default MonthlyReward;

