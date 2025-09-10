import User from '../models/User.js';
import { RANKING_SYSTEM } from '../constants/rewards.js';

/**
 * Get global leaderboard
 * GET /api/ranking/leaderboard
 * Query params: category (global|students|teachers), limit, page
 */
export const getLeaderboard = async (req, res) => {
  try {
    const { 
      category = 'global', 
      limit = 50, 
      page = 1 
    } = req.query;

    // Validate parameters
    const validCategories = ['global', 'students', 'teachers'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category. Must be global, students, or teachers'
      });
    }

    const limitNum = Math.min(parseInt(limit) || 50, 100); // Max 100 users per page
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const skip = (pageNum - 1) * limitNum;

    // Get leaderboard data
    const leaderboard = await User.getLeaderboard(category, limitNum + skip);
    
    // Apply pagination
    const paginatedLeaderboard = leaderboard.slice(skip, skip + limitNum);

    // Add rank numbers
    const leaderboardWithRanks = paginatedLeaderboard.map((user, index) => ({
      ...user,
      rank: skip + index + 1
    }));

    // Get total count for pagination info
    const totalUsers = await User.countDocuments(
      category === 'students' ? { role: 'student' } :
      category === 'teachers' ? { role: 'teacher' } : {}
    );

    res.status(200).json({
      success: true,
      message: 'Leaderboard retrieved successfully',
      data: {
        leaderboard: leaderboardWithRanks,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalUsers / limitNum),
          totalUsers,
          hasNext: skip + limitNum < totalUsers,
          hasPrev: pageNum > 1
        },
        category
      }
    });

  } catch (error) {
    console.error('Get Leaderboard Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user's rank and nearby users
 * GET /api/ranking/user-rank
 * Requires: authenticateUser middleware
 * Query params: category (global|students|teachers)
 */
export const getUserRank = async (req, res) => {
  try {
    const { category = 'global' } = req.query;
    const userId = req.userId;

    // Validate category
    const validCategories = ['global', 'students', 'teachers'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category. Must be global, students, or teachers'
      });
    }

    // Get user's rank
    const rankResult = await User.getUserRanking(userId, category);
    
    if (!rankResult || rankResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User rank not found'
      });
    }

    const userRank = rankResult[0];

    // Get user's current data for display
    const currentUser = await User.findById(userId).select(
      'name email role rewards.coins rewards.xp rewards.level rewards.totalTests rewards.correctAnswers rewards.totalQuestions'
    );

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate user's ranking score and accuracy
    const accuracy = currentUser.calculateAccuracy();
    const rankingScore = currentUser.calculateRankingScore();


    res.status(200).json({
      success: true,
      message: 'User rank retrieved successfully',
      data: {
        userRank: {
          rank: userRank.rank,
          score: userRank.score,
          user: {
            _id: currentUser._id,
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
            rewards: {
              ...currentUser.rewards,
              accuracy
            },
            rankingScore
          }
        },
        category
      }
    });

  } catch (error) {
    console.error('Get User Rank Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

