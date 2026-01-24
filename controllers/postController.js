// File: server/controllers/postController.js
import Post from '../models/Post.js';

/**
 * Get recent posts for feeds
 * GET /api/posts
 */
export const getRecentPosts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
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

/**
 * Create a user post
 * POST /api/posts
 */
export const createPost = async (req, res) => {
  try {
    const userId = req.user._id;
    const { title, description } = req.body;

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Post title is required'
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Post description is required'
      });
    }

    // Validate length
    if (title.trim().length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Title cannot exceed 200 characters'
      });
    }

    if (description.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Description cannot exceed 2000 characters'
      });
    }

    // Create post
    const post = new Post({
      type: 'user_post',
      creator: userId,
      title: title.trim(),
      description: description.trim(),
      data: {}
    });

    await post.save();

    // Populate creator for response
    await post.populate('creator', 'name role profileImage');

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: post
    });

  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default {
  getRecentPosts,
  createPost
};

