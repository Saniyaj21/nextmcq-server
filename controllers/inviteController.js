import Test from '../models/Test.js';
import User from '../models/User.js';

/**
 * Get all pending requests and allowed users for teacher's private tests
 * GET /api/invites/teacher-requests
 */
export const getTeacherRequests = async (req, res) => {
  try {
    const teacherId = req.user._id;

    // Verify user is a teacher
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can access invite requests'
      });
    }

    // Get all private tests created by this teacher
    const tests = await Test.find({ 
      createdBy: teacherId,
      isPublic: false
    })
      .select('_id title subject chapter pendingRequests allowedUsers')
      .populate('pendingRequests', 'name email profileImage')
      .populate('allowedUsers', 'name email profileImage')
      .lean();

    // Count total pending requests
    const totalPendingRequests = tests.reduce((sum, test) => sum + (test.pendingRequests?.length || 0), 0);
    const totalAllowedUsers = tests.reduce((sum, test) => sum + (test.allowedUsers?.length || 0), 0);

    // Format the response
    const testsWithRequests = tests.map(test => ({
      testId: test._id,
      testTitle: test.title,
      subject: test.subject,
      chapter: test.chapter,
      pendingRequests: test.pendingRequests || [],
      allowedUsers: test.allowedUsers || []
    }));

    res.status(200).json({
      success: true,
      data: {
        tests: testsWithRequests,
        summary: {
          totalPrivateTests: tests.length,
          totalPendingRequests,
          totalAllowedUsers
        }
      }
    });

  } catch (error) {
    console.error('Get Teacher Requests Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invite requests',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Approve a pending request
 * POST /api/invites/approve
 */
export const approveRequest = async (req, res) => {
  try {
    const { testId, userId } = req.body;
    const teacherId = req.user._id;

    if (!testId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Test ID and User ID are required'
      });
    }

    // Find the test and verify ownership
    const test = await Test.findOne({ 
      _id: testId,
      createdBy: teacherId,
      isPublic: false
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found or you do not have permission to manage it'
      });
    }

    // Check if user is in pending requests
    if (!test.pendingRequests.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'User does not have a pending request for this test'
      });
    }

    // Move user from pendingRequests to allowedUsers
    test.pendingRequests = test.pendingRequests.filter(id => id.toString() !== userId.toString());
    
    if (!test.allowedUsers.includes(userId)) {
      test.allowedUsers.push(userId);
    }

    await test.save();

    res.status(200).json({
      success: true,
      message: 'Request approved successfully'
    });

  } catch (error) {
    console.error('Approve Request Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Reject a pending request
 * POST /api/invites/reject
 */
export const rejectRequest = async (req, res) => {
  try {
    const { testId, userId } = req.body;
    const teacherId = req.user._id;

    if (!testId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Test ID and User ID are required'
      });
    }

    // Find the test and verify ownership
    const test = await Test.findOne({ 
      _id: testId,
      createdBy: teacherId,
      isPublic: false
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found or you do not have permission to manage it'
      });
    }

    // Check if user is in pending requests
    if (!test.pendingRequests.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'User does not have a pending request for this test'
      });
    }

    // Remove user from pendingRequests
    test.pendingRequests = test.pendingRequests.filter(id => id.toString() !== userId.toString());
    await test.save();

    res.status(200).json({
      success: true,
      message: 'Request rejected successfully'
    });

  } catch (error) {
    console.error('Reject Request Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Remove an allowed user
 * POST /api/invites/remove-access
 */
export const removeAccess = async (req, res) => {
  try {
    const { testId, userId } = req.body;
    const teacherId = req.user._id;

    if (!testId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Test ID and User ID are required'
      });
    }

    // Find the test and verify ownership
    const test = await Test.findOne({ 
      _id: testId,
      createdBy: teacherId,
      isPublic: false
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found or you do not have permission to manage it'
      });
    }

    // Remove user from allowedUsers
    test.allowedUsers = test.allowedUsers.filter(id => id.toString() !== userId.toString());
    await test.save();

    res.status(200).json({
      success: true,
      message: 'User access removed successfully'
    });

  } catch (error) {
    console.error('Remove Access Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove user access',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Request access to a private test (student-side)
 * POST /api/test-taking/request-access/:testId
 */
export const requestAccess = async (req, res) => {
  try {
    const { testId } = req.params;
    const studentId = req.user._id;

    if (!testId) {
      return res.status(400).json({
        success: false,
        message: 'Test ID is required'
      });
    }

    // Find the test
    const test = await Test.findOne({ 
      _id: testId,
      isPublic: false
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Private test not found'
      });
    }

    // Check if user is the creator
    if (test.createdBy.toString() === studentId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You are the creator of this test'
      });
    }

    // Check if user already has access
    if (test.allowedUsers.includes(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'You already have access to this test'
      });
    }

    // Check if user already has a pending request
    if (test.pendingRequests.includes(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending request for this test'
      });
    }

    // Add user to pending requests
    test.pendingRequests.push(studentId);
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
    console.error('Request Access Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send access request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Invite a user to a private test
 * POST /api/invites/invite-user
 */
export const inviteUser = async (req, res) => {
  try {
    const { testId, userEmail } = req.body;
    const teacherId = req.user._id;

    if (!testId || !userEmail) {
      return res.status(400).json({
        success: false,
        message: 'Test ID and user email are required'
      });
    }

    // Find the test and verify ownership
    const test = await Test.findOne({ 
      _id: testId,
      createdBy: teacherId,
      isPublic: false
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found or you do not have permission to manage it'
      });
    }

    // Find the user by email
    const user = await User.findOne({ email: userEmail.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email'
      });
    }

    // Check if user is already in allowedUsers
    if (test.allowedUsers.includes(user._id)) {
      return res.status(400).json({
        success: false,
        message: 'User already has access to this test'
      });
    }

    // Check if user already has a pending request
    if (test.pendingRequests.includes(user._id)) {
      return res.status(400).json({
        success: false,
        message: 'User already has a pending request for this test'
      });
    }

    // Add user directly to allowedUsers (direct invite)
    test.allowedUsers.push(user._id);
    await test.save();

    res.status(200).json({
      success: true,
      message: 'User invited successfully',
      data: {
        userName: user.name || user.email,
        userEmail: user.email
      }
    });

  } catch (error) {
    console.error('Invite User Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to invite user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

