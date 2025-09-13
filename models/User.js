import mongoose from 'mongoose';
import { LEVEL_SYSTEM, RANKING_SYSTEM, calculateRankingScore, getRankingScoreAggregation } from '../constants/rewards.js';

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  
  // Role
  role: {
    type: String,
    enum: ['student', 'teacher'],
    default: 'student'
  },
  
  // Academic Information
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: false
  },
  
  subjects: [{
    type: String,
    trim: true
  }],
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Authentication fields
  otp: {
    type: String,
    default: null
  },
  
  otpExpiry: {
    type: Date,
    default: null
  },

  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  lastLoginAt: {
    type: Date
  },
  
  // Profile completion status
  isProfileComplete: {
    type: Boolean,
    default: false
  },
  
  token: {
    type: String,
    default: null
  },

  // Rewards & Gamification System
  rewards: {
    coins: {
      type: Number,
      default: 0,
      min: 0
    },
    xp: {
      type: Number,
      default: 0,
      min: 0
    },
    level: {
      type: Number,
      default: 1,
      min: 1
    },
    totalTests: {
      type: Number,
      default: 0,
      min: 0
    },
    correctAnswers: {
      type: Number,
      default: 0,
      min: 0
    },
    totalQuestions: {
      type: Number,
      default: 0,
      min: 0
    },
    lastLoginDate: {
      type: Date,
      default: null
    },
    loginStreak: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Referral System
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  referralCode: {
    type: String,
    unique: true,
    sparse: true // Allow null values but enforce uniqueness when present
  }
  
}, {
  timestamps: true
});


// Instance methods


// Rewards System Methods
userSchema.methods.generateReferralCode = function() {
  if (!this.referralCode) {
    // Generate 8-character alphanumeric code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.referralCode = code;
  }
  return this.referralCode;
};

userSchema.methods.calculateLevel = function() {
  return LEVEL_SYSTEM.calculateLevelFromXP(this.rewards.xp);
};

userSchema.methods.addRewards = function(coins = 0, xp = 0, source = 'unknown') {
  this.rewards.coins += coins;
  this.rewards.xp += xp;

  // Update level based on new XP
  const newLevel = this.calculateLevel();
  this.rewards.level = newLevel;

  return this.save();
};

userSchema.methods.calculateAccuracy = function() {
  if (this.rewards.totalQuestions === 0) return 0;
  return Math.round((this.rewards.correctAnswers / this.rewards.totalQuestions) * 100);
};

userSchema.methods.calculateRankingScore = function() {
  return calculateRankingScore(
    this.rewards.totalTests, 
    this.rewards.correctAnswers, 
    this.rewards.totalQuestions
  );
};

// Institute methods removed - institute field is now optional


// Static methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// findByEmailWithInstitute method removed - institute no longer required

userSchema.statics.findByReferralCode = function(code) {
  return this.findOne({ referralCode: code });
};

userSchema.statics.getLeaderboard = function(category = 'global', limit = 100, instituteId = null) {
  const pipeline = [];

  // First stage: Match active users
  pipeline.push({
    $match: {
      isActive: true
    }
  });

  // Second stage: Lookup institute if needed
  if (category === 'institute' && instituteId) {
    const instituteObjectId = new mongoose.Types.ObjectId(instituteId);
    console.log('Adding institute filter:', {
      category,
      instituteId,
      instituteObjectId
    });
    pipeline.push({
      $match: {
        institute: instituteObjectId
      }
    });
  }

  // Third stage: Role-based filtering
  if (category === 'students') {
    pipeline.push({
      $match: { role: 'student' }
    });
  } else if (category === 'teachers') {
    pipeline.push({
      $match: { role: 'teacher' }
    });
  }

  // Add the rest of the pipeline stages
  pipeline.push(
    {
      $addFields: {
        rankingScore: getRankingScoreAggregation()
      }
    },
    { $sort: { rankingScore: -1 } },
    { $limit: limit },
    {
      $project: {
        name: 1,
        email: 1,
        role: 1,
        institute: 1,
        'rewards.coins': 1,
        'rewards.xp': 1,
        'rewards.level': 1,
        'rewards.totalTests': 1,
        'rewards.correctAnswers': 1,
        'rewards.totalQuestions': 1,
        rankingScore: 1
      }
    }
  );

  return this.aggregate(pipeline);
};

userSchema.statics.getUserRanking = async function(userId, category = 'global') {
  const pipeline = [];

  // First stage: Match active users
  pipeline.push({
    $match: {
      isActive: true
    }
  });

  // Handle institute category
  if (category === 'institute') {
    const user = await this.findById(userId).populate('institute');
    if (!user?.institute?._id) {
      return []; // Return empty result if no institute
    }
    pipeline.push({
      $match: {
        institute: new mongoose.Types.ObjectId(user.institute._id)
      }
    });
  }

  // Add role-based filtering
  if (category === 'students') {
    pipeline.push({
      $match: { role: 'student' }
    });
  } else if (category === 'teachers') {
    pipeline.push({
      $match: { role: 'teacher' }
    });
  }

  // Add the rest of the pipeline stages
  pipeline.push(
    {
      $addFields: {
        rankingScore: getRankingScoreAggregation()
      }
    },
    { $sort: { rankingScore: -1 } },
    {
      $group: {
        _id: null,
        users: { $push: { _id: '$_id', rankingScore: '$rankingScore' } }
      }
    },
    { $unwind: { path: '$users', includeArrayIndex: 'rank' } },
    { $match: { 'users._id': new mongoose.Types.ObjectId(userId) } },
    {
      $project: {
        rank: { $add: ['$rank', 1] },
        score: '$users.rankingScore'
      }
    }
  );

  return this.aggregate(pipeline);
};

// Institute-related static methods removed

// Institute count middleware removed - no longer needed

// Search users by name or email
userSchema.statics.searchUsers = function(searchTerm, limit = 30) {
  const regex = new RegExp(searchTerm, 'i');
  return this.find({
    $and: [
      { isActive: { $ne: false } }, // Only active users
      {
        $or: [
          { name: regex },
          { email: regex }
        ]
      }
    ]
  })
  .select('name email')
  .limit(limit)
  .sort({ name: 1 });
};

const User = mongoose.model('User', userSchema);

export default User;
