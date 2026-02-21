import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

const Subject = mongoose.model('Subject', subjectSchema);

export default Subject;
