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
    TESTS_WEIGHT: 20,      // Points per test completed (increased)
    ACCURACY_WEIGHT: 5     // Points per 1% accuracy (reduced from 10)
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

// Helper function to calculate student streak status based on test submissions
// Uses calendar date logic instead of 24-hour timestamp calculations
export const calculateStudentStreakStatus = (lastTestSubmissionAt, currentSubmission) => {
  console.log(`[STREAK_CALC] Input - lastTestSubmissionAt: ${lastTestSubmissionAt}, currentSubmission: ${currentSubmission}`);

  if (!lastTestSubmissionAt) {
    // First test submission - start streak at 1
    console.log(`[STREAK_CALC] Result - First time user, setting streak to 1`);
    return { shouldIncrement: true, shouldReset: false, newStreak: 1 };
  }

  const lastSubmission = new Date(lastTestSubmissionAt);
  const currentTime = new Date(currentSubmission);

  // Get calendar dates (YYYY-MM-DD format) to ignore time components
  const lastSubmissionDate = lastSubmission.toISOString().split('T')[0]; // YYYY-MM-DD
  const currentSubmissionDate = currentTime.toISOString().split('T')[0]; // YYYY-MM-DD

  // Calculate the date that would be exactly 1 day before current date
  const yesterday = new Date(currentTime);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = yesterday.toISOString().split('T')[0];

  // Calculate the date that would be exactly 2 days before current date
  const dayBeforeYesterday = new Date(currentTime);
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
  const dayBeforeYesterdayDate = dayBeforeYesterday.toISOString().split('T')[0];

  console.log(`[STREAK_CALC] Date Analysis:`);
  console.log(`  - Last submission date: ${lastSubmissionDate}`);
  console.log(`  - Current submission date: ${currentSubmissionDate}`);
  console.log(`  - Yesterday date: ${yesterdayDate}`);
  console.log(`  - Day before yesterday: ${dayBeforeYesterdayDate}`);

  // Check if last activity was yesterday (maintains streak)
  const wasYesterday = lastSubmissionDate === yesterdayDate;

  // Check if last activity was day before yesterday (allows one missed day)
  const wasDayBeforeYesterday = lastSubmissionDate === dayBeforeYesterdayDate;

  // Check if last activity was today (same day - shouldn't happen but handle gracefully)
  const wasToday = lastSubmissionDate === currentSubmissionDate;

  // Check if last activity was more than 2 days ago (reset streak)
  const wasMoreThanTwoDaysAgo = lastSubmissionDate < dayBeforeYesterdayDate;

  console.log(`[STREAK_CALC] Activity checks:`);
  console.log(`  - Was yesterday: ${wasYesterday}`);
  console.log(`  - Was day before yesterday: ${wasDayBeforeYesterday}`);
  console.log(`  - Was today: ${wasToday}`);
  console.log(`  - Was more than 2 days ago: ${wasMoreThanTwoDaysAgo}`);

  let shouldIncrement = false;
  let shouldReset = false;
  let newStreak = 0;

  if (wasToday) {
    // Same day activity - don't change streak (already counted for today)
    console.log(`[STREAK_CALC] Result - Same day activity, no streak change`);
    shouldIncrement = false;
    shouldReset = false;
    newStreak = null; // Keep current streak
  } else if (wasYesterday) {
    // Yesterday's activity - increment streak
    console.log(`[STREAK_CALC] Result - Yesterday's activity, incrementing streak`);
    shouldIncrement = true;
    shouldReset = false;
    newStreak = null; // Increment current streak
  } else if (wasDayBeforeYesterday) {
    // Day before yesterday - allow missed day, increment streak
    console.log(`[STREAK_CALC] Result - Day before yesterday activity, incrementing streak (missed 1 day)`);
    shouldIncrement = true;
    shouldReset = false;
    newStreak = null; // Increment current streak
  } else if (wasMoreThanTwoDaysAgo) {
    // More than 2 days ago - reset streak
    console.log(`[STREAK_CALC] Result - Activity more than 2 days ago, resetting streak`);
    shouldIncrement = false;
    shouldReset = true;
    newStreak = 0;
  }

  console.log(`[STREAK_CALC] Final Result - shouldIncrement: ${shouldIncrement}, shouldReset: ${shouldReset}, newStreak: ${newStreak}`);

  return { shouldIncrement, shouldReset, newStreak };
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
            // Student ranking: (totalTests * TESTS_WEIGHT) + (accuracy * ACCURACY_WEIGHT)
            $add: [
              { $multiply: ['$student.totalTests', RANKING_SYSTEM.SCORE_FORMULA.TESTS_WEIGHT] },
              {
                $cond: {
                  if: { $eq: ['$student.totalQuestions', 0] },
                  then: 0,
                  else: {
                    $multiply: [
                      { $round: [{ $multiply: [{ $divide: ['$student.correctAnswers', '$student.totalQuestions'] }, 100] }] },
                      RANKING_SYSTEM.SCORE_FORMULA.ACCURACY_WEIGHT
                    ]
                  }
                }
              }
            ]
          },
          else: {
            // For teachers: (testsCreated * 10) + (totalAttemptsOfStudents * 10)
            $add: [
              { $multiply: ['$teacher.testsCreated', 10] },
              { $multiply: ['$teacher.totalAttemptsOfStudents', 10] }
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
  calculateSpeedBonus,
  calculateStudentStreakStatus,
  getRankingScoreAggregation
};
