import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  
  // Role
  role: {
    type: String,
    enum: ['student', 'teacher'],
    default: 'student',
    required: true
  },
  
  // Academic Information
  institute: {
    type: String,
    trim: true
  },
  
  subjects: [{
    type: String,
    trim: true
  }],
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  }
  
}, {
  timestamps: true
});

// Indexes for better query performance
userSchema.index({ role: 1 });

// Instance methods
userSchema.methods.isTeacher = function() {
  return this.role === 'teacher';
};

userSchema.methods.isStudent = function() {
  return this.role === 'student';
};

// Static methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findByRole = function(role) {
  return this.find({ role });
};

const User = mongoose.model('User', userSchema);

export default User;
