// File: ./models/TestAttempt.js
// Enhanced model for tracking test attempts with test-taking functionality

import mongoose from 'mongoose';

const testAttemptSchema = new mongoose.Schema({
  // Relationships
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true
  },

  // Attempt tracking
  attemptNumber: {
    type: Number,
    default: 1,
    min: 1
  },

  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned', 'timed_out'],
    default: 'in_progress'
  },

  // Test-taking progress tracking
  currentQuestion: {
    type: Number,
    default: 0,
    min: 0
  },

  lastUpdated: {
    type: Date,
    default: Date.now
  },

  // Timing
  startedAt: {
    type: Date,
    default: Date.now
  },

  completedAt: {
    type: Date,
    default: null
  },

  timeLimit: {
    type: Number, // minutes
    default: 0
  },

  timeSpent: {
    type: Number, // seconds
    default: 0
  },

  // Server-side time validation to prevent manipulation
  serverStartTime: {
    type: Date,
    required: true
  },

  serverEndTime: {
    type: Date,
    default: null
  },

  clientTimeValidation: {
    startTime: {
      type: Date,
      default: null
    },
    endTime: {
      type: Date,
      default: null
    },
    timeDifference: {
      type: Number, // seconds
      default: 0
    }
  },

  // User answers
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    selectedAnswer: {
      type: Number,
      min: 0,
      max: 3
    },
    isCorrect: {
      type: Boolean,
      default: false
    },
    timeSpent: {
      type: Number, // seconds on this question
      default: 0
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Results
  score: {
    correct: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },

  // Enhanced rewards with breakdown
  rewards: {
    coins: {
      type: Number,
      default: 0
    },
    xp: {
      type: Number,
      default: 0
    },
    breakdown: {
      questionRewards: {
        coins: { type: Number, default: 0 },
        xp: { type: Number, default: 0 }
      },
      speedBonus: {
        coins: { type: Number, default: 0 },
        xp: { type: Number, default: 0 }
      },
      completionBonus: {
        coins: { type: Number, default: 0 },
        xp: { type: Number, default: 0 }
      }
    }
  },

  // Payment tracking
  coinsPaid: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for performance optimization
testAttemptSchema.index({ userId: 1, status: 1 });
testAttemptSchema.index({ testId: 1, userId: 1 });
testAttemptSchema.index({ testId: 1, completedAt: -1 });
testAttemptSchema.index({ userId: 1, completedAt: -1 });
testAttemptSchema.index({ serverStartTime: 1 });
testAttemptSchema.index({ status: 1, createdAt: -1 });

const TestAttempt = mongoose.model('TestAttempt', testAttemptSchema);

export default TestAttempt;
