import express from 'express';
import { authenticateUser } from '../middlewares/auth.js';
import { getRecentPosts } from '../controllers/postController.js';

const router = express.Router();

router.get('/', authenticateUser, getRecentPosts);

export default router;

