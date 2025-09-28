import express from 'express';
import { getTests, getAllTests, createTest, updateTest, deleteTest, removeQuestionFromTest } from '../controllers/testController.js';
import { authenticateUser, authorizeRoles } from '../middlewares/auth.js';

const router = express.Router();

// Protected routes (require authentication)
router.get('/get-all-tests', authenticateUser, getAllTests);                            // GET /api/test/get-all-tests - Get all available tests for current user
router.get('/get-tests', authenticateUser, authorizeRoles('teacher'), getTests);        // GET /api/test/get-tests - Get user's tests (teachers only)
router.post('/create-test', authenticateUser, authorizeRoles('teacher'), createTest);   // POST /api/test/create-test - Create new test
router.put('/update-test/:testId', authenticateUser, authorizeRoles('teacher'), updateTest); // PUT /api/test/update-test/:testId - Update test
router.delete('/delete-test/:testId', authenticateUser, authorizeRoles('teacher'), deleteTest); // DELETE /api/test/delete-test/:testId - Delete test
router.delete('/:testId/question/:questionId', authenticateUser, authorizeRoles('teacher'), removeQuestionFromTest); // DELETE /api/test/:testId/question/:questionId - Remove question from test

export default router;