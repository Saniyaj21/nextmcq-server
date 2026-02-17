import express from 'express';
import { authenticateUser, authorizeRoles } from '../middlewares/auth.js';
import { auditMiddleware } from '../middlewares/auditLog.js';
import {
  verifyAdmin,
  getDashboardStats,
  getDashboardGrowth,
  getUsersAnalytics,
  getTestsAnalytics,
  getQuestionsAnalytics,
  getUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  changeUserRole,
  getUserAttempts,
  getUserReferrals,
  getTests,
  getTestById,
  deleteTest,
  importTest,
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
  deletePost,
  getAttempts,
  getAttemptById,
  getAttemptsAnalytics,
  getBatches,
  getBatchById,
  deleteBatch,
  getLeaderboard,
  getReferralStats,
  getReferrals,
  getRatings,
  getRatingStats,
  getSettings,
  updateSetting,
  updateSettingsBulk,
  exportUsers,
  exportAttempts,
  exportTests,
  getAuditLogs
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
router.get('/users/analytics', getUsersAnalytics);
router.get('/users', getUsers);
router.get('/users/:userId', getUserById);
router.put('/users/:userId', auditMiddleware('update', 'user'), updateUser);
router.patch('/users/:userId/status', auditMiddleware('toggle_status', 'user'), toggleUserStatus);
router.patch('/users/:userId/role', auditMiddleware('change_role', 'user'), changeUserRole);
router.get('/users/:userId/attempts', getUserAttempts);
router.get('/users/:userId/referrals', getUserReferrals);

// Tests
router.get('/tests/analytics', getTestsAnalytics);
router.get('/tests', getTests);
router.get('/tests/:testId', getTestById);
router.delete('/tests/:testId', auditMiddleware('delete', 'test'), deleteTest);
router.post('/tests/import', auditMiddleware('import', 'test'), importTest);

// Questions
router.get('/questions/analytics', getQuestionsAnalytics);
router.get('/questions', getQuestions);
router.delete('/questions/:questionId', auditMiddleware('delete', 'question'), deleteQuestion);

// Feedback
router.get('/feedback', getFeedback);
router.get('/feedback/:feedbackId', getFeedbackById);
router.put('/feedback/:feedbackId/respond', auditMiddleware('respond', 'feedback'), respondToFeedback);
router.patch('/feedback/:feedbackId/status', auditMiddleware('update_status', 'feedback'), updateFeedbackStatus);
router.patch('/feedback/:feedbackId/priority', auditMiddleware('update_priority', 'feedback'), updateFeedbackPriority);

// Institutes
router.get('/institutes', getInstitutes);
router.post('/institutes', auditMiddleware('create', 'institute'), createInstitute);
router.put('/institutes/:instituteId', auditMiddleware('update', 'institute'), updateInstitute);
router.patch('/institutes/:instituteId/status', auditMiddleware('toggle_status', 'institute'), toggleInstituteStatus);

// Banners
router.get('/banners', getBanners);
router.post('/banners', auditMiddleware('create', 'banner'), createBanner);
router.put('/banners/:bannerId', auditMiddleware('update', 'banner'), updateBanner);
router.delete('/banners/:bannerId', auditMiddleware('delete', 'banner'), deleteBanner);
router.patch('/banners/:bannerId/status', auditMiddleware('toggle_status', 'banner'), toggleBannerStatus);

// Monthly Rewards
router.get('/monthly-rewards', getMonthlyRewards);
router.get('/monthly-rewards/jobs', getMonthlyRewardJobs);
router.post('/monthly-rewards/trigger', auditMiddleware('trigger', 'monthly_rewards'), triggerMonthlyRewards);

// Posts
router.get('/posts', getPosts);
router.delete('/posts/:postId', auditMiddleware('delete', 'post'), deletePost);

// Attempts
router.get('/attempts/analytics', getAttemptsAnalytics);
router.get('/attempts', getAttempts);
router.get('/attempts/:attemptId', getAttemptById);

// Batches
router.get('/batches', getBatches);
router.get('/batches/:batchId', getBatchById);
router.delete('/batches/:batchId', auditMiddleware('delete', 'batch'), deleteBatch);

// Leaderboard
router.get('/leaderboard', getLeaderboard);

// Referrals
router.get('/referrals/stats', getReferralStats);
router.get('/referrals', getReferrals);

// Ratings
router.get('/ratings/stats', getRatingStats);
router.get('/ratings', getRatings);

// Settings
router.get('/settings', getSettings);
router.put('/settings/bulk', auditMiddleware('bulk_update', 'settings'), updateSettingsBulk);
router.put('/settings/:key', auditMiddleware('update', 'settings'), updateSetting);

// Export / Reports
router.get('/export/users', exportUsers);
router.get('/export/attempts', exportAttempts);
router.get('/export/tests', exportTests);

// Audit Logs
router.get('/audit-logs', getAuditLogs);

export default router;
