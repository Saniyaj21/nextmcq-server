import express from 'express';
import {
  sendOTP,
  verifyOTP,
  logout
} from '../controllers/authController.js';

const router = express.Router();

// Authentication routes
router.post('/send-otp', sendOTP);          // POST /api/auth/send-otp - Send OTP to email
router.post('/verify-otp', verifyOTP);      // POST /api/auth/verify-otp - Verify OTP and get JWT
router.post('/logout', logout);             // POST /api/auth/logout - Logout and invalidate token

export default router;
