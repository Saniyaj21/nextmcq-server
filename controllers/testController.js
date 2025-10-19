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
    // Server-side filtering/sorting/pagination
    const {
      search = '',
      subject,
      minRating = '0',
      sortBy = 'recent',
      page = '1',
      limit = '20'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const minRatingNum = parseFloat(minRating) || 0;

    // Build aggregation pipeline
    const pipeline = [];

    // Visibility: public OR allowedUsers contains userId OR createdBy == userId
    pipeline.push({
      $match: {
        $or: [
          { isPublic: true },
          { allowedUsers: { $in: [req.userId] } },
          { createdBy: req.userId }
        ]
      }
    });

    // Lookup creator details
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'creator'
      }
    }, { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } });

    // Text search on title / subject / creator name
    if (search && String(search).trim().length > 0) {
      const regex = new RegExp(String(search).trim(), 'i');
      pipeline.push({
        $match: {
          $or: [
            { title: { $regex: regex } },
            { subject: { $regex: regex } },
            { 'creator.name': { $regex: regex } }
          ]
        }
      });
    }

    // Filter by subject
    if (subject && subject !== 'All') {
      pipeline.push({ $match: { subject } });
    }

    // Lookup ratings array for aggregation
    pipeline.push({
      $lookup: {
        from: 'ratings',
        localField: '_id',
        foreignField: 'testId',
        as: 'ratings'
      }
    });

    // Compute averageRating and totalRatings
    pipeline.push({
      $addFields: {
        averageRating: { $cond: [{ $gt: [{ $size: '$ratings' }, 0] }, { $round: [{ $avg: '$ratings.rating' }, 1] }, 0] },
        totalRatings: { $size: '$ratings' }
      }
    });

    // Filter by minRating
    if (minRatingNum > 0) {
      pipeline.push({ $match: { averageRating: { $gte: minRatingNum } } });
    }

    // Sorting
    const sortStage = {};
    if (sortBy === 'recent') sortStage.createdAt = -1;
    else if (sortBy === 'oldest') sortStage.createdAt = 1;
    else if (sortBy === 'popular') sortStage.attemptsCount = -1;
    else if (sortBy === 'rating') sortStage.averageRating = -1;
    else sortStage.createdAt = -1;

    // Facet for pagination + total count
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          { $sort: sortStage },
          { $skip: (pageNum - 1) * limitNum },
          { $limit: limitNum },
          // Include creator fields in output
          { $project: {
            title: 1, description: 1, subject:1, chapter:1, timeLimit:1, isPublic:1, attemptsCount:1, questions:1, createdAt:1,
            createdBy: { _id: '$creator._id', name: '$creator.name', email: '$creator.email', profileImage: '$creator.profileImage' },
            averageRating: 1, totalRatings: 1
          } }
        ]
      }
    });

    const aggResult = await Test.aggregate(pipeline).allowDiskUse(true);

    const metadata = aggResult[0].metadata[0] || { total: 0 };
    const data = aggResult[0].data || [];

    res.status(200).json({
      success: true,
      data,
      meta: {
        total: metadata.total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil((metadata.total || 0) / limitNum)
      }
    });
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