import express from 'express';
import { rateTest, getTestRating, getUserRating } from '../controllers/ratingController.js';
import { authenticateUser } from '../middlewares/auth.js';

const router = express.Router();

// Protected routes (require authentication)
router.post('/rate-test/:testId', authenticateUser, rateTest);           // POST /api/rating/rate-test/:testId - Submit or update rating
router.get('/user-rating/:testId', authenticateUser, getUserRating);    // GET /api/rating/user-rating/:testId - Get user's rating for test

// Public routes (can be accessed without authentication, but user context is optional)
router.get('/test-rating/:testId', getTestRating);                      // GET /api/rating/test-rating/:testId - Get test rating statistics

export default router;