// File: server/controllers/postController.js
import Post from '../models/Post.js';

/**
 * Get recent posts for feeds
 * GET /api/posts
 */
export const getRecentPosts = async (req, res) => {
  try {
    const limit = 30;
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('creator', 'name role profileImage');

    res.status(200).json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch posts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default {
  getRecentPosts
};

