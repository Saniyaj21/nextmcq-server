import mongoose from 'mongoose';

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
      default: 0
    },
    isPublic: {
      type: Boolean,
      default: false
    },
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide the creator']
    },
    attemptedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }, { timestamps: true });

const Test = mongoose.model('Test', testSchema);

export default Test;