// File: server/models/Feedback.js
// Feedback model for storing user feedback, bug reports, and feature requests

import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  // User information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },

  // Feedback type
  type: {
    type: String,
    enum: ['general', 'bug', 'feature', 'question'],
    required: [true, 'Feedback type is required'],
    index: true,
  },

  // Feedback content
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [100, 'Subject cannot exceed 100 characters'],
  },

  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters'],
  },

  // Contact email
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email'],
  },

  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'closed'],
    default: 'pending',
    index: true,
  },

  // Admin response
  adminResponse: {
    type: String,
    default: null,
    maxlength: [1000, 'Admin response cannot exceed 1000 characters'],
  },

  // Admin who responded
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },

  // Response date
  respondedAt: {
    type: Date,
    default: null,
  },

  // Priority (can be set by admin)
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },

  // Tags for categorization
  tags: [{
    type: String,
    trim: true,
  }],

  // Additional metadata
  userAgent: {
    type: String,
    default: null,
  },

  appVersion: {
    type: String,
    default: null,
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes for performance
feedbackSchema.index({ userId: 1, createdAt: -1 });
feedbackSchema.index({ type: 1, status: 1, createdAt: -1 });
feedbackSchema.index({ status: 1, priority: 1 });

// Pre-save middleware to update updatedAt
feedbackSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;

