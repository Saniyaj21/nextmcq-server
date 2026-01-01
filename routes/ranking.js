import express from 'express';
import {
  getLeaderboard,
  getUserRank
} from '../controllers/rankingController.js';
import {
  processMonthlyRewards,
  getUserRewardHistory,
  getMonthlyRewardJobStatus,
  getRecentJobs
} from '../controllers/monthlyRewardsController.js';
import { authenticateUser } from '../middlewares/auth.js';

const router = express.Router();

// All ranking routes require authentication
router.get('/leaderboard', authenticateUser, getLeaderboard);  // GET /api/ranking/leaderboard - Get leaderboard with pagination
router.get('/user-rank', authenticateUser, getUserRank);       // GET /api/ranking/user-rank - Get current user's rank

// Monthly rewards routes
router.post('/monthly-rewards', processMonthlyRewards);  // POST /api/ranking/monthly-rewards - Process monthly rewards (cron job)
router.get('/monthly-rewards/history', authenticateUser, getUserRewardHistory);  // GET /api/ranking/monthly-rewards/history - Get user's reward history
router.get('/monthly-rewards/status', getMonthlyRewardJobStatus);  // GET /api/ranking/monthly-rewards/status - Get job status (optional: ?month=12&year=2024)
router.get('/monthly-rewards/jobs', getRecentJobs);  // GET /api/ranking/monthly-rewards/jobs - Get recent job history

export default router;
