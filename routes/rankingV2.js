// File: ./routes/rankingV2.js
// V2 Routes with Job Queue System

import express from 'express';
import {
  initMonthlyRewards,
  processBatch,
  getJobsStatus
} from '../controllers/monthlyRewardsControllerV2.js';
const router = express.Router();

// Monthly Rewards V2 - Job Queue System
router.post('/monthly-rewards/init', initMonthlyRewards);
router.post('/monthly-rewards/process', processBatch);
router.get('/monthly-rewards/status', getJobsStatus);


export default router;

