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
      min: [0, 'Correct answer index must be at least 0'],
      validate: {
        validator: function(value) {
          return Number.isInteger(value) && value >= 0 && value < (this.options?.length || 5);
        },
        message: 'Correct answer must be a valid integer index within options range'
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
  if (!Array.isArray(this.options) || this.options.length < 2 || this.options.length > 5) {
    next(new Error('Question must have between 2 and 5 options'));
  } else if (this.correctAnswer < 0 || this.correctAnswer >= this.options.length) {
    next(new Error('Correct answer index must be within the range of options'));
  } else {
    next();
  }
});


const Question = mongoose.model('Question', questionSchema);

export default Question;
