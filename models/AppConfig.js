import mongoose from 'mongoose';

const appConfigSchema = new mongoose.Schema({
  key: {
    type: String,
    required: [true, 'Config key is required'],
    unique: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  category: {
    type: String,
    enum: ['rewards', 'limits', 'system', 'app'],
    default: 'system'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

appConfigSchema.index({ category: 1 });

const AppConfig = mongoose.model('AppConfig', appConfigSchema);

export default AppConfig;
