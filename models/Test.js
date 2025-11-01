import mongoose from 'mongoose';
import { SYSTEM_LIMITS } from '../constants/rewards.js';

/**
 * Test Schema
 * 
 * - allowedUsers: Array of user ObjectIds who are allowed to access the test (when isPublic is false)
 * - pendingRequests: Array of user ObjectIds who have requested access but are not yet allowed (when isPublic is false)
 * 
 * Note: These arrays are only relevant when isPublic is false. 
 * Application logic should ensure they are ignored or empty when isPublic is true.
 * 
 * Example usage:
 *   - If isPublic === false, allowedUsers and pendingRequests are used for access control.
 *   - If isPublic === true, all users can access, and allowedUsers/pendingRequests should be empty or ignored.
 */
const testSchema = new mongoose.Schema({
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true
    },
    subject: {
      type: String,
      required: [true, 'Please provide a subject'],
      trim: true
    },
    chapter: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    timeLimit: {
      type: Number,
      required: [true, 'Please provide a time limit'],
      min: [SYSTEM_LIMITS.TEST_TIME_LIMIT.MIN, `Time limit must be at least ${SYSTEM_LIMITS.TEST_TIME_LIMIT.MIN} minute`],
      max: [SYSTEM_LIMITS.TEST_TIME_LIMIT.MAX, `Time limit cannot exceed ${SYSTEM_LIMITS.TEST_TIME_LIMIT.MAX} minutes (${Math.floor(SYSTEM_LIMITS.TEST_TIME_LIMIT.MAX / 60)} hours)`],
      validate: {
        validator: function(value) {
          return Number.isInteger(value);
        },
        message: 'Time limit must be a whole number'
      }
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    // Only relevant when isPublic is false
    allowedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    // Only relevant when isPublic is false
    pendingRequests: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    attemptsCount: {
      type: Number,
      default: 0
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    // Aggregated rating fields for performance
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalRatings: {
      type: Number,
      default: 0,
      min: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide the creator']
    },
    attemptedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    questions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }, { timestamps: true });

const Test = mongoose.model('Test', testSchema);

export default Test;