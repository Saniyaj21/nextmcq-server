import express from 'express';
import { authenticateUser, authorizeRoles } from '../middlewares/auth.js';
import {
  verifyAdmin,
  getDashboardStats,
  getDashboardGrowth,
  getUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  changeUserRole,
  getTests,
  getTestById,
  deleteTest,
  getQuestions,
  deleteQuestion,
  getFeedback,
  getFeedbackById,
  respondToFeedback,
  updateFeedbackStatus,
  updateFeedbackPriority,
  getInstitutes,
  createInstitute,
  updateInstitute,
  toggleInstituteStatus,
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
  getMonthlyRewards,
  getMonthlyRewardJobs,
  triggerMonthlyRewards,
  getPosts,
  deletePost
} from '../controllers/adminController.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateUser, authorizeRoles('admin'));

// Verify
router.get('/verify', verifyAdmin);

// Dashboard
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/growth', getDashboardGrowth);

// Users
router.get('/users', getUsers);
router.get('/users/:userId', getUserById);
router.put('/users/:userId', updateUser);
router.patch('/users/:userId/status', toggleUserStatus);
router.patch('/users/:userId/role', changeUserRole);

// Tests
router.get('/tests', getTests);
router.get('/tests/:testId', getTestById);
router.delete('/tests/:testId', deleteTest);

// Questions
router.get('/questions', getQuestions);
router.delete('/questions/:questionId', deleteQuestion);

// Feedback
router.get('/feedback', getFeedback);
router.get('/feedback/:feedbackId', getFeedbackById);
router.put('/feedback/:feedbackId/respond', respondToFeedback);
router.patch('/feedback/:feedbackId/status', updateFeedbackStatus);
router.patch('/feedback/:feedbackId/priority', updateFeedbackPriority);

// Institutes
router.get('/institutes', getInstitutes);
router.post('/institutes', createInstitute);
router.put('/institutes/:instituteId', updateInstitute);
router.patch('/institutes/:instituteId/status', toggleInstituteStatus);

// Banners
router.get('/banners', getBanners);
router.post('/banners', createBanner);
router.put('/banners/:bannerId', updateBanner);
router.delete('/banners/:bannerId', deleteBanner);
router.patch('/banners/:bannerId/status', toggleBannerStatus);

// Monthly Rewards
router.get('/monthly-rewards', getMonthlyRewards);
router.get('/monthly-rewards/jobs', getMonthlyRewardJobs);
router.post('/monthly-rewards/trigger', triggerMonthlyRewards);

// Posts
router.get('/posts', getPosts);
router.delete('/posts/:postId', deletePost);

export default router;
