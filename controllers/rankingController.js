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

  // Log request parameters
  console.log('Received ranking request:', {
    category,
    limit,
    page,
    userId: req.userId,
    url: req.url
  });

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

    // Log request details
    console.log('Ranking request:', {
      category,
      userId: req.userId,
      page,
      limit
    });

    // Get leaderboard data
    let leaderboard;
    if (category === 'institute') {
      // Get user with institute
      const user = await User.findById(req.userId).populate('institute');
      
      // Check if user has an institute
      if (!user?.institute?._id) {
        console.log('No institute found for user:', req.userId);
        return res.status(400).json({
          success: false,
          message: 'No institute found for user'
        });
      }

      // Debug log institute details
      console.log('Fetching institute leaderboard:', {
        userId: req.userId,
        instituteId: user.institute._id,
        instituteName: user.institute.name
      });

      // Get leaderboard with institute filter
      leaderboard = await User.getLeaderboard(
        category,
        limitNum + skip,
        user.institute._id.toString()
      );

      // Log institute results
      console.log('Institute leaderboard results:', {
        instituteId: user.institute._id,
        resultCount: leaderboard.length
      });
    } else {
      leaderboard = await User.getLeaderboard(category, limitNum + skip);
      console.log(`${category} leaderboard results:`, {
        resultCount: leaderboard.length
      });
    }
    
    // Debug log the raw leaderboard results
    console.log('Raw leaderboard results:', {
      category,
      totalResults: leaderboard.length,
      results: leaderboard.map(user => ({
        id: user._id,
        name: user.name,
        institute: user.institute
      }))
    });

    // Apply pagination
    const paginatedLeaderboard = leaderboard.slice(skip, skip + limitNum);

    // Add rank numbers
    const leaderboardWithRanks = paginatedLeaderboard.map((user, index) => ({
      ...user,
      rank: skip + index + 1
    }));

    // Get total count for pagination info
    let totalUsers;
    if (category === 'institute') {
      const user = await User.findById(req.userId).populate('institute');
      if (!user?.institute?._id) {
        return res.status(400).json({
          success: false,
          message: 'No institute found for user'
        });
      }
      // Only count active users in the same institute
      totalUsers = await User.countDocuments({ 
        institute: user.institute._id,
        isActive: true
      });

      // If no users found in institute (should at least have the current user)
      if (totalUsers === 0) {
        totalUsers = 1; // Current user should be counted
      }
    } else {
      totalUsers = await User.countDocuments(
        category === 'students' ? { role: 'student', isActive: true } :
        category === 'teachers' ? { role: 'teacher', isActive: true } : 
        { isActive: true }
      );
    }

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
              level: currentUser.calculateLevel(),
              loginStreak: currentUser.rewards.loginStreak || 0
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

