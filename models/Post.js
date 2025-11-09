// File: server/models/Post.js
import mongoose from 'mongoose';

const POST_TYPES = ['teacher_test_created', 'student_test_attempt'];

const postSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
      enum: POST_TYPES,
      index: true
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    description: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

postSchema.index({ createdAt: -1 });

const Post = mongoose.model('Post', postSchema);

export default Post;
export { POST_TYPES };

