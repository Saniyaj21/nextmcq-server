// File: ./routes/testTaking.js
// Routes for test-taking functionality

import express from 'express';
import {
  startTest,
  submitAnswer,
  submitTest,
  getTestResults,
  getUserAttempts,
  getTestDetails,
  getPurchasedTests
} from '../controllers/testTakingController.js';
import { requestAccess } from '../controllers/inviteController.js';
import { authenticateUser } from '../middlewares/auth.js';

const router = express.Router();

// Protected routes (require authentication)
router.get('/get-test-details/:testId', authenticateUser, getTestDetails);
router.post('/request-access/:testId', authenticateUser, requestAccess);
router.post('/start-test/:testId', authenticateUser, startTest);
router.post('/submit-answer/:attemptId', authenticateUser, submitAnswer);
router.post('/submit-test/:attemptId', authenticateUser, submitTest);
router.get('/test-results/:attemptId', authenticateUser, getTestResults);
router.get('/user-attempts/:testId', authenticateUser, getUserAttempts);
router.get('/purchased-tests', authenticateUser, getPurchasedTests);

export default router;