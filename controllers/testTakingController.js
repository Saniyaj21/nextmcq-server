// File: ./controllers/testTakingController.js
// Controller for test-taking functionality

import Test from '../models/Test.js';

/**
 * Get single test details for test-taking
 * This is used when a user wants to view test instructions or start taking a test
 */
export const getTestDetails = async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Find test by ID
    const test = await Test.findById(testId)
      .populate('createdBy', 'name email profileImage');

    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    // Check access permissions
    if (!test.isPublic) {
      // For private tests, only allowed users or the creator can access
      const hasAccess = test.allowedUsers.some(user => user._id.toString() === userId) ||
                       test.createdBy._id.toString() === userId;

      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'Access denied to this test' });
      }
    }

    // Return test data formatted for test-taking (without sensitive info)
    const testData = {
      _id: test._id,
      title: test.title,
      description: test.description,
      subject: test.subject,
      chapter: test.chapter,
      timeLimit: test.timeLimit,
      isPublic: test.isPublic,
      questionsCount: test.questions.length, // Get count without populating
      createdBy: test.createdBy,
      createdAt: test.createdAt
    };

    res.status(200).json({
      success: true,
      data: testData,
      message: 'Test details retrieved successfully'
    });

  } catch (error) {
    console.error('Get test details error:', error);
    res.status(500).json({ success: false, message: 'Failed to get test details' });
  }
};
