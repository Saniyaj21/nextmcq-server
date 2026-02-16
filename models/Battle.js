import mongoose from 'mongoose';

const playerStateSchema = new mongoose.Schema({
  score: { type: Number, default: 0 },
  currentQuestionIndex: { type: Number, default: 0 },
  answers: [{
    questionIndex: Number,
    selectedAnswer: Number,
    isCorrect: Boolean,
    pointsEarned: Number,
    answeredAt: { type: Date, default: Date.now }
  }],
  isFinished: { type: Boolean, default: false },
  finishedAt: { type: Date, default: null }
}, { _id: false });

const battleQuestionSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, required: true }
}, { _id: false });

const battleSchema = new mongoose.Schema({
  battleCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    minlength: 6,
    maxlength: 6
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  opponent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Settings
  subject: { type: String, required: true },
  maxQuestions: { type: Number, required: true, min: 5, max: 50 },
  targetScore: { type: Number, required: true, min: 1 },
  correctMarks: { type: Number, required: true, default: 2, min: 1 },
  wrongMarks: { type: Number, required: true, default: 1, min: 0 },

  // Questions
  questions: [battleQuestionSchema],

  // Player states
  creatorState: { type: playerStateSchema, default: () => ({}) },
  opponentState: { type: playerStateSchema, default: () => ({}) },

  // Lifecycle
  status: {
    type: String,
    enum: ['waiting', 'in_progress', 'completed', 'expired'],
    default: 'waiting'
  },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  winReason: {
    type: String,
    enum: ['target_reached', 'all_answered', 'timeout', 'opponent_quit', null],
    default: null
  },
  isDraw: { type: Boolean, default: false },

  // Rewards
  rewards: {
    winner: { coins: { type: Number, default: 0 }, xp: { type: Number, default: 0 } },
    loser: { coins: { type: Number, default: 0 }, xp: { type: Number, default: 0 } }
  },

  // Timestamps
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

battleSchema.index({ status: 1, expiresAt: 1 });
battleSchema.index({ creator: 1, status: 1 });
battleSchema.index({ opponent: 1, status: 1 });

const Battle = mongoose.model('Battle', battleSchema);

export default Battle;
