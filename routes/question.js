import express from 'express';
import {
  getQuestions,
  createQuestion,
  getQuestion,
  updateQuestion,
  deleteQuestion
} from '../controllers/questionController.js';
import { authenticateUser, authorizeRoles } from '../middlewares/auth.js';

const router = express.Router();

// Protected routes (require authentication and teacher role)
router.get('/get-questions', authenticateUser, authorizeRoles('teacher'), getQuestions);        // GET /api/question/get-questions - Get user's questions
router.post('/create-question', authenticateUser, authorizeRoles('teacher'), createQuestion);   // POST /api/question/create-question - Create new question
router.get('/:questionId', authenticateUser, authorizeRoles('teacher'), getQuestion);           // GET /api/question/:questionId - Get single question
router.put('/:questionId', authenticateUser, authorizeRoles('teacher'), updateQuestion);        // PUT /api/question/:questionId - Update question
router.delete('/:questionId', authenticateUser, authorizeRoles('teacher'), deleteQuestion);     // DELETE /api/question/:questionId - Delete question

export default router;
