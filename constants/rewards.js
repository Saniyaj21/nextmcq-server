// File: ./constants/rewards.js
// NextMCQ Rewards System Constants
// Centralized configuration for all reward amounts and system parameters

export const REWARDS = {
  // Test-Based Rewards
  TEST_COMPLETION: {
    FIRST_ATTEMPT: {
      coins: 50,
      xp: 100
    },
    REPEAT_ATTEMPT: {
      coins: 10,
      xp: 20
    }
  },

  // Accuracy Bonuses (multipliers applied to base test rewards)
  ACCURACY_BONUSES: {
    PERFECT: { // 90-100%
      coinMultiplier: 2.0,
      bonusXP: 50
    },
    HIGH: { // 80-89%
      coinMultiplier: 1.5,
      bonusXP: 30
    },
    GOOD: { // 70-79%
      coinMultiplier: 1.2,
      bonusXP: 15
    },
    AVERAGE: { // 60-69%
      coinMultiplier: 1.0,
      bonusXP: 5
    },
    POOR: { // Below 60%
      coinMultiplier: 1.0,
      bonusXP: 0
    }
  },


  // Daily Activities
  DAILY_ACTIVITIES: {
    LOGIN: {
      coins: 5,
      xp: 10
    },
    FIRST_TEST_OF_DAY: {
      coins: 15,
      xp: 20
    }
  },

  // Streak Bonuses
  STREAK_BONUSES: {
    50: { coins: 1000, xp: 500 },
    100: { coins: 2500, xp: 1000 },
    200: { coins: 5000, xp: 2000 }
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
  
  // XP increase percentage per level (10%)
  XP_MULTIPLIER: 1.1,
  
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
    TESTS_WEIGHT: 10,      // Points per test completed
    ACCURACY_WEIGHT: 10    // Points per 1% accuracy (max 1,000 for 100%)
  },
  
  // Monthly ranking rewards
  MONTHLY_RANKING_REWARDS: {
    CHAMPION: { // #1
      coins: 1000,
      badge: 'Monthly Champion'
    },
    ELITE: { // Top 10
      coins: 500,
      badge: 'Monthly Elite'
    },
    ACHIEVER: { // Top 50
      coins: 200,
      badge: 'Monthly Achiever'
    },
    PERFORMER: { // Top 100
      coins: 100,
      badge: 'Monthly Performer'
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

export const SYSTEM_LIMITS = {
  // Maximum daily rewards to prevent abuse
  MAX_DAILY_COINS: 1000,
  MAX_DAILY_XP: 2000,
  
  // Test attempt limits
  MAX_TEST_ATTEMPTS_PER_DAY: 50,
  
  // Referral limits
  MAX_REFERRALS_PER_DAY: 10,
  
  // Login streak maximum (resets after this)
  MAX_LOGIN_STREAK: 365
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

// Helper function to calculate test completion rewards
export const calculateTestRewards = (isFirstAttempt, accuracy) => {
  // Base rewards
  const base = isFirstAttempt ? REWARDS.TEST_COMPLETION.FIRST_ATTEMPT : REWARDS.TEST_COMPLETION.REPEAT_ATTEMPT;
  let coins = base.coins;
  let xp = base.xp;
  
  // Apply accuracy bonus
  const accuracyTier = getAccuracyTier(accuracy);
  const accuracyBonus = REWARDS.ACCURACY_BONUSES[accuracyTier];
  
  coins = Math.floor(coins * accuracyBonus.coinMultiplier);
  xp += accuracyBonus.bonusXP;
  
  return { coins, xp };
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
            // Student ranking: (totalTests * 10) + (accuracy * 10)
            $add: [
              { $multiply: ['$student.totalTests', 10] },
              {
                $cond: {
                  if: { $eq: ['$student.totalQuestions', 0] },
                  then: 0,
                  else: {
                    $multiply: [
                      { $round: [{ $multiply: [{ $divide: ['$student.correctAnswers', '$student.totalQuestions'] }, 100] }] },
                      10
                    ]
                  }
                }
              }
            ]
          },
          else: {
            // For teachers: (testsCreated * 10) + (totalAttempts * 10)
            $add: [
              { $multiply: ['$teacher.testsCreated', 10] },
              { $multiply: ['$teacher.totalAttempts', 10] }
            ]
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
  SYSTEM_LIMITS,
  ACCURACY_THRESHOLDS,
  getAccuracyTier,
  calculateTestRewards,
  getRankingScoreAggregation
};
