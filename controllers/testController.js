import Test from '../models/Test.js';
import User from '../models/User.js';
import Question from '../models/Question.js';
import Rating from '../models/Rating.js';
import { REWARDS } from '../constants/rewards.js';

export const getTests = async (req, res) => {
  try {
    const userId = req?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Get tests created by the authenticated user
    const tests = await Test.find({ createdBy: userId })
      .populate('createdBy', 'name email')
      .populate('allowedUsers', 'name email')
      .populate('questions', 'question options correctAnswer explanation tests createdBy createdAt updatedAt')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: tests });
  } catch (error) {
    console.error('Get tests error:', error);
    res.status(500).json({ success: false, message: 'Failed to get tests' });
  }
};

export const getAllTests = async (req, res) => {
  try {
    const userId = req?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Get all tests - visibility logic handled in the query
    const tests = await Test.find({})
      .populate('createdBy', 'name email')
      .populate('allowedUsers', 'name email')
      .populate('questions', 'question options correctAnswer explanation tests createdBy createdAt updatedAt')
      .sort({ createdAt: -1 });

    // Get rating statistics for all tests
    const testIds = tests.map(test => test._id);
    
    const ratingStats = await Rating.aggregate([
      { 
        $match: { 
          testId: { $in: testIds }
        } 
      },
      {
        $group: {
          _id: '$testId',
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    // Create a map for quick lookup
    const ratingMap = new Map();
    ratingStats.forEach(stat => {
      ratingMap.set(stat._id.toString(), {
        averageRating: Math.round(stat.averageRating * 10) / 10,
        totalRatings: stat.totalRatings
      });
    });

    // Add rating information to each test
    const testsWithRatings = tests.map(test => {
      const testObj = test.toObject();
      const ratingInfo = ratingMap.get(test._id.toString());
      
      return {
        ...testObj,
        averageRating: ratingInfo?.averageRating || 0,
        totalRatings: ratingInfo?.totalRatings || 0,
        // Keep the old rating field for backward compatibility
        rating: ratingInfo?.averageRating || 0
      };
    });

    res.status(200).json({ success: true, data: testsWithRatings });
  } catch (error) {
    console.error('Get all tests error:', error);
    res.status(500).json({ success: false, message: 'Failed to get tests' });
  }
};

export const createTest = async (req, res) => {
  try {
    const { title, description, subject, chapter, timeLimit, isPublic, allowedUsers } = req.body;
    const createdBy = req?.userId; // Get user ID from request.

    if (!createdBy) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const test = await Test.create({
      title,
      description,
      subject,
      chapter,
      timeLimit,
      isPublic,
      allowedUsers: allowedUsers || [],
      createdBy
    });

    // Distribute rewards to teacher for creating test
    const teacherReward = REWARDS.TEACHER.CREATE_TEST;
    await User.findByIdAndUpdate(createdBy, {
      $inc: {
        'rewards.coins': teacherReward.coins,
        'rewards.xp': teacherReward.xp,
        'teacher.testsCreated': 1
      }
    });

    // Update teacher level based on new XP
    const teacher = await User.findById(createdBy);
    const newLevel = teacher.calculateLevel();
    if (newLevel > teacher.rewards.level) {
      await User.findByIdAndUpdate(createdBy, {
        $set: { 'rewards.level': newLevel }
      });
    }

    console.log(`Teacher rewards distributed for test creation: userId=${createdBy}, coins=${teacherReward.coins}, xp=${teacherReward.xp}`);

    res.status(201).json({ success: true, data: { test } });
  } catch (error) {
    //console.log(error);
    res.status(500).json({ success: false, message: 'Failed to create test' });
  }
};

export const updateTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const { title, description, subject, chapter, timeLimit, isPublic, allowedUsers } = req.body;
    const userId = req?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Find test and verify ownership
    const test = await Test.findOne({ _id: testId, createdBy: userId });
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found or access denied' });
    }

    // Update test
    const updatedTest = await Test.findByIdAndUpdate(
      testId,
      {
        title,
        description,
        subject,
        chapter,
        timeLimit,
        isPublic,
        allowedUsers: allowedUsers || []
      },
      { new: true }
    );

    res.status(200).json({ success: true, data: { test: updatedTest } });
  } catch (error) {
    console.error('Update test error:', error);
    res.status(500).json({ success: false, message: 'Failed to update test' });
  }
};

export const deleteTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req?.userId;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    // Find test and verify ownership
    const test = await Test.findOne({ _id: testId, createdBy: userId });
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found or access denied' });
    }
    
    // Delete test
    await Test.findByIdAndDelete(testId);
    
    res.status(200).json({ 
      success: true, 
      message: 'Test deleted successfully',
      data: { deletedTestId: testId }
    });
  } catch (error) {
    console.error('Delete test error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete test' });
  }
};

/**
 * Remove a question from a test
 * DELETE /api/test/:testId/question/:questionId
 */
export const removeQuestionFromTest = async (req, res) => {
  try {
    const { testId, questionId } = req.params;
    const userId = req?.userId;

    console.log('🗑️ Remove question from test request:', {
      testId,
      questionId,
      userId
    });

    if (!userId) {
      console.log('❌ Remove question failed: User not authenticated');
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Find test and verify ownership
    const test = await Test.findOne({ _id: testId, createdBy: userId });
    if (!test) {
      console.log('❌ Remove question failed: Test not found or access denied', { testId, userId });
      return res.status(404).json({ success: false, message: 'Test not found or access denied' });
    }

    // Find question and verify ownership
    const question = await Question.findOne({ _id: questionId, createdBy: userId });
    if (!question) {
      console.log('❌ Remove question failed: Question not found or access denied', { questionId, userId });
      return res.status(404).json({ success: false, message: 'Question not found or access denied' });
    }

    // Check if question is in the test
    if (!test.questions.includes(questionId)) {
      console.log('❌ Remove question failed: Question not in test', { testId, questionId });
      return res.status(400).json({ success: false, message: 'Question is not in this test' });
    }

    // Remove question from test
    await Test.findByIdAndUpdate(testId, {
      $pull: { questions: questionId }
    });

    // Remove test from question
    await Question.findByIdAndUpdate(questionId, {
      $pull: { tests: testId }
    });

    console.log('✅ Question removed from test successfully:', { testId, questionId });

    res.status(200).json({
      success: true,
      message: 'Question removed from test successfully',
      data: {
        testId,
        questionId,
        remainingQuestions: test.questions.length - 1
      }
    });
  } catch (error) {
    console.error('❌ Remove question from test error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove question from test' });
  }
};