// File: ./controllers/monthlyRewardsControllerV2.js
// Production-Grade Monthly Rewards System with Job Queue Architecture

import User from '../models/User.js';
import MonthlyRankingSnapshot from '../models/MonthlyRankingSnapshot.js';
import MonthlyReward from '../models/MonthlyReward.js';
import MonthlyRewardJob from '../models/MonthlyRewardJob.js';
import { RANKING_SYSTEM } from '../constants/rewards.js';

const BATCH_SIZE = 50; // Process 50 users per batch
const MAX_PROCESSING_TIME = 25000; // 25 seconds max per execution

/**
 * STEP 1: Initialize Monthly Rewards Processing
 * POST /api/ranking/monthly-rewards/init
 * 
 * Creates jobs for the previous month
 * Called by cron on 1st of month
 */
export const initMonthlyRewards = async (req, res) => {
  try {
    // Validate API key
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    const expectedKey = process.env.MONTHLY_REWARDS_API_KEY || process.env.CACHE_REFRESH_API_KEY;
    
    if (!apiKey || apiKey !== expectedKey) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or missing API key'
      });
    }

    // Calculate previous month
    const { month, year } = getPreviousMonth();

    console.log(`[MonthlyRewards] Initializing rewards for ${month}/${year}`);

    const categories = ['students', 'teachers'];
    const results = [];

    for (const category of categories) {
      try {
        // Find or create job
        const job = await MonthlyRewardJob.findOrCreateJob(month, year, category);
        
        // If already completed, skip
        if (job.status === 'completed') {
          results.push({
            category,
            status: 'already_completed',
            processedUsers: job.processedUsers
          });
          continue;
        }

        // Create snapshot if not exists
        let snapshot = await MonthlyRankingSnapshot.findByMonth(month, year, category);
        if (!snapshot) {
          snapshot = await createRankingSnapshot(month, year, category);
          console.log(`[MonthlyRewards] Created snapshot for ${category}: ${snapshot.totalUsers} users`);
        }

        // Initialize job with snapshot data
        job.snapshotId = snapshot._id;
        job.totalUsers = snapshot.totalUsers;
        job.totalBatches = Math.ceil(snapshot.totalUsers / BATCH_SIZE);
        job.batchSize = BATCH_SIZE;
        job.status = 'pending';
        await job.save();

        results.push({
          category,
          status: 'initialized',
          totalUsers: job.totalUsers,
          totalBatches: job.totalBatches,
          jobId: job._id
        });

      } catch (error) {
        console.error(`[MonthlyRewards] Error initializing ${category}:`, error);
        results.push({
          category,
          status: 'error',
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Monthly rewards initialized for ${month}/${year}`,
      data: {
        month,
        year,
        categories: results
      }
    });

  } catch (error) {
    console.error('[MonthlyRewards] Init error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize monthly rewards',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * STEP 2: Process Batch of Rewards
 * POST /api/ranking/monthly-rewards/process
 * 
 * Processes one batch of users
 * Can be called multiple times until all jobs complete
 * Called by cron every 1-2 minutes
 */
export const processBatch = async (req, res) => {
  try {
    // Validate API key
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    const expectedKey = process.env.MONTHLY_REWARDS_API_KEY || process.env.CACHE_REFRESH_API_KEY;
    
    if (!apiKey || apiKey !== expectedKey) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or missing API key'
      });
    }

    const startTime = Date.now();
    const results = [];

    // Get pending jobs
    const pendingJobs = await MonthlyRewardJob.getPendingJobs();
    
    if (pendingJobs.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No pending jobs to process',
        data: { status: 'idle' }
      });
    }

    console.log(`[MonthlyRewards] Processing ${pendingJobs.length} pending jobs`);

    // Process each job (with time limit)
    for (const job of pendingJobs) {
      // Check time limit
      if (Date.now() - startTime > MAX_PROCESSING_TIME) {
        console.log('[MonthlyRewards] Time limit reached, stopping');
        break;
      }

      try {
        const result = await processJobBatch(job);
        results.push(result);
      } catch (error) {
        console.error(`[MonthlyRewards] Error processing job ${job._id}:`, error);
        await job.markFailed(error.message);
        results.push({
          jobId: job._id,
          category: job.category,
          status: 'error',
          error: error.message
        });
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    res.status(200).json({
      success: true,
      message: `Processed ${results.length} job batches`,
      data: {
        results,
        duration: `${duration}s`,
        remainingJobs: await MonthlyRewardJob.countDocuments({ 
          status: { $in: ['pending', 'processing'] } 
        })
      }
    });

  } catch (error) {
    console.error('[MonthlyRewards] Process batch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process batch',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Process a single batch for a job
 */
async function processJobBatch(job) {
  console.log(`[MonthlyRewards] Processing batch ${job.currentBatch + 1}/${job.totalBatches} for ${job.category}`);

  // Mark as processing
  await job.markProcessing();

  // Load snapshot
  const snapshot = await MonthlyRankingSnapshot.findById(job.snapshotId);
  if (!snapshot) {
    throw new Error(`Snapshot not found: ${job.snapshotId}`);
  }

  // Calculate batch range
  const startIdx = job.currentBatch * job.batchSize;
  const endIdx = Math.min(startIdx + job.batchSize, snapshot.rankings.length);
  const batchUsers = snapshot.rankings.slice(startIdx, endIdx);

  if (batchUsers.length === 0) {
    // No more users to process, mark as completed
    await job.markCompleted();
    return {
      jobId: job._id,
      category: job.category,
      status: 'completed',
      totalProcessed: job.processedUsers,
      stats: job.stats
    };
  }

  // Process batch
  let processed = 0;
  let failed = 0;
  const errors = [];

  for (const userRanking of batchUsers) {
    try {
      const tier = getTierFromRank(userRanking.rank);
      const rewards = RANKING_SYSTEM.MONTHLY_RANKING_REWARDS[tier];

      await awardSingleReward({
        userId: userRanking.userId,
        rank: userRanking.rank,
        tier,
        coins: rewards.coins,
        xp: rewards.xp,
        badge: rewards.badge,
        month: job.month,
        year: job.year,
        category: job.category,
        snapshotId: snapshot._id
      });

      // Update stats
      job.stats[tier.toLowerCase()] = (job.stats[tier.toLowerCase()] || 0) + 1;
      job.stats.totalCoinsAwarded += rewards.coins;
      job.stats.totalXpAwarded = (job.stats.totalXpAwarded || 0) + rewards.xp;
      processed++;

    } catch (error) {
      console.error(`[MonthlyRewards] Error awarding to user ${userRanking.userId}:`, error);
      failed++;
      errors.push({
        userId: userRanking.userId,
        rank: userRanking.rank,
        error: error.message
      });
    }
  }

  // Update job progress
  job.currentBatch += 1;
  job.errorLog.push(...errors);
  await job.updateProgress(processed, failed);

  // Check if job is complete
  if (job.currentBatch >= job.totalBatches) {
    await job.markCompleted();
    console.log(`[MonthlyRewards] Job completed for ${job.category}: ${job.processedUsers} users processed`);
    
    // Mark snapshot as processed
    snapshot.processed = true;
    snapshot.processedAt = new Date();
    await snapshot.save();
  }

  return {
    jobId: job._id,
    category: job.category,
    status: job.status,
    progress: {
      batch: job.currentBatch,
      totalBatches: job.totalBatches,
      processedUsers: job.processedUsers,
      totalUsers: job.totalUsers,
      percentage: Math.round((job.processedUsers / job.totalUsers) * 100)
    },
    batchResult: {
      processed,
      failed,
      errors: errors.length
    }
  };
}

/**
 * Get reward tier based on rank
 */
function getTierFromRank(rank) {
  if (rank === 1) return 'CHAMPION';
  if (rank >= 2 && rank <= 10) return 'ELITE';
  if (rank >= 11 && rank <= 50) return 'ACHIEVER';
  if (rank >= 51 && rank <= 100) return 'PERFORMER';
  return 'UNPLACED';
}

/**
 * Award reward to a single user (idempotent)
 */
async function awardSingleReward({ userId, rank, tier, coins, xp, badge, month, year, category, snapshotId }) {
  // Check if already awarded (idempotent)
  const existing = await MonthlyReward.findOne({
    userId,
    month,
    year,
    category
  });

  if (existing) {
    console.log(`[MonthlyRewards] Reward already awarded to user ${userId} for ${month}/${year}/${category}`);
    return;
  }

  // Fetch user
  const user = await User.findById(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  // Add badge
  if (!user.badges) {
    user.badges = [];
  }

  // Check if badge already exists (double-check)
  const hasBadge = user.badges.some(b => 
    b.month === month && b.year === year && b.category === category
  );

  if (!hasBadge) {
    user.badges.push({
      name: badge,
      category,
      month,
      year,
      tier,
      rank,
      earnedAt: new Date()
    });
  }

  // Add coins and XP
  await user.addRewards(coins, xp, 'monthly_ranking_reward');

  // Create reward record
  await MonthlyReward.create({
    month,
    year,
    category,
    userId,
    rank,
    tier,
    coinsAwarded: coins,
    xpAwarded: xp,
    badgeAwarded: badge,
    snapshotId,
    status: 'awarded',
    awardedAt: new Date()
  });
}

/**
 * Get status of all jobs
 * GET /api/ranking/monthly-rewards/status
 */
export const getJobsStatus = async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    const expectedKey = process.env.MONTHLY_REWARDS_API_KEY || process.env.CACHE_REFRESH_API_KEY;
    
    if (!apiKey || apiKey !== expectedKey) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or missing API key'
      });
    }

    const { month, year } = req.query;
    
    const query = {};
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);

    const jobs = await MonthlyRewardJob.find(query)
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const summary = await MonthlyRewardJob.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalProcessed: { $sum: '$processedUsers' },
          totalFailed: { $sum: '$failedUsers' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        jobs,
        summary
      }
    });

  } catch (error) {
    console.error('[MonthlyRewards] Get status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get jobs status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Helper: Create ranking snapshot
 */
async function createRankingSnapshot(month, year, category) {
  const leaderboard = await User.getLeaderboard(category, 10000);
  
  const rankings = leaderboard.map((user, index) => ({
    userId: user._id,
    rank: index + 1,
    score: user.rankingScore,
    userName: user.name || null,
    userEmail: user.email || null,
    role: user.role
  }));

  return MonthlyRankingSnapshot.create({
    month,
    year,
    category,
    rankings,
    totalUsers: leaderboard.length,
    snapshotDate: new Date(),
    processed: false
  });
}

/**
 * Helper: Get previous month
 */
function getPreviousMonth() {
  const now = new Date();
  let month = now.getMonth(); // 0-11
  let year = now.getFullYear();
  
  if (month === 0) {
    month = 12;
    year -= 1;
  }
  
  return { month, year };
}

/**
 * Get user reward history (kept from original)
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

