import User from '../models/User.js';
import Test from '../models/Test.js';
import Question from '../models/Question.js';
import TestAttempt from '../models/TestAttempt.js';
import Feedback from '../models/Feedback.js';
import Institute from '../models/Institute.js';
import Banner from '../models/Banner.js';
import Post from '../models/Post.js';
import MonthlyReward from '../models/MonthlyReward.js';
import MonthlyRewardJob from '../models/MonthlyRewardJob.js';
import { sendEmail } from '../utils/sendMail.js';

// ==========================================
// VERIFY
// ==========================================
export const verifyAdmin = async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        profileImage: req.user.profileImage
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// DASHBOARD
// ==========================================
export const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalStudents,
      totalTeachers,
      totalTests,
      totalAttempts,
      totalFeedback,
      pendingFeedback,
      totalInstitutes,
      activeUsers24h
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'teacher' }),
      Test.countDocuments(),
      TestAttempt.countDocuments({ status: 'completed' }),
      Feedback.countDocuments(),
      Feedback.countDocuments({ status: 'pending' }),
      Institute.countDocuments(),
      User.countDocuments({ lastLoginAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalStudents,
        totalTeachers,
        totalTests,
        totalAttempts,
        totalFeedback,
        pendingFeedback,
        totalInstitutes,
        activeUsers24h
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDashboardGrowth = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [userGrowth, attemptGrowth] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      TestAttempt.aggregate([
        { $match: { createdAt: { $gte: startDate }, status: 'completed' } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const roleDistribution = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const recentUsers = await User.find()
      .select('name email role createdAt profileImage')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const recentTests = await Test.find()
      .select('title subject createdBy attemptsCount createdAt')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({
      success: true,
      userGrowth,
      attemptGrowth,
      roleDistribution,
      recentUsers,
      recentTests
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// USERS ANALYTICS
// ==========================================
export const getUsersAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [signupGrowth, roleDistribution, statusDistribution] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      User.aggregate([
        {
          $group: {
            _id: { $cond: ['$isActive', 'active', 'inactive'] },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    res.json({ success: true, signupGrowth, roleDistribution, statusDistribution });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// TESTS ANALYTICS
// ==========================================
export const getTestsAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [testGrowth, subjectDistribution, visibilityDistribution] = await Promise.all([
      Test.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Test.aggregate([
        { $group: { _id: '$subject', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Test.aggregate([
        {
          $group: {
            _id: { $cond: ['$isPublic', 'public', 'private'] },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    res.json({ success: true, testGrowth, subjectDistribution, visibilityDistribution });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// QUESTIONS ANALYTICS
// ==========================================
export const getQuestionsAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [questionGrowth, optionCountDistribution, topCreators] = await Promise.all([
      Question.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Question.aggregate([
        {
          $group: {
            _id: { $size: '$options' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Question.aggregate([
        { $group: { _id: '$createdBy', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            count: 1,
            name: { $ifNull: ['$user.name', 'Unknown'] }
          }
        }
      ])
    ]);

    res.json({ success: true, questionGrowth, optionCountDistribution, topCreators });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// USERS
// ==========================================
export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, status } = req.query;
    const query = {};

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ name: regex }, { email: regex }];
    }
    if (role) query.role = role;
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('name email role institute rewards.level isActive createdAt profileImage')
        .populate('institute', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      users,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('institute')
      .lean();

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { name, role, isActive, institute } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (role !== undefined) update.role = role;
    if (isActive !== undefined) update.isActive = isActive;
    if (institute !== undefined) update.institute = institute || null;

    const user = await User.findByIdAndUpdate(req.params.userId, update, { new: true, runValidators: true })
      .populate('institute')
      .lean();

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isActive = !user.isActive;
    await user.save();

    res.json({ success: true, isActive: user.isActive });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['student', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role },
      { new: true, runValidators: true }
    ).lean();

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, role: user.role });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// TESTS
// ==========================================
export const getTests = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = {};

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ title: regex }, { subject: regex }];
    }

    const [tests, total] = await Promise.all([
      Test.find(query)
        .select('title subject createdBy attemptsCount averageRating isPublic questions createdAt')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Test.countDocuments(query)
    ]);

    res.json({
      success: true,
      tests,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTestById = async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId)
      .populate('createdBy', 'name email')
      .populate('questions')
      .lean();

    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

    const attemptStats = await TestAttempt.aggregate([
      { $match: { testId: test._id, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          avgScore: { $avg: '$score.percentage' },
          avgTime: { $avg: '$timeSpent' }
        }
      }
    ]);

    res.json({ success: true, test, attemptStats: attemptStats[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

    await Promise.all([
      TestAttempt.deleteMany({ testId: test._id }),
      Test.findByIdAndDelete(test._id)
    ]);

    res.json({ success: true, message: 'Test and related attempts deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// QUESTIONS
// ==========================================
export const getQuestions = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = {};

    if (search) {
      query.question = new RegExp(search, 'i');
    }

    const [questions, total] = await Promise.all([
      Question.find(query)
        .select('question options correctAnswer tests createdBy createdAt')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Question.countDocuments(query)
    ]);

    res.json({
      success: true,
      questions,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.questionId);
    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });

    // Remove from any tests that reference it
    await Test.updateMany(
      { questions: question._id },
      { $pull: { questions: question._id } }
    );

    res.json({ success: true, message: 'Question deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// FEEDBACK
// ==========================================
export const getFeedback = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, priority } = req.query;
    const query = {};

    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;

    const [feedback, total] = await Promise.all([
      Feedback.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Feedback.countDocuments(query)
    ]);

    res.json({
      success: true,
      feedback,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFeedbackById = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.feedbackId)
      .populate('userId', 'name email profileImage role')
      .populate('respondedBy', 'name email')
      .lean();

    if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });

    res.json({ success: true, feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const respondToFeedback = async (req, res) => {
  try {
    const { adminResponse } = req.body;
    if (!adminResponse) return res.status(400).json({ success: false, message: 'Response is required' });

    const feedback = await Feedback.findByIdAndUpdate(
      req.params.feedbackId,
      {
        adminResponse,
        respondedBy: req.userId,
        respondedAt: new Date(),
        status: 'reviewed'
      },
      { new: true }
    ).populate('userId', 'name email').lean();

    if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });

    // Send email notification to the user who submitted the feedback
    try {
      await sendEmail({
        to: feedback.email,
        subject: `Re: ${feedback.subject || 'Your Feedback'} - NextMCQ`,
        message: `Hi there,\n\nWe've reviewed your feedback and here is our response:\n\n${adminResponse}\n\nOriginal Subject: ${feedback.subject || 'N/A'}\n\nThank you for helping us improve NextMCQ!\n\nBest regards,\nThe NextMCQ Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #007bff;">We've responded to your feedback</h2>
            <p>Hi there,</p>
            <p>Thank you for reaching out to us. We've reviewed your feedback and have a response for you.</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 5px 0;"><strong>Your Subject:</strong> ${feedback.subject || 'N/A'}</p>
            </div>
            <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
              <p style="margin: 0 0 5px 0;"><strong>Our Response:</strong></p>
              <p style="margin: 0; white-space: pre-wrap;">${adminResponse}</p>
            </div>
            <p>Thank you for helping us improve NextMCQ!</p>
            <p>Best regards,<br>The NextMCQ Team</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send feedback response email:', emailError);
    }

    res.json({ success: true, feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFeedbackStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'reviewed', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const feedback = await Feedback.findByIdAndUpdate(
      req.params.feedbackId,
      { status },
      { new: true }
    ).lean();

    if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });

    res.json({ success: true, status: feedback.status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFeedbackPriority = async (req, res) => {
  try {
    const { priority } = req.body;
    if (!['low', 'medium', 'high', 'critical'].includes(priority)) {
      return res.status(400).json({ success: false, message: 'Invalid priority' });
    }

    const feedback = await Feedback.findByIdAndUpdate(
      req.params.feedbackId,
      { priority },
      { new: true }
    ).lean();

    if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });

    res.json({ success: true, priority: feedback.priority });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// INSTITUTES
// ==========================================
export const getInstitutes = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = {};

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ name: regex }, { location: regex }];
    }

    const [institutes, total] = await Promise.all([
      Institute.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Institute.countDocuments(query)
    ]);

    res.json({
      success: true,
      institutes,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createInstitute = async (req, res) => {
  try {
    const { name, location, type } = req.body;
    const institute = await Institute.create({ name, location, type, createdBy: req.userId });
    res.status(201).json({ success: true, institute });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateInstitute = async (req, res) => {
  try {
    const { name, location, type } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (location !== undefined) update.location = location;
    if (type !== undefined) update.type = type;

    const institute = await Institute.findByIdAndUpdate(
      req.params.instituteId,
      update,
      { new: true, runValidators: true }
    ).lean();

    if (!institute) return res.status(404).json({ success: false, message: 'Institute not found' });

    res.json({ success: true, institute });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleInstituteStatus = async (req, res) => {
  try {
    const institute = await Institute.findById(req.params.instituteId);
    if (!institute) return res.status(404).json({ success: false, message: 'Institute not found' });

    institute.isActive = !institute.isActive;
    await institute.save();

    res.json({ success: true, isActive: institute.isActive });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// BANNERS
// ==========================================
export const getBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, banners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createBanner = async (req, res) => {
  try {
    const { title, imageURL, isActive } = req.body;
    const banner = await Banner.create({ title, imageURL, isActive });
    res.status(201).json({ success: true, banner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBanner = async (req, res) => {
  try {
    const { title, imageURL, isActive } = req.body;
    const update = {};
    if (title !== undefined) update.title = title;
    if (imageURL !== undefined) update.imageURL = imageURL;
    if (isActive !== undefined) update.isActive = isActive;

    const banner = await Banner.findByIdAndUpdate(
      req.params.bannerId,
      update,
      { new: true }
    ).lean();

    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });

    res.json({ success: true, banner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.bannerId);
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });

    res.json({ success: true, message: 'Banner deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleBannerStatus = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.bannerId);
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });

    banner.isActive = !banner.isActive;
    await banner.save();

    res.json({ success: true, isActive: banner.isActive });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// MONTHLY REWARDS
// ==========================================
export const getMonthlyRewards = async (req, res) => {
  try {
    const { month, year, category } = req.query;
    const query = {};

    if (month) query.month = Number(month);
    if (year) query.year = Number(year);
    if (category) query.category = category;

    const rewards = await MonthlyReward.find(query)
      .populate('userId', 'name email role')
      .sort({ year: -1, month: -1, rank: 1 })
      .limit(200)
      .lean();

    res.json({ success: true, rewards });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMonthlyRewardJobs = async (req, res) => {
  try {
    const jobs = await MonthlyRewardJob.find()
      .sort({ year: -1, month: -1 })
      .limit(50)
      .lean();

    res.json({ success: true, jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const triggerMonthlyRewards = async (req, res) => {
  try {
    const now = new Date();
    const month = req.body.month || (now.getMonth() === 0 ? 12 : now.getMonth());
    const year = req.body.year || (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());

    const categories = ['students', 'teachers'];
    const results = [];

    for (const category of categories) {
      const job = await MonthlyRewardJob.findOrCreateJob(month, year, category);
      results.push({ category, jobId: job._id, status: job.status });
    }

    res.json({ success: true, message: 'Monthly reward jobs created/found', results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// POSTS
// ==========================================
export const getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const query = {};
    if (type) query.type = type;

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate('creator', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Post.countDocuments(query)
    ]);

    res.json({
      success: true,
      posts,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePost = async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
