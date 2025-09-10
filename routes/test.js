import express from 'express';
import { getTests, createTest } from '../controllers/testController.js';
import { authenticateUser, authorizeRoles } from '../middlewares/auth.js';

const router = express.Router();

// Protected routes (require authentication)
router.get('/get-tests', authenticateUser, getTests);        // GET /api/test/get-tests - Get user's tests
router.post('/create-test', authenticateUser, createTest);   // POST /api/test/create-test - Create new test
// router.post('/create-test', authenticateUser, authorizeRoles('teacher'), createTest);

export default router;