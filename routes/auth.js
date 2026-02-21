import express from 'express';
import {
  sendOTP,
  verifyOTP,
  logout,
  completeOnboarding,
  getProfile,
  updateProfile,
  searchUsers
} from '../controllers/authController.js';
import { getActiveSubjects } from '../controllers/adminController.js';
import { authenticateUser } from '../middlewares/auth.js';

const router = express.Router();

// Public authentication routes (no middleware required)
router.post('/send-otp', sendOTP);                    // POST /api/auth/send-otp - Send OTP to email
router.post('/verify-otp', verifyOTP);                // POST /api/auth/verify-otp - Verify OTP and get JWT

// Protected routes (require authentication)
router.post('/complete-onboarding', authenticateUser, completeOnboarding); // POST /api/auth/complete-onboarding - Complete user onboarding
router.post('/logout', authenticateUser, logout);                         // POST /api/auth/logout - Logout and invalidate token
router.get('/profile', authenticateUser, getProfile);                     // GET /api/auth/profile - Get current user profile
router.post('/update-profile', authenticateUser, updateProfile);           // POST /api/auth/update-profile - Update user profile
router.get('/search-users', searchUsers);                                // GET /api/auth/search-users - Search users by name/email
router.get('/subjects', getActiveSubjects);                              // GET /api/auth/subjects - Get active subjects list

export default router;
