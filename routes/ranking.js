import express from 'express';
import {
  getLeaderboard,
  getUserRank,
  getRewardTiers
} from '../controllers/rankingController.js';
import {
  getUserRewardHistory
} from '../controllers/monthlyRewardsControllerV2.js';
import { authenticateUser } from '../middlewares/auth.js';

const router = express.Router();

// Public routes (no auth)
router.get('/reward-tiers', getRewardTiers);

// All ranking routes below require authentication
router.get('/leaderboard', authenticateUser, getLeaderboard);  // GET /api/ranking/leaderboard - Get leaderboard with pagination
router.get('/user-rank', authenticateUser, getUserRank);       // GET /api/ranking/user-rank - Get current user's rank

// Monthly rewards routes
router.get('/monthly-rewards/history', authenticateUser, getUserRewardHistory);  // GET /api/ranking/monthly-rewards/history - Get user's reward history

export default router;
