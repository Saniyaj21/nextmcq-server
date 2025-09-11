import express from 'express';
import { getPublicProfile } from '../controllers/userController.js';

const router = express.Router();

// Public route (no authentication required)
router.get('/public-profile/:userId', getPublicProfile);  // GET /api/user/public-profile/:userId

export default router;
