import express from 'express';
import { 
  getTeacherRequests, 
  approveRequest, 
  rejectRequest, 
  removeAccess, 
  inviteUser 
} from '../controllers/inviteController.js';
import { authenticateUser } from '../middlewares/auth.js';

const router = express.Router();

// All routes require authentication
router.get('/teacher-requests', authenticateUser, getTeacherRequests);  // GET /api/invites/teacher-requests
router.post('/approve', authenticateUser, approveRequest);  // POST /api/invites/approve
router.post('/reject', authenticateUser, rejectRequest);  // POST /api/invites/reject
router.post('/remove-access', authenticateUser, removeAccess);  // POST /api/invites/remove-access
router.post('/invite-user', authenticateUser, inviteUser);  // POST /api/invites/invite-user

export default router;

