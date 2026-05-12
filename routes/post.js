import express from 'express';
import { authenticateUser } from '../middlewares/auth.js';
import { getRecentPosts, createPost } from '../controllers/postController.js';
import { getReplies, addReply } from '../controllers/replyController.js';

const router = express.Router();

router.get('/', authenticateUser, getRecentPosts);
router.post('/', authenticateUser, createPost);

router.get('/:postId/replies', authenticateUser, getReplies);
router.post('/:postId/replies', authenticateUser, addReply);

export default router;
