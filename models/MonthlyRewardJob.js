// File: ./models/MonthlyRewardJob.js
import mongoose from 'mongoose';

/**
 * MonthlyRewardJob Model
 * Tracks the overall monthly reward processing job status
 * Used as a "lock" to prevent duplicate processing
 */
const monthlyRewardJobSchema = new mongoose.Schema({
  // ==========================================
  // IDENTIFICATION
  // ==========================================
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  
  year: {
    type: Number,
    required: true,
    min: 2020
  },
  
  // ==========================================
  // STATUS TRACKING
  // ==========================================
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing',
    index: true
  },
  
  // ==========================================
  // TIMING
  // ==========================================
  startedAt: {
    type: Date,
    default: Date.now
  },
  
  completedAt: {
    type: Date,
    default: null
  },
  
  duration: {
    type: Number, // Duration in seconds
    default: null
  },
  
  // ==========================================
  // RESULTS
  // ==========================================
  results: {
    categories: {
      type: mongoose.Schema.Types.Mixed, // Flexible structure for results
      default: {}
    },
    totalRewardsAwarded: {
      type: Number,
      default: 0
    },
    totalCoinsAwarded: {
      type: Number,
      default: 0
    },
    errors: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    }
  },
  
  // ==========================================
  // ERROR HANDLING
  // ==========================================
  errorMessage: {
    type: String,
    default: null
  },
  
  errorStack: {
    type: String,
    default: null
  }
  
}, {
  timestamps: true
});

// Compound unique index to prevent duplicate processing
monthlyRewardJobSchema.index({ year: 1, month: 1 }, { unique: true });

// Static methods
monthlyRewardJobSchema.statics.findByMonth = function(month, year) {
  return this.findOne({ month, year });
};

monthlyRewardJobSchema.statics.findRecent = function(limit = 12) {
  return this.find()
    .sort({ year: -1, month: -1 })
    .limit(limit);
};

const MonthlyRewardJob = mongoose.model('MonthlyRewardJob', monthlyRewardJobSchema);

export default MonthlyRewardJob;

