import express from 'express';
import { getBanners, createBanner } from '../controllers/bannerController.js';
import { authenticateUser, authorizeRoles } from '../middlewares/auth.js';

const router = express.Router();

// Public routes
router.get('/get-banners', getBanners);

// Protected routes (require authentication and admin/teacher role)
router.post('/create-banner', authenticateUser, createBanner);
// router.post('/create-banner', authenticateUser, authorizeRoles('teacher'), createBanner);

export default router;