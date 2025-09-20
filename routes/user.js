import express from 'express';
import { getPublicProfile, uploadProfileImage, searchUsers } from '../controllers/userController.js';
import { authenticateUser } from '../middlewares/auth.js';

const router = express.Router();

// Public route (no authentication required)
router.get('/public-profile/:userId', getPublicProfile);  // GET /api/user/public-profile/:userId

// Protected routes (authentication required)
router.get('/search', authenticateUser, searchUsers);  // GET /api/user/search?q=term - Search users
router.post('/upload-profile-image', authenticateUser, uploadProfileImage);  // POST /api/user/upload-profile-image

export default router;
