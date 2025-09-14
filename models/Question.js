import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
    question: {
      type: String,
      required: [true, 'Please provide the question text'],
      trim: true
    },
    options: [{
      type: String,
      required: true,
      trim: true
    }],
    correctAnswer: {
      type: Number,
      required: [true, 'Please provide the correct answer index'],
      min: [0, 'Correct answer index must be between 0 and 3'],
      max: [3, 'Correct answer index must be between 0 and 3'],
      validate: {
        validator: function(value) {
          return Number.isInteger(value);
        },
        message: 'Correct answer must be an integer'
      }
    },
    explanation: {
      type: String,
      trim: true
    },
    tests: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test'
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide the creator']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }, { timestamps: true });

// Pre-save middleware to validate options array length
questionSchema.pre('save', function(next) {
  if (this.options.length !== 4) {
    next(new Error('Question must have exactly 4 options'));
  } else {
    next();
  }
});


const Question = mongoose.model('Question', questionSchema);

export default Question;
