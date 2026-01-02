// File: ./constants/rewards.js
// NextMCQ Rewards System Constants
// Centralized configuration for all reward amounts and system parameters

export const REWARDS = {
  // Question-Based Rewards (per correct answer)
  QUESTION_CORRECT: {
    FIRST_ATTEMPT: {
      coins: 10,
      xp: 10
    },
    REPEAT_ATTEMPT: {
      coins: 2,
      xp: 2
    }
  },

  // Speed Bonus (for completing test under 50% of time limit with 90%+ accuracy)
  SPEED_BONUS: {
    UNDER_50_PERCENT_TIME: {
      coins: 15,
      xp: 15
    }
  },




  // Referral Rewards
  REFERRAL: {
    SUCCESSFUL_SIGNUP: {
      REFERRER: { coins: 150, xp: 75 },
      REFEREE: { coins: 75, xp: 40 }
    }
  },

  // Teacher-Specific Rewards
  TEACHER: {
    CREATE_TEST: {
      coins: 50,
      xp: 75
    },
    STUDENT_ATTEMPT: {
      coins: 10,
      xp: 10
    }
  }
};

export const LEVEL_SYSTEM = {
  // Starting XP requirement for level 1
  BASE_XP: 100,

  // XP increase percentage per level (20%)
  XP_MULTIPLIER: 1.2,

  // Calculate XP required for a specific level
  calculateXPForLevel: (level) => {
    if (level <= 1) return 0;
    let totalXP = 0;
    let currentLevelXP = LEVEL_SYSTEM.BASE_XP;

    for (let i = 1; i < level; i++) {
      totalXP += currentLevelXP;
      currentLevelXP = Math.floor(currentLevelXP * LEVEL_SYSTEM.XP_MULTIPLIER);
    }

    return totalXP;
  },

  // Calculate level from total XP
  calculateLevelFromXP: (totalXP) => {
    if (totalXP < LEVEL_SYSTEM.BASE_XP) return 1;

    let level = 1;
    let xpUsed = 0;
    let currentLevelXP = LEVEL_SYSTEM.BASE_XP;

    while (xpUsed + currentLevelXP <= totalXP) {
      xpUsed += currentLevelXP;
      level++;
      currentLevelXP = Math.floor(currentLevelXP * LEVEL_SYSTEM.XP_MULTIPLIER);
    }

    return level;
  }
};

export const RANKING_SYSTEM = {
  // Ranking score calculation weights
  SCORE_FORMULA: {
    // Student ranking formula: (totalTests × TESTS_WEIGHT) + (correctAnswers × CORRECT_ANSWERS_WEIGHT)
    // Fast calculation: No division, no rounding - just simple multiplication and addition
    TESTS_WEIGHT: 15,              // Points per test completed (rewards participation)
    CORRECT_ANSWERS_WEIGHT: 1,     // Points per correct answer (rewards quality/skill)
    // Teacher ranking formula: totalAttemptsOfStudents × 1
    // Note: Teacher ranking is calculated directly in getRankingScoreAggregation()
    // and calculateRankingScore() method, not using these weights
  },

  // Monthly ranking rewards
  MONTHLY_RANKING_REWARDS: {
    CHAMPION: { // #1
      coins: 1000,
      xp: 500,
      badge: 'Monthly Champion'
    },
    ELITE: { // Top 10
      coins: 500,
      xp: 400,
      badge: 'Monthly Elite'
    },
    ACHIEVER: { // Top 50
      coins: 200,
      xp: 300,
      badge: 'Monthly Achiever'
    },
    PERFORMER: { // Top 100
      coins: 100,
      xp: 200,
      badge: 'Monthly Performer'
    },
    UNPLACED: { // After 100
      coins: 10,
      xp: 100,
      badge: 'Monthly Unplaced'
    }
  },

  // Ranking categories
  CATEGORIES: {
    GLOBAL: 'global',
    STUDENTS: 'students',
    TEACHERS: 'teachers',
    INSTITUTE: 'institute'
  },

  // Category labels for display
  CATEGORY_LABELS: {
    global: 'Global Rankings',
    students: 'Student Rankings',
    teachers: 'Teacher Rankings',
    institute: 'Institute Rankings'
  }
};

