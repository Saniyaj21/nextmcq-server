import User from '../models/User.js';
import Test from '../models/Test.js';
import Question from '../models/Question.js';
import TestAttempt from '../models/TestAttempt.js';
import { v2 as cloudinary } from 'cloudinary';
import validator from 'validator';

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

    // Get user's global ranking using optimized approach
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

    // Build student and teacher objects if they exist
    const studentData = user.role === 'student' && user.student ? {
      totalTests: user.student.totalTests || 0,
      correctAnswers: user.student.correctAnswers || 0,
      totalQuestions: user.student.totalQuestions || 0,
      averageAccuracy: accuracy
    } : undefined;

    const teacherData = user.role === 'teacher' && user.teacher ? {
      testsCreated: user.teacher.testsCreated || 0,
      questionsCreated: user.teacher.questionsCreated || 0,
      studentsTaught: user.teacher.studentsTaught || 0,
      totalAttemptsOfStudents: user.teacher.totalAttemptsOfStudents || 0
    } : undefined;

    // Prepare public profile data
    const publicProfile = {
      _id: user._id,
      name: user.name || 'Anonymous User',
      email: user.email,
      role: user.role || 'student',
      subjects: user.subjects || [],
      institute: user.institute,
      referralCode: user.referralCode,
      level: user.rewards.level,
      accuracy: accuracy,
      testsCompleted: user.role === 'student' ? (user.student?.totalTests || 0) : (user.teacher?.testsCreated || 0),
      globalRank: globalRank,
      rankingScore: rankingScore,
      memberSince: user.createdAt,
      profileImage: user.profileImage, // Include profile image
      ...(studentData && { student: studentData }),
      ...(teacherData && { teacher: teacherData })
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

/**
 * Search students by name or email
 * GET /api/user/search?q=searchTerm
 * Requires: authenticateUser middleware
 * Returns only users with role 'student'
 */
export const searchUsers = async (req, res) => {
  try {
    const { q: searchTerm, limit = 20 } = req.query;
    const userId = req.userId; // From authenticateUser middleware

    const limitNum = Math.min(parseInt(limit) || 20, 50); // Max 50 results

    // If no search term, return empty array
    if (!searchTerm || !searchTerm.trim()) {
      return res.status(200).json({
        success: true,
        message: 'Search completed successfully',
        data: {
          searchTerm: '',
          users: [],
          count: 0
        }
      });
    }

    const searchRegex = new RegExp(searchTerm.trim(), 'i');

    // Search for students by name or email (excluding the current user)
    const users = await User.find({
      $and: [
        { isActive: true },
        { role: 'student' }, // Only search students
        { _id: { $ne: userId } }, // Exclude current user
        {
          $or: [
            { name: searchRegex },
            { email: searchRegex }
          ]
        }
      ]
    })
      .select('_id name email role institute')
      .populate('institute', 'name location type')
      .sort({ name: 1 })
      .limit(limitNum);

    res.status(200).json({
      success: true,
      message: 'Search completed successfully',
      data: {
        searchTerm: searchTerm.trim(),
        users,
        count: users.length
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
 * Update user profile image
 * POST /api/user/upload-profile-image
 * Requires: authenticateUser middleware
 */
export const uploadProfileImage = async (req, res) => {
  try {
    const { imageData, imageType, fileName } = req.body;
    const userId = req.userId;

    // Validate required fields
    if (!imageData) {
      return res.status(400).json({
        success: false,
        message: 'Image data is required'
      });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete existing profile image from Cloudinary if exists
    if (user.profileImage && user.profileImage.publicId) {
      try {
        await cloudinary.uploader.destroy(user.profileImage.publicId);
        console.log('Old profile image deleted from Cloudinary:', user.profileImage.publicId);
      } catch (deleteError) {
        console.warn('Failed to delete old profile image:', deleteError.message);
        // Continue with upload even if delete fails
      }
    }

    // Convert base64 to buffer for Cloudinary upload
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'nextmcq-profile-images',
          public_id: `user-${userId}-${Date.now()}`,
          resource_type: 'image',
          transformation: [
            { width: 100, height: 100, crop: 'fill', gravity: 'face' }, // Smaller size for speed
            { quality: 'auto:eco' } // Eco mode for fastest processing
          ]
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(buffer);
    });

    console.log('Cloudinary upload result:', uploadResult);

    // Update user's profile image in database
    user.profileImage = {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      uploadedAt: new Date()
    };

    // Save the updated user
    await user.save();

    console.log('Profile image saved for user:', userId);

    res.status(200).json({
      success: true,
      message: 'Profile image uploaded successfully to Cloudinary',
      data: {
        imageUrl: uploadResult.secure_url,
        uploadedAt: user.profileImage.uploadedAt
      }
    });

  } catch (error) {
    console.error('Upload Profile Image Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile image to Cloudinary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get teacher statistics
 * GET /api/user/teacher-stats
 */
export const getTeacherStats = async (req, res) => {
  try {
    const teacherId = req.user._id;

    // Verify user is a teacher
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can access teacher statistics'
      });
    }

    // Get all tests created by this teacher
    const tests = await Test.find({ createdBy: teacherId })
      .select('_id title isPublic attemptsCount createdAt')
      .lean();

    const testIds = tests.map(t => t._id);

    // Get all questions created by this teacher
    const totalQuestions = await Question.countDocuments({ createdBy: teacherId });

    // Get all test attempts for teacher's tests
    const testAttempts = await TestAttempt.find({ 
      testId: { $in: testIds },
      status: 'completed'
    })
      .select('userId score timeSpent completedAt')
      .populate('userId', 'name email')
      .lean();

    // Calculate statistics
    const totalTests = tests.length;
    const publicTests = tests.filter(t => t.isPublic).length;
    const privateTests = totalTests - publicTests;

    // Total attempts across all tests
    const totalAttempts = testAttempts.length;

    // Unique students who have taken tests
    const uniqueStudents = new Set(testAttempts.map(a => a.userId._id.toString())).size;

    // Average score across all attempts
    const avgScore = testAttempts.length > 0
      ? testAttempts.reduce((sum, a) => sum + a.score.percentage, 0) / testAttempts.length
      : 0;

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAttempts = testAttempts.filter(
      a => new Date(a.completedAt) >= thirtyDaysAgo
    ).length;

    const recentTests = tests.filter(
      t => new Date(t.createdAt) >= thirtyDaysAgo
    ).length;

    // Most popular test (by attempts)
    const testAttemptsCount = {};
    testAttempts.forEach(attempt => {
      const testId = attempt.testId?.toString();
      if (testId) {
        testAttemptsCount[testId] = (testAttemptsCount[testId] || 0) + 1;
      }
    });

    let mostPopularTest = null;
    if (Object.keys(testAttemptsCount).length > 0) {
      const mostPopularTestId = Object.keys(testAttemptsCount).reduce((a, b) =>
        testAttemptsCount[a] > testAttemptsCount[b] ? a : b
      );
      const popularTest = tests.find(t => t._id.toString() === mostPopularTestId);
      if (popularTest) {
        mostPopularTest = {
          _id: popularTest._id,
          title: popularTest.title,
          attempts: testAttemptsCount[mostPopularTestId]
        };
      }
    }

    // Recent test attempts (last 10)
    const recentTestAttempts = testAttempts
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .slice(0, 10)
      .map(attempt => ({
        studentName: attempt.userId?.name || attempt.userId?.email || 'Unknown',
        score: attempt.score.percentage,
        timeSpent: attempt.timeSpent,
        completedAt: attempt.completedAt
      }));

    // Activity by day (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const attemptsOnDay = testAttempts.filter(a => {
        const attemptDate = new Date(a.completedAt);
        return attemptDate >= date && attemptDate < nextDate;
      }).length;

      last7Days.push({
        date: date.toISOString().split('T')[0],
        attempts: attemptsOnDay
      });
    }

    // Return comprehensive stats
    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalTests,
          publicTests,
          privateTests,
          totalQuestions,
          totalAttempts,
          uniqueStudents,
          averageScore: Math.round(avgScore * 10) / 10
        },
        recentActivity: {
          last30Days: {
            attempts: recentAttempts,
            testsCreated: recentTests
          },
          last7DaysChart: last7Days
        },
        mostPopularTest,
        recentTestAttempts,
        teacher: {
          name: req.user.name,
          email: req.user.email,
          rewards: {
            coins: req.user.rewards?.coins || 0,
            xp: req.user.rewards?.xp || 0,
            level: req.user.rewards?.level || 1
          },
          testsCreated: req.user.teacher?.testsCreated || 0,
          questionsCreated: req.user.teacher?.questionsCreated || 0
        }
      }
    });

  } catch (error) {
    console.error('Get Teacher Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};