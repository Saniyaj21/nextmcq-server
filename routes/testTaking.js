// File: ./routes/testTaking.js
// Routes for test-taking functionality

import express from 'express';
import { getTestDetails } from '../controllers/testTakingController.js';
import { authenticateUser } from '../middlewares/auth.js';

const router = express.Router();

// Protected routes (require authentication)
router.get('/get-test-details/:testId', authenticateUser, getTestDetails);  // GET /api/test-taking/get-test-details/:testId - Get test details for test-taking

export default router;
