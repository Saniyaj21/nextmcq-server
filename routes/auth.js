import express from 'express';
import {
  sendOTP,
  verifyOTP,
  logout,
  completeOnboarding
} from '../controllers/authController.js';

const router = express.Router();

// Authentication routes
router.post('/send-otp', sendOTP);                    // POST /api/auth/send-otp - Send OTP to email
router.post('/verify-otp', verifyOTP);                // POST /api/auth/verify-otp - Verify OTP and get JWT
router.post('/complete-onboarding', completeOnboarding); // POST /api/auth/complete-onboarding - Complete user onboarding
router.post('/logout', logout);                       // POST /api/auth/logout - Logout and invalidate token

export default router;
