import Reply from '../models/Reply.js';
import Post from '../models/Post.js';

/**
 * Get replies for a post
 * GET /api/posts/:postId/replies
 */
export const getReplies = async (req, res) => {
  try {
    const { postId } = req.params;
    const replies = await Reply.find({ post: postId })
      .sort({ createdAt: 1 })
      .populate('creator', 'name role profileImage');

    res.status(200).json({ success: true, data: replies });
  } catch (error) {
    console.error('Get replies error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch replies' });
  }
};

/**
 * Add a reply to a post
 * POST /api/posts/:postId/replies
 */
export const addReply = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Reply content is required' });
    }

    if (content.trim().length > 500) {
      return res.status(400).json({ success: false, message: 'Reply cannot exceed 500 characters' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const reply = new Reply({
      post: postId,
      content: content.trim(),
      creator: userId,
    });

    await reply.save();
    await reply.populate('creator', 'name role profileImage');

    await Post.findByIdAndUpdate(postId, { $inc: { replyCount: 1 } });

    res.status(201).json({ success: true, data: reply });
  } catch (error) {
    console.error('Add reply error:', error);
    res.status(500).json({ success: false, message: 'Failed to add reply' });
  }
};

