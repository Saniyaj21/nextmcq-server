import User from '../models/User.js';

/**
 * Get public profile by user ID
 * GET /api/user/public-profile/:userId
 */
export const getPublicProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId format
    if (!userId || userId.length !== 24) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Find user with populated institute data
    const user = await User.findById(userId)
      .select('-otp -otpExpiry -token') // Exclude sensitive data
      .populate('institute', 'name location type');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user allows profile viewing
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This profile is not available'
      });
    }

    // Calculate accuracy
    const accuracy = user.calculateAccuracy();

    // Get user's global ranking
    let globalRank = null;
    let rankingScore = 0;
    try {
      const rankResult = await User.getUserRanking(userId, 'global');
      if (rankResult && rankResult.length > 0) {
        globalRank = rankResult[0].rank;
        rankingScore = rankResult[0].score;
      }
    } catch (error) {
      console.warn('Failed to get user ranking:', error.message);
      // Continue without ranking data
    }

    // Prepare public profile data
    const publicProfile = {
      _id: user._id,
      name: user.name || 'Anonymous User',
      email: user.email,
      role: user.role || 'student',
      institute: user.institute,
      referralCode: user.referralCode,
      level: user.rewards.level,
      accuracy: accuracy,
      streak: user.rewards.loginStreak,
      testsCompleted: user.rewards.totalTests,
      globalRank: globalRank,
      rankingScore: rankingScore,
      memberSince: user.createdAt
    };

    res.status(200).json({
      success: true,
      message: 'Public profile retrieved successfully',
      data: {
        user: publicProfile
      }
    });

  } catch (error) {
    console.error('Get Public Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
