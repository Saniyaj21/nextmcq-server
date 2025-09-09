import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import { sendEmail } from '../utils/sendMail.js';
import { REWARDS } from '../constants/rewards.js';

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
 * Requires: authenticateUser middleware
 */
export const logout = async (req, res) => {
  try {
    // Clear the token from user document (user comes from middleware)
    await User.findByIdAndUpdate(req.userId, {
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
 * Complete user onboarding
 * POST /api/auth/complete-onboarding
 * Requires: authenticateUser middleware
 */
export const completeOnboarding = async (req, res) => {
  try {
    const { name, role, subjects, referralCode } = req.body;
    
    // User comes from middleware
    const user = req.user;
    const userId = req.userId;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    if (!role || !['student', 'teacher'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either student or teacher'
      });
    }

    // Validate name
    if (name.trim().length < 2 || name.trim().length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 2 and 50 characters'
      });
    }

    // Validate subjects if provided
    if (subjects && (!Array.isArray(subjects) || subjects.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'At least one subject is required'
      });
    }

    // Institute field is now optional

    // Validate referral code if provided
    let referrer = null;
    if (referralCode && referralCode.trim()) {
      referrer = await User.findByReferralCode(referralCode.trim().toUpperCase());
      if (!referrer) {
        return res.status(400).json({
          success: false,
          message: 'Invalid referral code'
        });
      }
      if (!referrer.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Referral code is no longer active'
        });
      }
      if (referrer._id.toString() === userId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot use your own referral code'
        });
      }
    }

    // Get current user and generate referral code
    const currentUser = await User.findById(userId);
    const userReferralCode = currentUser.generateReferralCode();

    // Update user profile
    const updateData = {
      name: name.trim(),
      role,
      isProfileComplete: true,
      referralCode: userReferralCode
    };

    // Add referrer if referral code was provided
    if (referrer) {
      updateData.referredBy = referrer._id;
    }

    if (subjects && subjects.length > 0) {
      updateData.subjects = subjects.filter(subject => subject && subject.trim()).map(subject => subject.trim());
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    );

    // Generate new token with updated user info
    const newToken = generateJWTToken(userId);

    // Update token in user document
    await User.findByIdAndUpdate(userId, { token: newToken });

    // Process referral rewards if referrer exists
    if (referrer) {
      try {
        const referrerRewards = REWARDS.REFERRAL.SUCCESSFUL_SIGNUP.REFERRER;
        const refereeRewards = REWARDS.REFERRAL.SUCCESSFUL_SIGNUP.REFEREE;

        // Award rewards to referrer
        await referrer.addRewards(
          referrerRewards.coins,
          referrerRewards.xp,
          'referral_referrer'
        );

        // Award rewards to referee (updated user)
        await updatedUser.addRewards(
          refereeRewards.coins,
          refereeRewards.xp,
          'referral_referee'
        );

        console.log(`Referral processed: ${referrer.email} referred ${updatedUser.email}`);
      } catch (error) {
        console.error('Error processing referral rewards:', error);
        // Don't fail onboarding if referral processing fails
      }
    }

    res.status(200).json({
      success: true,
      message: 'Onboarding completed successfully',
      data: {
        token: newToken,
        user: {
          _id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          subjects: updatedUser.subjects,
          isProfileComplete: updatedUser.isProfileComplete
        }
      }
    });

  } catch (error) {
    console.error('Complete Onboarding Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete onboarding',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get current user profile
 * GET /api/auth/profile
 * Requires: authenticateUser middleware
 */
export const getProfile = async (req, res) => {
  try {
    // Get fresh user data with all profile fields (exclude sensitive data)
    const user = await User.findById(req.userId).select('-otp -otpExpiry -token');

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: {
          _id: user._id,
          name: user.name || '',
          email: user.email,
          role: user.role || 'student',
          subjects: user.subjects || [],
          institute: user.institute,
          isActive: user.isActive,
          isEmailVerified: user.isEmailVerified,
          lastLoginAt: user.lastLoginAt,
          isProfileComplete: user.isProfileComplete,
          referralCode: user.referralCode,
          rewards: {
            ...user.rewards,
            accuracy: user.calculateAccuracy()
          },
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Get Profile Error:', error);
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
