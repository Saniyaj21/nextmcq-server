import express from 'express';
import { getTests, createTest } from '../controllers/testController.js';
import { authenticateUser, authorizeRoles } from '../middlewares/auth.js';

const router = express.Router();

// Public routes (for students to view available tests)
router.get('/get-tests', getTests);

// Protected routes (require authentication and teacher role)
router.post('/create-test', authenticateUser, createTest);
// router.post('/create-test', authenticateUser, authorizeRoles('teacher'), createTest);

export default router;