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
      page = 1,
      institute = null,  // NEW: Filter by institute ID
      level = null       // NEW: Filter by level
    } = req.query;

    // Validate parameters
    const validCategories = ['global', 'students', 'teachers', 'institute'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category. Must be global, students, teachers, or institute'
      });
    }

    // For institute category, user must be authenticated and have an institute
    if (category === 'institute') {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required for institute rankings'
        });
      }

      const user = await User.findById(req.userId).populate('institute');
      if (!user?.institute?._id) {
        return res.status(400).json({
          success: false,
          message: 'No institute found. Please join an institute to view institute rankings'
        });
      }
    }

    const limitNum = Math.min(parseInt(limit) || 50, 100); // Max 100 users per page
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const skip = (pageNum - 1) * limitNum;

    // Parse level filter
    const levelFilter = level ? parseInt(level) : null;

    // Get leaderboard data with new filters
    let leaderboard;
    let instituteIdForQuery = null;

    if (category === 'institute') {
      // Get user with institute
      const user = await User.findById(req.userId).populate('institute');
      
      // Check if user has an institute
      if (!user?.institute?._id) {
        return res.status(400).json({
          success: false,
          message: 'No institute found for user'
        });
      }

      instituteIdForQuery = user.institute._id.toString();
    } else if (institute) {
      // Use provided institute filter for students/teachers categories
      instituteIdForQuery = institute;
    }

    // Get leaderboard with filters
    leaderboard = await User.getLeaderboard(
      category,
      limitNum + skip,
      instituteIdForQuery,
      levelFilter  // NEW: Pass level filter
    );

    // Apply pagination
    const paginatedLeaderboard = leaderboard.slice(skip, skip + limitNum);

    // Add actual global role-specific ranks to each user
    // Calculate the rank for each user independently to show their true position
    const leaderboardWithRanks = await Promise.all(
      paginatedLeaderboard.map(async (user, index) => {
        // Get the actual rank for this user in their role category
        const rankResult = await User.getUserRanking(user._id, category);
        const actualRank = rankResult && rankResult.length > 0 ? rankResult[0].rank : (skip + index + 1);
        
        return {
          ...user,
          rank: actualRank
        };
      })
    );

    // Get total count for pagination info with filters
    let countQuery = { isActive: true };
    
    // Apply category filters
    if (category === 'students') {
      countQuery.role = 'student';
    } else if (category === 'teachers') {
      countQuery.role = 'teacher';
    }
    
    // Apply institute filter
    if (instituteIdForQuery) {
      countQuery.institute = instituteIdForQuery;
    }
    
    // Apply level filter
    if (levelFilter !== null) {
      countQuery['rewards.level'] = levelFilter;
    }

    const totalUsers = await User.countDocuments(countQuery);

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
        category,
        filters: {
          institute: instituteIdForQuery,
          level: levelFilter
        }
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
    const validCategories = ['global', 'students', 'teachers', 'institute'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category. Must be global, students, teachers, or institute'
      });
    }

    // For institute category, verify user has an institute
    if (category === 'institute') {
      const user = await User.findById(userId).populate('institute');
      if (!user?.institute?._id) {
        return res.status(400).json({
          success: false,
          message: 'No institute found. Please join an institute to view institute rankings'
        });
      }
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
      'name email role profileImage rewards student teacher'
    );

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate user's ranking score using the same aggregation as leaderboard
    const accuracy = currentUser.calculateAccuracy();
    const userRankingData = await User.getUserRanking(userId, category);
    const rankingScore = userRankingData && userRankingData.length > 0 ? userRankingData[0].score : 0;

    // Build student and teacher objects if they exist
    const studentData = currentUser.role === 'student' && currentUser.student ? {
      totalTests: currentUser.student.totalTests || 0,
      correctAnswers: currentUser.student.correctAnswers || 0,
      totalQuestions: currentUser.student.totalQuestions || 0,
      averageAccuracy: accuracy
    } : undefined;

    const teacherData = currentUser.role === 'teacher' && currentUser.teacher ? {
      testsCreated: currentUser.teacher.testsCreated || 0,
      questionsCreated: currentUser.teacher.questionsCreated || 0,
      studentsTaught: currentUser.teacher.studentsTaught || 0,
      totalAttemptsOfStudents: currentUser.teacher.totalAttemptsOfStudents || 0
    } : undefined;

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
            profileImage: currentUser.profileImage,
            rewards: {
              coins: currentUser.rewards.coins || 0,
              xp: currentUser.rewards.xp || 0,
              level: currentUser.calculateLevel()
            },
            ...(studentData && { student: studentData }),
            ...(teacherData && { teacher: teacherData }),
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

