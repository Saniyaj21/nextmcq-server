import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema({
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: [true, 'Test ID is required']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating value is required'],
    min: [0.5, 'Rating must be at least 0.5'],
    max: [5, 'Rating cannot exceed 5']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true,
  // Ensure one rating per user per test
  indexes: [
    { testId: 1, userId: 1 },
    { unique: true, partialFilterExpression: { testId: { $exists: true }, userId: { $exists: true } } }
  ]
});

// Compound index to ensure one rating per user per test
ratingSchema.index({ testId: 1, userId: 1 }, { unique: true });

const Rating = mongoose.model('Rating', ratingSchema);

export default Rating;