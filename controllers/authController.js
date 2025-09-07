import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import { sendEmail } from '../utils/sendMail.js';

/**
 * Send OTP to email address
 * POST /api/auth/send-otp
 */
export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // Check if user exists, if not create a new user with OTP
    let user = await User.findByEmail(email);
    
    if (!user) {
      // Create new user with email and OTP in one operation
      user = await User.create({
        email: email.toLowerCase(),
        otp: otp,
        otpExpiry: otpExpiry
      });
    } else {
      // Update existing user with new OTP using atomic operation
      await User.findByIdAndUpdate(user._id, {
        otp: otp,
        otpExpiry: otpExpiry
      });
    }

    // Send OTP via email
    try {
      await sendEmail({
        email: email,
        subject: 'Your OTP for NextMCQ Login',
        message: `Your OTP for NextMCQ login is: ${otp}\n\nThis OTP will expire in 10 minutes.\n\nIf you didn't request this OTP, please ignore this email.\n\nNextMCQ Team`
      });
    } catch (error) {
      console.error('Email sending error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your email',
      data: {
        email: user.email,
        otpExpiry: otpExpiry
      }
    });

  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify OTP and issue JWT token
 * POST /api/auth/verify-otp
 */
export const verifyOTP = async (req, res) => {
  try {
    // Get OTP from API
    const { otp } = req.body;

    // Validate OTP
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP is required'
      });
    }

    // Get user by the OTP from API
    const user = await User.findOne({ 
      otp: otp,
      otpExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Create token
    const token = generateJWTToken(user._id);

    // Save in user
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          isEmailVerified: true,
          token: token,
          lastLoginAt: new Date()
        },
        $unset: {
          otp: 1,
          otpExpiry: 1
        }
      },
      { new: true }
    );

    // Check if profile is complete
    const isNewUser = !updatedUser.name || updatedUser.name.trim() === '';

    // Send response
    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        token,
        user: {
          _id: updatedUser._id,
          email: updatedUser.email
        },
        isNewUser: isNewUser
      }
    });

  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Logout user and invalidate token
 * POST /api/auth/logout
 */
export const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify and decode token to get user ID
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      userId = decoded.userId;
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Clear the token from user document
    await User.findByIdAndUpdate(userId, {
      $unset: { token: 1 }
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Helper function to generate JWT token
 */
function generateJWTToken(userId) {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}
