// File: ./models/MonthlyRewardJob.js
import mongoose from 'mongoose';

/**
 * MonthlyRewardJob Schema
 * Tracks the processing of monthly rewards as a distributed job queue
 */
const monthlyRewardJobSchema = new mongoose.Schema({
  // Job Identification
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
  category: {
    type: String,
    enum: ['students', 'teachers'],
    required: true
  },
  
  // Job Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  
  // Progress Tracking
  totalUsers: {
    type: Number,
    default: 0
  },
  processedUsers: {
    type: Number,
    default: 0
  },
  failedUsers: {
    type: Number,
    default: 0
  },
  
  // Batch Processing
  currentBatch: {
    type: Number,
    default: 0
  },
  totalBatches: {
    type: Number,
    default: 0
  },
  batchSize: {
    type: Number,
    default: 50
  },
  
  // Snapshot Reference
  snapshotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MonthlyRankingSnapshot'
  },
  
  // Timing & Performance
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  lastProcessedAt: {
    type: Date
  },
  processingDuration: {
    type: Number // in seconds
  },
  
  // Error Handling
  errorLog: [{
    userId: mongoose.Schema.Types.ObjectId,
    rank: Number,
    error: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  lastError: {
    type: String
  },
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  
  // Statistics
  stats: {
    champion: { type: Number, default: 0 },
    elite: { type: Number, default: 0 },
    achiever: { type: Number, default: 0 },
    performer: { type: Number, default: 0 },
    unplaced: { type: Number, default: 0 },
    totalCoinsAwarded: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Compound index for uniqueness
monthlyRewardJobSchema.index({ month: 1, year: 1, category: 1 }, { unique: true });

// Index for finding pending jobs
monthlyRewardJobSchema.index({ status: 1, category: 1 });

// Static Methods

/**
 * Find or create job for a month/year/category
 */
monthlyRewardJobSchema.statics.findOrCreateJob = async function(month, year, category) {
  let job = await this.findOne({ month, year, category });
  
  if (!job) {
    job = await this.create({
      month,
      year,
      category,
      status: 'pending'
    });
  }
  
  return job;
};

/**
 * Get pending jobs that need processing
 */
monthlyRewardJobSchema.statics.getPendingJobs = async function() {
  return this.find({
    status: { $in: ['pending', 'processing'] },
    $or: [
      { lastProcessedAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) } }, // Stale (5 min)
      { lastProcessedAt: null }
    ]
  }).sort({ createdAt: 1 });
};

/**
 * Mark job as processing
 */
monthlyRewardJobSchema.methods.markProcessing = async function() {
  this.status = 'processing';
  this.lastProcessedAt = new Date();
  if (!this.startedAt) {
    this.startedAt = new Date();
  }
  return this.save();
};

/**
 * Mark job as completed
 */
monthlyRewardJobSchema.methods.markCompleted = async function() {
  this.status = 'completed';
  this.completedAt = new Date();
  if (this.startedAt) {
    this.processingDuration = (this.completedAt - this.startedAt) / 1000;
  }
  return this.save();
};

/**
 * Mark job as failed
 */
monthlyRewardJobSchema.methods.markFailed = async function(error) {
  this.status = 'failed';
  this.lastError = error;
  this.retryCount += 1;
  return this.save();
};

/**
 * Update progress
 */
monthlyRewardJobSchema.methods.updateProgress = async function(processed, failed = 0) {
  this.processedUsers += processed;
  this.failedUsers += failed;
  this.lastProcessedAt = new Date();
  return this.save();
};

/**
 * Can retry?
 */
monthlyRewardJobSchema.methods.canRetry = function() {
  return this.retryCount < this.maxRetries;
};

const MonthlyRewardJob = mongoose.model('MonthlyRewardJob', monthlyRewardJobSchema);

export default MonthlyRewardJob;

