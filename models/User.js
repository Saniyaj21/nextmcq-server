import mongoose from 'mongoose';
import { LEVEL_SYSTEM, RANKING_SYSTEM, getRankingScoreAggregation } from '../constants/rewards.js';

const userSchema = new mongoose.Schema({
  // ==========================================
  // IDENTITY & BASIC INFORMATION
  // ==========================================
  name: {
    type: String,
    trim: true
  },

  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },

  // ==========================================
  // PROFILE IMAGE (Cloudinary)
  // ==========================================
  profileImage: {
    url: {
      type: String, // Cloudinary URL
      default: null
    },
    publicId: {
      type: String, // Cloudinary public ID for deletion
      default: null
    },
    uploadedAt: {
      type: Date,
      default: null
    }
  },

  // ==========================================
  // ROLE & ACADEMIC CONTEXT
  // ==========================================
  role: {
    type: String,
    enum: ['student', 'teacher'],
    default: 'student'
  },

  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: false
  },

  subjects: [{
    type: String,
    trim: true
  }],

  // ==========================================
  // ACCOUNT MANAGEMENT
  // ==========================================
  isActive: {
    type: Boolean,
    default: true
  },

  isProfileComplete: {
    type: Boolean,
    default: false
  },

  // ==========================================
  // AUTHENTICATION & SECURITY
  // ==========================================
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
    type: Date,
    default: null
  },

  token: {
    type: String,
    default: null
  },

  // ==========================================
  // GAMIFICATION & PROGRESS TRACKING
  // ==========================================
  rewards: {
    // Common rewards for both students and teachers
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
    loginStreak: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  // Student-specific 
  student: {
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
    }
  },

  // Teacher-specific 
  teacher: {
    testsCreated: {
      type: Number,
      default: 0,
      min: 0
    },
    questionsCreated: {
      type: Number,
      default: 0,
      min: 0
    },
    studentsTaught: {
      type: Number,
      default: 0,
      min: 0
    },
    totalAttemptsOfStudents: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // ==========================================
  // SOCIAL & REFERRAL SYSTEM
  // ==========================================
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
userSchema.methods.generateReferralCode = function () {
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

userSchema.methods.calculateLevel = function () {
  return LEVEL_SYSTEM.calculateLevelFromXP(this.rewards.xp);
};

userSchema.methods.addRewards = function (coins = 0, xp = 0, source = 'unknown') {
  this.rewards.coins += coins;
  this.rewards.xp += xp;

  // Update level based on new XP
  const newLevel = this.calculateLevel();
  this.rewards.level = newLevel;

  return this.save();
};

userSchema.methods.calculateAccuracy = function () {
  // For students: calculate based on test performance
  if (this.role === 'student') {
    if (this.student.totalQuestions === 0) return 0;
    return Math.round((this.student.correctAnswers / this.student.totalQuestions) * 100);
  }

  return 0;
};

userSchema.methods.calculateRankingScore = function () {
  if (this.role === 'student') {
    // Calculate accuracy: (correctAnswers / totalQuestions) * 100
    const accuracy = this.student.totalQuestions > 0
      ? Math.round((this.student.correctAnswers / this.student.totalQuestions) * 100)
      : 0;

    // Return: (totalTests * TESTS_WEIGHT) + (accuracy * ACCURACY_WEIGHT)
    const { TESTS_WEIGHT, ACCURACY_WEIGHT } = RANKING_SYSTEM.SCORE_FORMULA;
    return (this.student.totalTests * TESTS_WEIGHT) + (accuracy * ACCURACY_WEIGHT);
  } else if (this.role === 'teacher') {
    // For teachers: (testsCreated * 10) + (totalAttemptsOfStudents * 10)
    const testsScore = this.teacher.testsCreated * 10;
    const attemptsScore = this.teacher.totalAttemptsOfStudents * 10;
    return testsScore + attemptsScore;
  }
  return 0;
};

// Static methods
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

// findByEmailWithInstitute method removed - institute no longer required

userSchema.statics.findByReferralCode = function (code) {
  return this.findOne({ referralCode: code });
};

userSchema.statics.getLeaderboard = function (category = 'global', limit = 100, instituteId = null) {
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
        'student.totalTests': 1,
        'student.correctAnswers': 1,
        'student.totalQuestions': 1,
        'teacher.testsCreated': 1,
        'teacher.questionsCreated': 1,
        'teacher.averageRating': 1,
        'teacher.totalAttempts': 1,
        rankingScore: 1
      }
    }
  );

  return this.aggregate(pipeline);
};

userSchema.statics.getUserRanking = async function (userId, category = 'global') {
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

// Search users by name or email
userSchema.statics.searchUsers = function (searchTerm, limit = 30) {
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
