import express from 'express';
import User from '../models/User.js';
import Question from '../models/Question.js';
import Battle from '../models/Battle.js';

const router = express.Router();

// GET /api/stats — public, no auth
router.get('/', async (req, res) => {
  try {
    const [users, questions, battles] = await Promise.all([
      User.countDocuments({ isProfileComplete: true }),
      Question.countDocuments(),
      Battle.countDocuments({ status: 'completed' }),
    ]);

    res.json({ success: true, data: { users, questions, battles } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

export default router;
