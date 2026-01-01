// File: ./controllers/monthlyRewardsController.js
import User from '../models/User.js';
import MonthlyRankingSnapshot from '../models/MonthlyRankingSnapshot.js';
import MonthlyReward from '../models/MonthlyReward.js';
import { RANKING_SYSTEM } from '../constants/rewards.js';
import { getRankingScoreAggregation } from '../constants/rewards.js';

/**
 * Process Monthly Rewards
 * POST /api/ranking/monthly-rewards
 * 
 * Processes rewards for the previous month based on final rankings
 * This endpoint should be called by cron-job.org on the 1st of each month
 */
export const processMonthlyRewards = async (req, res) => {
  try {
    // Validate API key for security
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    const expectedKey = process.env.MONTHLY_REWARDS_API_KEY || process.env.CACHE_REFRESH_API_KEY;
    
    if (!apiKey || apiKey !== expectedKey) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or missing API key'
      });
    }

    // Determine previous month
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();
    
    // Calculate previous month
    let previousMonth = currentMonth - 1;
    let previousYear = currentYear;
    
    if (previousMonth === 0) {
      previousMonth = 12;
      previousYear = currentYear - 1;
    }


    // Check if already processed
    const existingReward = await MonthlyReward.findOne({ 
      month: previousMonth, 
      year: previousYear 
    });
    
    if (existingReward) {
      return res.status(200).json({
        success: true,
        message: 'Monthly rewards already processed',
        data: {
          month: previousMonth,
          year: previousYear,
          status: 'already_processed'
        }
      });
    }

    // Send immediate success response to cron-job.org to avoid timeout
    res.status(200).json({
      success: true,
      message: `Monthly rewards processing started for ${previousMonth}/${previousYear}`,
      data: {
        month: previousMonth,
        year: previousYear,
        status: 'processing',
        note: 'Rewards are being processed in the background'
      }
    });

    // Process rewards asynchronously in the background (non-blocking)
    // This continues after the HTTP response is sent
    processRewardsInBackground(previousMonth, previousYear).catch(error => {
      console.error('[MonthlyRewards] Background processing error:', error);
    });

  } catch (error) {
    console.error('[MonthlyRewards] Process error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process monthly rewards',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Process rewards in the background (after HTTP response is sent)
 */
async function processRewardsInBackground(previousMonth, previousYear) {
  console.log(`[MonthlyRewards] Starting background processing for ${previousMonth}/${previousYear}...`);
  
  const categories = ['students', 'teachers'];
  const results = {
    month: previousMonth,
    year: previousYear,
    categories: {},
    totalRewardsAwarded: 0,
    totalCoinsAwarded: 0,
    errors: []
  };

  const startTime = Date.now();

  for (const category of categories) {
    try {
      console.log(`[MonthlyRewards] Processing category: ${category}...`);
      const categoryResult = await processCategoryRewards(previousMonth, previousYear, category);
      results.categories[category] = categoryResult;
      results.totalRewardsAwarded += categoryResult.rewardsAwarded;
      results.totalCoinsAwarded += categoryResult.coinsAwarded;
      console.log(`[MonthlyRewards] ${category} completed: ${categoryResult.rewardsAwarded} rewards awarded`);
    } catch (error) {
      console.error(`[MonthlyRewards] Error processing category ${category}:`, error);
      results.errors.push({
        category,
        error: error.message
      });
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[MonthlyRewards] Background processing completed in ${duration}s`);
  console.log(`[MonthlyRewards] Summary:`, JSON.stringify(results, null, 2));
  
  return results;
}

/**
 * Process rewards for a specific category
 */
async function processCategoryRewards(month, year, category) {
  // Check if snapshot already exists
  let snapshot = await MonthlyRankingSnapshot.findByMonth(month, year, category);
  
  if (!snapshot) {
    // Create snapshot of current rankings (now includes all users for UNPLACED badges)
    snapshot = await createRankingSnapshot(month, year, category);
  }

  if (snapshot.processed) {
    return {
      category,
      status: 'already_processed',
      rewardsAwarded: 0,
      coinsAwarded: 0
    };
  }

  // Determine winners based on snapshot
  const winners = determineWinners(snapshot.rankings);
  
  // Award rewards
  const awardResults = await awardRewards(winners, month, year, category, snapshot._id);
  
  // Mark snapshot as processed
  snapshot.processed = true;
  snapshot.processedAt = new Date();
  await snapshot.save();

  return {
    category,
    status: 'processed',
    totalUsers: snapshot.totalUsers,
    winners: {
      champion: winners.champion ? 1 : 0,
      elite: winners.elite.length,
      achiever: winners.achiever.length,
      performer: winners.performer.length,
      unplaced: winners.unplaced ? winners.unplaced.length : 0
    },
    rewardsAwarded: awardResults.totalAwarded,
    coinsAwarded: awardResults.totalCoins,
    errors: awardResults.errors
  };
}

/**
 * Create a snapshot of current rankings for a category
 */
async function createRankingSnapshot(month, year, category) {
  // Get all users for the category (not just top 100) to award UNPLACED badges
  // Use a large limit to get all users, or get all users in the category
  const leaderboard = await User.getLeaderboard(category, 10000); // Large limit to get all users
  
  // Build rankings array
  const rankings = leaderboard.map((user, index) => ({
    userId: user._id,
    rank: index + 1,
    score: user.rankingScore,
    userName: user.name || null,
    userEmail: user.email || null,
    role: user.role
  }));

  // Create snapshot
  const snapshot = await MonthlyRankingSnapshot.create({
    month,
    year,
    category,
    rankings,
    totalUsers: leaderboard.length,
    snapshotDate: new Date(),
    processed: false
  });

  return snapshot;
}

/**
 * Determine winners based on rankings
 */
function determineWinners(rankings) {
  return {
    champion: rankings.length > 0 ? rankings[0] : null,        // Rank 1
    elite: rankings.slice(1, 10),                               // Rank 2-10
    achiever: rankings.slice(10, 50),                           // Rank 11-50
    performer: rankings.slice(50, 100),                          // Rank 51-100
    unplaced: rankings.slice(100)                               // Rank 101+
  };
}

/**
 * Award rewards to winners
 */
async function awardRewards(winners, month, year, category, snapshotId) {
  const rewards = RANKING_SYSTEM.MONTHLY_RANKING_REWARDS;
  let totalAwarded = 0;
  let totalCoins = 0;
  const errors = [];

  // Award Champion (#1)
  if (winners.champion) {
    try {
      await awardSingleReward({
        user: winners.champion,
        rank: 1,
        tier: 'CHAMPION',
        coins: rewards.CHAMPION.coins,
        badge: rewards.CHAMPION.badge,
        month,
        year,
        category,
        snapshotId
      });
      totalAwarded++;
      totalCoins += rewards.CHAMPION.coins;
    } catch (error) {
      errors.push({ rank: 1, error: error.message });
    }
  }

  // Award Elite (#2-10)
  for (let i = 0; i < winners.elite.length; i++) {
    try {
      await awardSingleReward({
        user: winners.elite[i],
        rank: i + 2,
        tier: 'ELITE',
        coins: rewards.ELITE.coins,
        badge: rewards.ELITE.badge,
        month,
        year,
        category,
        snapshotId
      });
      totalAwarded++;
      totalCoins += rewards.ELITE.coins;
    } catch (error) {
      errors.push({ rank: i + 2, error: error.message });
    }
  }

  // Award Achiever (#11-50)
  for (let i = 0; i < winners.achiever.length; i++) {
    try {
      await awardSingleReward({
        user: winners.achiever[i],
        rank: i + 11,
        tier: 'ACHIEVER',
        coins: rewards.ACHIEVER.coins,
        badge: rewards.ACHIEVER.badge,
        month,
        year,
        category,
        snapshotId
      });
      totalAwarded++;
      totalCoins += rewards.ACHIEVER.coins;
    } catch (error) {
      errors.push({ rank: i + 11, error: error.message });
    }
  }

  // Award Performer (#51-100)
  for (let i = 0; i < winners.performer.length; i++) {
    try {
      await awardSingleReward({
        user: winners.performer[i],
        rank: i + 51,
        tier: 'PERFORMER',
        coins: rewards.PERFORMER.coins,
        badge: rewards.PERFORMER.badge,
        month,
        year,
        category,
        snapshotId
      });
      totalAwarded++;
      totalCoins += rewards.PERFORMER.coins;
    } catch (error) {
      errors.push({ rank: i + 51, error: error.message });
    }
  }

  // Award Unplaced (#101+)
  for (let i = 0; i < winners.unplaced.length; i++) {
    try {
      await awardSingleReward({
        user: winners.unplaced[i],
        rank: i + 101,
        tier: 'UNPLACED',
        coins: rewards.UNPLACED.coins,
        badge: rewards.UNPLACED.badge,
        month,
        year,
        category,
        snapshotId
      });
      totalAwarded++;
      totalCoins += rewards.UNPLACED.coins;
    } catch (error) {
      errors.push({ rank: i + 101, error: error.message });
    }
  }

  return { totalAwarded, totalCoins, errors };
}

/**
 * Award reward to a single user
 */
async function awardSingleReward({ user, rank, tier, coins, badge, month, year, category, snapshotId }) {
  // Handle both user object from snapshot or direct userId
  const userId = user && typeof user === 'object' ? (user.userId || user._id) : user;
  
  // Fetch user document
  const userDoc = await User.findById(userId);
  if (!userDoc) {
    throw new Error(`User not found: ${userId}`);
  }

  // Add badge first
  if (!userDoc.badges) {
    userDoc.badges = [];
  }
  
  userDoc.badges.push({
    name: badge,
    category: category,
    month: month,
    year: year,
    tier: tier,
    rank: rank,
    earnedAt: new Date()
  });

  // Add coins (no XP for ranking rewards) - use addRewards() for consistency
  // This will also save the badge and coins together
  await userDoc.addRewards(coins, 0, 'monthly_ranking_reward');

  // Create reward record
  await MonthlyReward.create({
    month,
    year,
    category,
    userId: userId,
    rank,
    tier,
    coinsAwarded: coins,
    badgeAwarded: badge,
    snapshotId,
    status: 'awarded',
    awardedAt: new Date()
  });

}

/**
 * Get user's monthly reward history
 * GET /api/ranking/monthly-rewards/history
 */
export const getUserRewardHistory = async (req, res) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const limit = parseInt(req.query.limit) || 20;
    const rewards = await MonthlyReward.findByUser(userId, limit);

    res.status(200).json({
      success: true,
      message: 'Reward history retrieved successfully',
      data: {
        rewards,
        total: rewards.length
      }
    });

  } catch (error) {
    console.error('[MonthlyRewards] Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve reward history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

