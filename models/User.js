import mongoose from 'mongoose';
import { LEVEL_SYSTEM, RANKING_SYSTEM } from '../constants/rewards.js';

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
userSchema.methods.isTeacher = function() {
  return this.role === 'teacher';
};

userSchema.methods.isStudent = function() {
  return this.role === 'student';
};

// OTP related methods
userSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  this.otp = otp;
  this.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
  return otp;
};

userSchema.methods.isOTPValid = function(enteredOTP) {
  return this.otp === enteredOTP && this.otpExpiry > new Date();
};

userSchema.methods.clearOTP = function() {
  this.otp = null;
  this.otpExpiry = null;
  return this.save();
};

userSchema.methods.verifyEmail = function() {
  this.isEmailVerified = true;
  this.clearOTP();
  return this.save();
};

userSchema.methods.updateLoginInfo = function() {
  this.lastLoginAt = new Date();
  return this.save();
};

userSchema.methods.completeProfile = function(profileData) {
  Object.assign(this, profileData);
  this.isProfileComplete = true;
  return this.save();
};

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

userSchema.methods.spendCoins = function(amount) {
  if (this.rewards.coins < amount) {
    throw new Error('Insufficient coins');
  }
  this.rewards.coins -= amount;
  return this.save();
};

userSchema.methods.updateTestStats = function(correctAnswers, totalQuestions, isFirstAttempt = false) {
  if (isFirstAttempt) {
    this.rewards.totalTests += 1;
  }
  this.rewards.correctAnswers += correctAnswers;
  this.rewards.totalQuestions += totalQuestions;
  return this.save();
};

userSchema.methods.updateLoginStreak = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastLogin = this.rewards.lastLoginDate;
  
  if (!lastLogin) {
    // First login
    this.rewards.loginStreak = 1;
  } else {
    const lastLoginDate = new Date(lastLogin);
    lastLoginDate.setHours(0, 0, 0, 0);
    
    const daysDiff = (today - lastLoginDate) / (1000 * 60 * 60 * 24);
    
    if (daysDiff === 1) {
      // Consecutive day
      this.rewards.loginStreak += 1;
    } else if (daysDiff > 1) {
      // Streak broken
      this.rewards.loginStreak = 1;
    }
    // Same day login doesn't change streak
  }
  
  this.rewards.lastLoginDate = today;
  return this.save();
};

userSchema.methods.calculateAccuracy = function() {
  if (this.rewards.totalQuestions === 0) return 0;
  return Math.round((this.rewards.correctAnswers / this.rewards.totalQuestions) * 100);
};

userSchema.methods.calculateRankingScore = function() {
  return (this.rewards.totalTests * RANKING_SYSTEM.SCORE_FORMULA.TESTS_WEIGHT) + 
         (this.calculateAccuracy() * RANKING_SYSTEM.SCORE_FORMULA.ACCURACY_WEIGHT);
};

// Institute methods removed - institute field is now optional


// Static methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// findByEmailWithInstitute method removed - institute no longer required

userSchema.statics.findByRole = function(role) {
  return this.find({ role });
};

userSchema.statics.findByReferralCode = function(code) {
  return this.findOne({ referralCode: code });
};

userSchema.statics.getLeaderboard = function(category = 'global', limit = 100) {
  const matchStage = {};
  
  // Add category-specific filters
  if (category === 'students') {
    matchStage.role = 'student';
  } else if (category === 'teachers') {
    matchStage.role = 'teacher';
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $addFields: {
        rankingScore: {
          $add: [
            { $multiply: ['$rewards.totalTests', RANKING_SYSTEM.SCORE_FORMULA.TESTS_WEIGHT] },
            { 
              $multiply: [
                { 
                  $cond: {
                    if: { $eq: ['$rewards.totalQuestions', 0] },
                    then: 0,
                    else: { 
                      $multiply: [
                        { $divide: ['$rewards.correctAnswers', '$rewards.totalQuestions'] },
                        RANKING_SYSTEM.SCORE_FORMULA.ACCURACY_WEIGHT
                      ]
                    }
                  }
                },
                RANKING_SYSTEM.SCORE_FORMULA.ACCURACY_WEIGHT
              ]
            }
          ]
        }
      }
    },
    { $sort: { rankingScore: -1 } },
    { $limit: limit },
    {
      $project: {
        name: 1,
        email: 1,
        role: 1,
        'rewards.coins': 1,
        'rewards.xp': 1,
        'rewards.level': 1,
        'rewards.totalTests': 1,
        'rewards.correctAnswers': 1,
        'rewards.totalQuestions': 1,
        rankingScore: 1
      }
    }
  ]);
};

userSchema.statics.getUserRanking = function(userId, category = 'global') {
  const matchStage = {};
  
  if (category === 'students') {
    matchStage.role = 'student';
  } else if (category === 'teachers') {
    matchStage.role = 'teacher';
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $addFields: {
        rankingScore: {
          $add: [
            { $multiply: ['$rewards.totalTests', RANKING_SYSTEM.SCORE_FORMULA.TESTS_WEIGHT] },
            { 
              $multiply: [
                { 
                  $cond: {
                    if: { $eq: ['$rewards.totalQuestions', 0] },
                    then: 0,
                    else: { 
                      $multiply: [
                        { $divide: ['$rewards.correctAnswers', '$rewards.totalQuestions'] },
                        RANKING_SYSTEM.SCORE_FORMULA.ACCURACY_WEIGHT
                      ]
                    }
                  }
                },
                RANKING_SYSTEM.SCORE_FORMULA.ACCURACY_WEIGHT
              ]
            }
          ]
        }
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
  ]);
};

// Institute-related static methods removed

// Institute count middleware removed - no longer needed

const User = mongoose.model('User', userSchema);

export default User;
