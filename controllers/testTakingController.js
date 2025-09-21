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

    // Check access permissions and request status
    let hasAccess = true;
    let hasPendingRequest = false;

    if (!test.isPublic) {
      // For private tests, only allowed users or the creator can access
      hasAccess = test.allowedUsers.some(user => user._id.toString() === userId) ||
                  test.createdBy._id.toString() === userId;

      // Check if user has a pending request
      if (!hasAccess) {
        hasPendingRequest = test.pendingRequests.some(user => user.toString() === userId);
      }
    }

    // Return test data formatted for test-taking
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
      createdAt: test.createdAt,
      hasAccess: hasAccess,
      hasPendingRequest: hasPendingRequest
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

/**
 * Request access to a private test
 */
export const requestTestAccess = async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Find the test
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    // Check if test is private
    if (test.isPublic) {
      return res.status(400).json({ success: false, message: 'Access request not needed for public tests' });
    }

    // Check if user already has access
    const hasAccess = test.allowedUsers.some(user => user.toString() === userId) ||
                     test.createdBy.toString() === userId;

    if (hasAccess) {
      return res.status(400).json({ success: false, message: 'User already has access to this test' });
    }

    // Check if user already has a pending request
    const hasPendingRequest = test.pendingRequests.some(user => user.toString() === userId);

    if (hasPendingRequest) {
      return res.status(400).json({ success: false, message: 'Access request already pending' });
    }

    // Add user to pending requests
    test.pendingRequests.push(userId);
    await test.save();

    res.status(200).json({
      success: true,
      message: 'Access request sent successfully',
      data: {
        testId: test._id,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Request test access error:', error);
    res.status(500).json({ success: false, message: 'Failed to send access request' });
  }
};
