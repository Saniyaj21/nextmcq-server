// File: server/routes/feedback.js
// Feedback routes

import express from 'express';
import { submitFeedback, getMyFeedback } from '../controllers/feedbackController.js';
import { authenticateUser } from '../middlewares/auth.js';

const router = express.Router();

// Submit feedback (authenticated users only)
router.post('/submit', authenticateUser, submitFeedback);

// Get user's feedback history (authenticated users only)
router.get('/my-feedback', authenticateUser, getMyFeedback);

export default router;