export const COIN_SPENDING = {
  // Premium features
  PREMIUM_TEST_ACCESS: 100
};

export const REVENUE_SHARE = {
  // Test fee revenue share: 80% to teacher, 20% platform fee
  TEACHER_SHARE: 0.8,  // 80%
  PLATFORM_SHARE: 0.2  // 20%
};

export const SYSTEM_LIMITS = {
  // Maximum daily rewards to prevent abuse
  MAX_DAILY_COINS: 1000,
  MAX_DAILY_XP: 2000,

  // Test attempt limits
  MAX_TEST_ATTEMPTS_PER_DAY: 50,

  // Test time limits (in minutes)
  TEST_TIME_LIMIT: {
    MIN: 1,        // Minimum 1 minute
    MAX: 60,       // Maximum 1 hour (60 minutes)
    DEFAULT: 30    // Default 30 minutes if not specified
  },

  // Referral limits
  MAX_REFERRALS_PER_DAY: 10
};

export const ACCURACY_THRESHOLDS = {
  PERFECT: 90,    // 90-100%
  HIGH: 80,       // 80-89%
  GOOD: 70,       // 70-79%
  AVERAGE: 60,    // 60-69%
  POOR: 0         // Below 60%
};

// Helper function to get accuracy bonus tier
export const getAccuracyTier = (accuracy) => {
  if (accuracy >= ACCURACY_THRESHOLDS.PERFECT) return 'PERFECT';
  if (accuracy >= ACCURACY_THRESHOLDS.HIGH) return 'HIGH';
  if (accuracy >= ACCURACY_THRESHOLDS.GOOD) return 'GOOD';
  if (accuracy >= ACCURACY_THRESHOLDS.AVERAGE) return 'AVERAGE';
  return 'POOR';
};

// Helper function to calculate speed bonus for test completion
export const calculateSpeedBonus = (timeLimit, actualTime) => {
  // Time limit is in minutes, convert to seconds for calculation
  const timeLimitSeconds = timeLimit * 60;
  const fiftyPercentTime = timeLimitSeconds * 0.5;

  // If user completed test under 50% of time limit
  if (actualTime <= fiftyPercentTime) {
    return {
      coins: REWARDS.SPEED_BONUS.UNDER_50_PERCENT_TIME.coins,
      xp: REWARDS.SPEED_BONUS.UNDER_50_PERCENT_TIME.xp
    };
  }

  // No speed bonus
  return { coins: 0, xp: 0 };
};

// MongoDB aggregation pipeline for ranking score calculation
export const getRankingScoreAggregation = () => {
  return {
    $add: [
      // Handle different roles with conditional logic
      {
        $cond: {
          if: { $eq: ['$role', 'student'] },
          then: {
            // Student ranking: (totalTests × TESTS_WEIGHT) + (correctAnswers × CORRECT_ANSWERS_WEIGHT)
            // Fast calculation: No division, no rounding - optimized for performance
            // Use $ifNull to handle null/undefined values (treat as 0)
            $add: [
              { $multiply: [{ $ifNull: ['$student.totalTests', 0] }, RANKING_SYSTEM.SCORE_FORMULA.TESTS_WEIGHT] },
              { $multiply: [{ $ifNull: ['$student.correctAnswers', 0] }, RANKING_SYSTEM.SCORE_FORMULA.CORRECT_ANSWERS_WEIGHT] }
            ]
          },
          else: {
            // For teachers: totalAttemptsOfStudents × 1
            // Use $ifNull to handle null/undefined values (treat as 0)
            $multiply: [{ $ifNull: ['$teacher.totalAttemptsOfStudents', 0] }, 1]
          }
        }
      }
    ]
  };
};

export default {
  REWARDS,
  LEVEL_SYSTEM,
  RANKING_SYSTEM,
  COIN_SPENDING,
  REVENUE_SHARE,
  SYSTEM_LIMITS,
  ACCURACY_THRESHOLDS,
  getAccuracyTier,
  calculateSpeedBonus,
  getRankingScoreAggregation
};
