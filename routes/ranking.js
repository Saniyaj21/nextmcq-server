import express from 'express';
import {
  getLeaderboard,
  getUserRank
} from '../controllers/rankingController.js';
import { authenticateUser } from '../middlewares/auth.js';

const router = express.Router();

// Public ranking routes
router.get('/leaderboard', getLeaderboard);        // GET /api/ranking/leaderboard - Get leaderboard with pagination

// Protected routes (require authentication)
router.get('/user-rank', authenticateUser, getUserRank); // GET /api/ranking/user-rank - Get current user's rank

export default router;
