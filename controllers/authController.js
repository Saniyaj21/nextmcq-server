import User from '../models/User.js';
import Post from '../models/Post.js';
import Subject from '../models/Subject.js';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import { sendEmail } from '../utils/sendMail.js';
import { REWARDS } from '../constants/rewards.js';
import { getSetting } from '../utils/settingsCache.js';
import { 
  isReviewerEmail, 
  getReviewerOTP, 
  isReviewerBypassEnabled,
  getReviewerTestEmail
} from '../utils/reviewerAccess.js';

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

    const emailLower = email.toLowerCase();
    
    // Check if this is a reviewer email and bypass is enabled
    const isReviewer = isReviewerBypassEnabled() && isReviewerEmail(emailLower);
    const reviewerOTP = getReviewerOTP();
    
    // Generate OTP (use fixed OTP for reviewers, random for regular users)
    const otp = isReviewer ? reviewerOTP : Math.floor(100000 + Math.random() * 900000).toString();
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

    // Send OTP via email (skip for reviewer emails)
    if (isReviewer) {
      // For reviewers, return OTP in response instead of sending email
      console.log(`[REVIEWER ACCESS] OTP for ${emailLower}: ${otp}`);
      res.status(200).json({
        success: true,
        message: 'OTP generated successfully for reviewer access',
        data: {
          email: user.email,
          otp: otp, // Include OTP in response for reviewers
          otpExpiry: otpExpiry,
          isReviewer: true
        }
      });
      return;
    }

    // Send OTP via email for regular users
    try {
      await sendEmail({
        email: email,
        subject: 'Your NextMCQ Login Code',
        message: `Your OTP for NextMCQ login is: ${otp}. This code will expire in 10 minutes. If you didn't request this, please ignore this email.`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#4F46E5;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">NextMCQ</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.5;">Hi there,</p>
              <p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.5;">Use the code below to sign in to your NextMCQ account.</p>
              <!-- OTP Code -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:24px 0;">
                    <div style="display:inline-block;background-color:#F3F4F6;border:2px dashed #D1D5DB;border-radius:10px;padding:20px 40px;">
                      <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#1F2937;font-family:'Courier New',monospace;">${otp}</span>
                    </div>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;color:#6B7280;font-size:14px;line-height:1.5;text-align:center;">This code expires in <strong style="color:#374151;">10 minutes</strong>.</p>
              <!-- Divider -->
              <hr style="margin:32px 0;border:none;border-top:1px solid #E5E7EB;">
              <p style="margin:0;color:#9CA3AF;font-size:13px;line-height:1.5;">If you didn't request this code, you can safely ignore this email. Someone may have entered your email by mistake.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#F9FAFB;padding:24px 40px;text-align:center;border-top:1px solid #E5E7EB;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:1.5;">NextMCQ &mdash; Practice smarter, score higher.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
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
    // Get OTP and email from API
    const { otp, email } = req.body;

    // Validate OTP
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP is required'
      });
    }

    // Check if this is the reviewer OTP
    const reviewerOTP = getReviewerOTP();
    const isReviewerOTP = isReviewerBypassEnabled() && otp === reviewerOTP;

    // Build query - use email if provided for exact match
    const otpQuery = { otp: otp, otpExpiry: { $gt: new Date() } };
    if (email) {
      otpQuery.email = email.toLowerCase();
    }

    // Get user by the OTP from API
    let user;

    if (isReviewerOTP) {
      // For reviewer OTP, find user with this OTP or use test email
      user = await User.findOne(otpQuery);

      // If no user found with reviewer OTP, find or create test reviewer account
      if (!user) {
        const testEmail = getReviewerTestEmail();
        user = await User.findOne({ email: testEmail });

        // Create test reviewer account if it doesn't exist
        if (!user) {
          user = await User.create({
            email: testEmail,
            name: 'Play Store Reviewer',
            role: 'student',
            isEmailVerified: true,
            isProfileComplete: true
          });
        }

        // Set OTP on user for verification
        await User.findByIdAndUpdate(user._id, {
          otp: reviewerOTP,
          otpExpiry: new Date(Date.now() + 10 * 60 * 1000)
        });
      }
    } else {
      // Regular OTP verification
      user = await User.findOne(otpQuery);
    }

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
          name: updatedUser.name || '',
          email: updatedUser.email,
          role: updatedUser.role || 'student',
          subjects: updatedUser.subjects || [],
          institute: updatedUser.institute || null,
          isActive: updatedUser.isActive !== undefined ? updatedUser.isActive : true,
          isEmailVerified: updatedUser.isEmailVerified || false,
          lastLoginAt: updatedUser.lastLoginAt || null,
          isProfileComplete: updatedUser.isProfileComplete || false,
          referralCode: updatedUser.referralCode || null,
          profileImage: updatedUser.profileImage || null,
          rewards: {
            coins: updatedUser.rewards?.coins || 0,
            xp: updatedUser.rewards?.xp || 0,
            level: updatedUser.calculateLevel()
          }
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

    // Validate subjects if provided (optional — users can add later in Profile)
    if (subjects && !Array.isArray(subjects)) {
      return res.status(400).json({
        success: false,
        message: 'Subjects must be an array'
      });
    }

    if (subjects && subjects.length > 0) {
      const activeSubjects = await Subject.find({ isActive: true }).select('name').lean();
      const validNames = new Set(activeSubjects.map(s => s.name));
      const invalid = subjects.filter(s => typeof s === 'string' && s.trim()).filter(s => !validNames.has(s.trim()));
      if (invalid.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid subjects: ${invalid.join(', ')}`
        });
      }
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

    // Build referral reward amounts (needed for both awarding and post data)
    const referrerRewards = {
      coins: getSetting('rewards.referral.referrer.coins', REWARDS.REFERRAL.SUCCESSFUL_SIGNUP.REFERRER.coins),
      xp: getSetting('rewards.referral.referrer.xp', REWARDS.REFERRAL.SUCCESSFUL_SIGNUP.REFERRER.xp)
    };
    const refereeRewards = {
      coins: getSetting('rewards.referral.referee.coins', REWARDS.REFERRAL.SUCCESSFUL_SIGNUP.REFEREE.coins),
      xp: getSetting('rewards.referral.referee.xp', REWARDS.REFERRAL.SUCCESSFUL_SIGNUP.REFEREE.xp)
    };

    // Process referral rewards if referrer exists
    if (referrer) {
      try {
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
      } catch (error) {
        console.error('Error processing referral rewards:', error);
        // Don't fail onboarding if referral processing fails
      }
    }

    // Create post for new user joining
    try {
      const roleLabel = updatedUser.role === 'teacher' ? 'teacher' : 'student';
      await Post.create({
        type: 'user_joined',
        title: 'Welcome to NextMCQ! 🎉',
        creator: userId,
        description: `${updatedUser.name} joined NextMCQ as a ${roleLabel}! 🎉`,
        data: {
          userId: userId,
          name: updatedUser.name,
          role: updatedUser.role,
          subjects: updatedUser.subjects || [],
          hasReferrer: !!referrer,
          referrerId: referrer?._id || null,
          referralRewards: referrer ? {
            referrer: referrerRewards,
            referee: refereeRewards
          } : null
        }
      });
    } catch (postError) {
      console.error('Failed to create user_joined post:', postError);
      // Don't fail onboarding if post creation fails
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
    const userId = req.userId;

    // Get fresh user data with all profile fields (exclude sensitive data)
    const user = await User.findById(userId)
      .select('-otp -otpExpiry -token')
      .populate('institute', 'name location type');

    // Calculate user's global ranking using optimized approach
    let globalRank = null;
    let rankingScore = 0;
    try {
      // Use getUserRanking for better performance - only gets the user's rank
      const rankResult = await User.getUserRanking(userId, 'global');

      if (rankResult && rankResult.length > 0) {
        globalRank = rankResult[0].rank;
        rankingScore = rankResult[0].score;
      }
    } catch (error) {
      console.warn('Failed to get user ranking:', error.message);
      // Continue without ranking data
    }

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
          profileImage: user.profileImage || null,
          globalRank: globalRank,
          rankingScore: rankingScore,
          rewards: {
            coins: user.rewards.coins || 0,
            xp: user.rewards.xp || 0,
            level: user.calculateLevel()
          },
          student: {
            totalTests: user.student.totalTests || 0,
            correctAnswers: user.student.correctAnswers || 0,
            totalQuestions: user.student.totalQuestions || 0,
            averageAccuracy: user.calculateAccuracy(),
            attemptedTests: user.student.attemptedTests || []
          },
          teacher: user.teacher,
          badges: user.badges || [],
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
 * Update user profile
 * POST /api/auth/update-profile
 * Requires: authenticateUser middleware
 */
export const updateProfile = async (req, res) => {
  try {
    const { institute, subjects } = req.body;
    const userId = req.userId;

    // Get current user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update institute if provided
    if (institute) {
      user.institute = institute;
    }

    // Update subjects if provided
    if (subjects) {
      // Validate subjects array
      if (!Array.isArray(subjects)) {
        return res.status(400).json({
          success: false,
          message: 'Subjects must be an array'
        });
      }

      // Filter out empty subjects and trim whitespace (type guard for non-strings)
      const validSubjects = subjects
        .filter(subject => typeof subject === 'string')
        .map(subject => subject.trim())
        .filter(subject => subject.length > 0);

      // Validate against Subject collection
      if (validSubjects.length > 0) {
        const activeSubjects = await Subject.find({ isActive: true }).select('name').lean();
        const validNames = new Set(activeSubjects.map(s => s.name));
        const invalid = validSubjects.filter(s => !validNames.has(s));
        if (invalid.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Invalid subjects: ${invalid.join(', ')}`
          });
        }
      }

      user.subjects = validSubjects;
    }

    // Save changes
    await user.save();

    // Get updated user with populated institute
    const updatedUser = await User.findById(userId)
      .select('-otp -otpExpiry -token')
      .populate('institute', 'name location type');

    // Calculate user's global ranking using optimized approach
    let globalRank = null;
    let rankingScore = 0;
    try {
      // Use getUserRanking for better performance - only gets the user's rank
      const rankResult = await User.getUserRanking(userId, 'global');

      if (rankResult && rankResult.length > 0) {
        globalRank = rankResult[0].rank;
        rankingScore = rankResult[0].score;
      }
    } catch (error) {
      console.warn('Failed to get user ranking:', error.message);
      // Continue without ranking data
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          _id: updatedUser._id,
          name: updatedUser.name || '',
          email: updatedUser.email,
          role: updatedUser.role || 'student',
          subjects: updatedUser.subjects || [],
          institute: updatedUser.institute,
          isActive: updatedUser.isActive,
          isEmailVerified: updatedUser.isEmailVerified,
          lastLoginAt: updatedUser.lastLoginAt,
          isProfileComplete: updatedUser.isProfileComplete,
          referralCode: updatedUser.referralCode,
          globalRank: globalRank,
          rankingScore: rankingScore,
          rewards: {
            coins: updatedUser.rewards.coins || 0,
            xp: updatedUser.rewards.xp || 0,
            level: updatedUser.calculateLevel()
          },
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Search users by name or email
 * GET /api/auth/search-users?q=searchTerm
 */
export const searchUsers = async (req, res) => {
  try {
    const { q: searchTerm, limit = 20 } = req.query;
    
    const limitNum = Math.min(parseInt(limit) || 20, 50); // Max 50 results

    // If no search term, return empty result
    if (!searchTerm || !searchTerm.trim()) {
      return res.status(200).json({
        success: true,
        message: 'Please provide a search term',
        data: {
          users: [],
          count: 0
        }
      });
    }

    // Validate minimum search length
    if (searchTerm.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const users = await User.searchUsers(searchTerm.trim(), limitNum);

    res.status(200).json({
      success: true,
      message: 'Search completed successfully',
      data: {
        searchTerm: searchTerm.trim(),
        users,
        count: users.length,
        hasMore: users.length === limitNum // Indicates if there might be more results
      }
    });
  } catch (error) {
    console.error('Search Users Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search users',
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