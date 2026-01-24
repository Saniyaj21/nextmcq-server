import express from 'express';
import { authenticateUser } from '../middlewares/auth.js';
import { getRecentPosts, createPost } from '../controllers/postController.js';

const router = express.Router();

router.get('/', authenticateUser, getRecentPosts); // GET /api/posts - Get recent posts
router.post('/', authenticateUser, createPost); // POST /api/posts - Create a new post

export default router;

