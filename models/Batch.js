// File: ./models/Batch.js
import mongoose from 'mongoose';

/**
 * Batch Schema
 * Represents a group of students that can be assigned to tests together
 */
const batchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Batch name is required'],
    trim: true,
    maxlength: [100, 'Batch name cannot exceed 100 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Indexes for efficient queries
batchSchema.index({ createdBy: 1, name: 1 }); // For teacher's batch queries
batchSchema.index({ students: 1 }); // For finding batches by student

// Virtual for student count
batchSchema.virtual('studentCount').get(function() {
  return this.students ? this.students.length : 0;
});

// Ensure virtuals are included in JSON
batchSchema.set('toJSON', { virtuals: true });
batchSchema.set('toObject', { virtuals: true });

const Batch = mongoose.model('Batch', batchSchema);

export default Batch;

