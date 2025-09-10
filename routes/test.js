import express from 'express';
import { getTests, createTest, updateTest, deleteTest } from '../controllers/testController.js';
import { authenticateUser, authorizeRoles } from '../middlewares/auth.js';

const router = express.Router();

// Protected routes (require authentication)
router.get('/get-tests', authenticateUser, getTests);        // GET /api/test/get-tests - Get user's tests
router.post('/create-test', authenticateUser, createTest);   // POST /api/test/create-test - Create new test
router.put('/update-test/:testId', authenticateUser, updateTest); // PUT /api/test/update-test/:testId - Update test
router.delete('/delete-test/:testId', authenticateUser, deleteTest); // DELETE /api/test/delete-test/:testId - Delete test
// router.post('/create-test', authenticateUser, authorizeRoles('teacher'), createTest);

export default router;