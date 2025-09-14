import express from 'express';
import { getTests, createTest, updateTest, deleteTest } from '../controllers/testController.js';
import { authenticateUser, authorizeRoles } from '../middlewares/auth.js';

const router = express.Router();

// Protected routes (require authentication and teacher role)
router.get('/get-tests', authenticateUser, authorizeRoles('teacher'), getTests);        // GET /api/test/get-tests - Get user's tests
router.post('/create-test', authenticateUser, authorizeRoles('teacher'), createTest);   // POST /api/test/create-test - Create new test
router.put('/update-test/:testId', authenticateUser, authorizeRoles('teacher'), updateTest); // PUT /api/test/update-test/:testId - Update test
router.delete('/delete-test/:testId', authenticateUser, authorizeRoles('teacher'), deleteTest); // DELETE /api/test/delete-test/:testId - Delete test

export default router;