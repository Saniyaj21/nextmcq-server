import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
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
    default: 'student'
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
  },
  
  // Authentication fields
  otp: {
    type: String,
    default: null
  },
  
  otpExpiry: {
    type: Date,
    default: null
  },

  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  lastLoginAt: {
    type: Date
  },
  
  // Profile completion status
  isProfileComplete: {
    type: Boolean,
    default: false
  },
  
  token: {
    type: String,
    default: null
  },

  
}, {
  timestamps: true
});


// Instance methods
userSchema.methods.isTeacher = function() {
  return this.role === 'teacher';
};

userSchema.methods.isStudent = function() {
  return this.role === 'student';
};

// OTP related methods
userSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  this.otp = otp;
  this.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
  return otp;
};

userSchema.methods.isOTPValid = function(enteredOTP) {
  return this.otp === enteredOTP && this.otpExpiry > new Date();
};

userSchema.methods.clearOTP = function() {
  this.otp = null;
  this.otpExpiry = null;
  return this.save();
};

userSchema.methods.verifyEmail = function() {
  this.isEmailVerified = true;
  this.clearOTP();
  return this.save();
};

userSchema.methods.updateLoginInfo = function() {
  this.lastLoginAt = new Date();
  return this.save();
};

userSchema.methods.completeProfile = function(profileData) {
  Object.assign(this, profileData);
  this.isProfileComplete = true;
  return this.save();
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
