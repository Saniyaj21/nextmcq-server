import Test from '../models/Test.js';
import User from '../models/User.js';
import Question from '../models/Question.js';
import Rating from '../models/Rating.js';
import Post from '../models/Post.js';
import TestAttempt from '../models/TestAttempt.js';
import { REWARDS } from '../constants/rewards.js';

export const getTests = async (req, res) => {
  try {
    const userId = req?.userId;
    const includeEarnings = req?.query?.includeEarnings === 'true';

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Get tests created by the authenticated user
    let tests = await Test.find({ createdBy: userId })
      .populate('createdBy', 'name email')
      .populate('allowedUsers', 'name email')
      .populate('questions', 'question options correctAnswer explanation tests createdBy createdAt updatedAt')
      .sort({ createdAt: -1 });

    // If earnings requested, calculate earnings from test attempts
    if (includeEarnings) {
      const { REVENUE_SHARE } = await import('../constants/rewards.js');
      
      // Calculate earnings for each test
      const testsWithEarnings = await Promise.all(
        tests.map(async (test) => {
          const testObj = test.toObject();
          
          // Sum all coinsPaid for this test (what students paid)
          const totalCoinsPaid = await TestAttempt.aggregate([
            { $match: { testId: test._id, coinsPaid: { $gt: 0 } } },
            { $group: { _id: null, total: { $sum: '$coinsPaid' } } }
          ]);
          
          const totalPaid = totalCoinsPaid[0]?.total || 0;
          // Calculate teacher earnings (80% of what students paid)
          const earnings = Math.floor(totalPaid * REVENUE_SHARE.TEACHER_SHARE);
          
          testObj.earnings = earnings;
          testObj.totalCoinsPaid = totalPaid;
          
          return testObj;
        })
      );
      
      tests = testsWithEarnings;
    }

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
      limit = '20',
      enrolled = 'false'
    } = req.query;

    const enrolledOnly = enrolled === 'true' || enrolled === true;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const minRatingNum = parseFloat(minRating) || 0;

    // Build aggregation pipeline
    const pipeline = [];

    // No visibility restrictions - all authenticated users can see all tests

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

    // Filter out tests with less than 10 questions
    pipeline.push({
      $match: {
        $expr: { $gte: [{ $size: { $ifNull: ['$questions', []] } }, 10] }
      }
    });

    // Filter by enrolled tests (tests user has attempted)
    if (enrolledOnly && userId) {
      // Get all test IDs that the user has attempted
      const userAttempts = await TestAttempt.distinct('testId', { userId });
      
      if (userAttempts.length > 0) {
        pipeline.push({
          $match: {
            _id: { $in: userAttempts }
          }
        });
      } else {
        // If user has no attempts, return empty result
        pipeline.push({
          $match: {
            _id: { $in: [] } // This will match nothing
          }
        });
      }
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
            title: 1, description: 1, subject:1, chapter:1, timeLimit:1, coinFee:1, isPublic:1, attemptsCount:1, questions:1, createdAt:1,
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
    const { title, description, subject, chapter, timeLimit, isPublic, allowedUsers, coinFee } = req.body;
    const createdBy = req?.userId; // Get user ID from request.

    if (!createdBy) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Validate time limit
    if (timeLimit !== undefined) {
      if (!Number.isInteger(timeLimit)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Time limit must be a whole number' 
        });
      }
      if (timeLimit < 1) {
        return res.status(400).json({ 
          success: false, 
          message: 'Time limit must be at least 1 minute' 
        });
      }
      if (timeLimit > 60) {
        return res.status(400).json({ 
          success: false, 
          message: 'Time limit cannot exceed 60 minutes (1 hour)' 
        });
      }
    }

    // Validate coin fee
    if (coinFee !== undefined) {
      if (!Number.isInteger(coinFee)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Coin fee must be a whole number' 
        });
      }
      if (coinFee < 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Coin fee cannot be negative' 
        });
      }
    }

    const test = await Test.create({
      title,
      description,
      subject,
      chapter,
      timeLimit,
      coinFee: coinFee !== undefined ? coinFee : 0,
      isPublic,
      allowedUsers: allowedUsers || [],
      createdBy
    });

    // Distribute rewards to teacher for creating test
    const teacherReward = REWARDS.TEACHER.CREATE_TEST;
    const teacher = await User.findById(createdBy);
    
    if (teacher) {
      // Update teacher stats
      teacher.teacher.testsCreated = (teacher.teacher.testsCreated || 0) + 1;

      // Use addRewards() method for consistency - automatically updates level
      await teacher.addRewards(teacherReward.coins, teacherReward.xp, 'test_creation');
    }

    // Create post for teacher test creation
    try {
      const teacher = await User.findById(createdBy);
      await Post.create({
        type: 'teacher_test_created',
        title: 'New Test Published',
        creator: createdBy,
        description: `${teacher?.name || 'Teacher'} published a new test: ${test.title}`,
        data: {
          testId: test._id,
          testTitle: test.title,
          subject: test.subject,
          chapter: test.chapter,
          isPublic: test.isPublic,
          timeLimit: test.timeLimit,
          questionsCount: test.questions?.length || 0
        }
      });
    } catch (postError) {
      console.error('Failed to create teacher_test_created post:', postError);
      // Don't fail test creation if post creation fails
    }

    res.status(201).json({ success: true, data: { test } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create test' });
  }
};

export const updateTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const { title, description, subject, chapter, timeLimit, isPublic, allowedUsers, coinFee } = req.body;
    const userId = req?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Validate coin fee if provided
    if (coinFee !== undefined) {
      if (!Number.isInteger(coinFee)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Coin fee must be a whole number' 
        });
      }
      if (coinFee < 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Coin fee cannot be negative' 
        });
      }
    }

    // Validate time limit if provided
    if (timeLimit !== undefined) {
      if (!Number.isInteger(timeLimit)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Time limit must be a whole number' 
        });
      }
      if (timeLimit < 1) {
        return res.status(400).json({ 
          success: false, 
          message: 'Time limit must be at least 1 minute' 
        });
      }
      if (timeLimit > 60) {
        return res.status(400).json({ 
          success: false, 
          message: 'Time limit cannot exceed 60 minutes (1 hour)' 
        });
      }
    }

    // Find test and verify ownership
    const test = await Test.findOne({ _id: testId, createdBy: userId });
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found or access denied' });
    }

    // Build update object with only provided fields
    const updateData = {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(subject !== undefined && { subject }),
      ...(chapter !== undefined && { chapter }),
      ...(timeLimit !== undefined && { timeLimit }),
      ...(coinFee !== undefined && { coinFee }),
      ...(isPublic !== undefined && { isPublic }),
      ...(allowedUsers !== undefined && { allowedUsers: allowedUsers || [] })
    };

    // Update test
    const updatedTest = await Test.findByIdAndUpdate(
      testId,
      updateData,
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

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Find test and verify ownership
    const test = await Test.findOne({ _id: testId, createdBy: userId });
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found or access denied' });
    }

    // Find question and verify ownership
    const question = await Question.findOne({ _id: questionId, createdBy: userId });
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found or access denied' });
    }

    // Check if question is in the test
    if (!test.questions.includes(questionId)) {
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
