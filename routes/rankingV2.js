// File: ./routes/rankingV2.js
// V2 Routes with Job Queue System

import express from 'express';
import {
  initMonthlyRewards,
  processBatch,
  getJobsStatus,
  getUserRewardHistory
} from '../controllers/monthlyRewardsControllerV2.js';
import { authenticateUser } from '../middlewares/auth.js';

const router = express.Router();

// Monthly Rewards V2 - Job Queue System
router.post('/monthly-rewards/init', initMonthlyRewards);
router.post('/monthly-rewards/process', processBatch);
router.get('/monthly-rewards/status', getJobsStatus);

// User reward history (authenticated)
router.get('/monthly-rewards/history', authenticateUser, getUserRewardHistory);

export default router;

