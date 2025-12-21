// File: ./models/MonthlyRankingSnapshot.js
import mongoose from 'mongoose';

/**
 * MonthlyRankingSnapshot Model
 * Stores monthly ranking snapshots for historical records and verification
 * 
 * Used for:
 * - Tracking monthly rankings at end of month
 * - Verifying reward distribution
 * - Historical leaderboard data
 */
const monthlyRankingSnapshotSchema = new mongoose.Schema({
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
  
  // ==========================================
  // SNAPSHOT DATA
  // ==========================================
  rankings: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rank: {
      type: Number,
      required: true,
      min: 1
    },
    score: {
      type: Number,
      required: true,
      min: 0
    },
    // Snapshot data for reference (in case user is deleted)
    userName: {
      type: String,
      default: null
    },
    userEmail: {
      type: String,
      default: null
    },
    role: {
      type: String,
      enum: ['student', 'teacher'],
      required: true
    }
  }],
  
  // ==========================================
  // METADATA
  // ==========================================
  totalUsers: {
    type: Number,
    required: true,
    min: 0
  },
  
  snapshotDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  processed: {
    type: Boolean,
    default: false,
    index: true
  },
  
  processedAt: {
    type: Date,
    default: null
  }
  
}, {
  timestamps: true
});

// Compound index for fast lookups
monthlyRankingSnapshotSchema.index({ year: 1, month: 1, category: 1 }, { unique: true });
monthlyRankingSnapshotSchema.index({ processed: 1, year: 1, month: 1 });

// Static methods
monthlyRankingSnapshotSchema.statics.findByMonth = function(month, year, category) {
  return this.findOne({ month, year, category });
};

monthlyRankingSnapshotSchema.statics.findUnprocessed = function() {
  return this.find({ processed: false }).sort({ year: 1, month: 1 });
};

const MonthlyRankingSnapshot = mongoose.model('MonthlyRankingSnapshot', monthlyRankingSnapshotSchema);

export default MonthlyRankingSnapshot;

