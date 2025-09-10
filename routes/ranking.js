import express from 'express';
import {
  getLeaderboard,
  getUserRank
} from '../controllers/rankingController.js';
import { authenticateUser } from '../middlewares/auth.js';

const router = express.Router();

// All ranking routes require authentication
router.get('/leaderboard', authenticateUser, getLeaderboard);  // GET /api/ranking/leaderboard - Get leaderboard with pagination
router.get('/user-rank', authenticateUser, getUserRank);       // GET /api/ranking/user-rank - Get current user's rank

export default router;
