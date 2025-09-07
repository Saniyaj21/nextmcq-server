import mongoose from 'mongoose';

const instituteSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Institute name is required'],
    unique: true,
    trim: true,
    minlength: [2, 'Institute name must be at least 2 characters'],
    maxlength: [100, 'Institute name cannot exceed 100 characters']
  },
  
  // Location Information
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  
  // Institute Type
  type: {
    type: String,
    enum: ['school', 'college', 'university', 'academy', 'institute'],
    default: 'school',
    lowercase: true
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Creation tracking
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Can be null for seed data
  },
  
  // Additional metadata
  studentCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  teacherCount: {
    type: Number,
    default: 0,
    min: 0
  }
  
}, {
  timestamps: true,
  // Add indexes for better query performance
  indexes: [
    { name: 1 },
    { location: 1 },
    { type: 1 },
    { isActive: 1 },
    { name: 'text', location: 'text' } // Text search index
  ]
});

// Instance methods
instituteSchema.methods.incrementStudentCount = function() {
  this.studentCount += 1;
  return this.save();
};

instituteSchema.methods.incrementTeacherCount = function() {
  this.teacherCount += 1;
  return this.save();
};

instituteSchema.methods.decrementStudentCount = function() {
  if (this.studentCount > 0) {
    this.studentCount -= 1;
  }
  return this.save();
};

instituteSchema.methods.decrementTeacherCount = function() {
  if (this.teacherCount > 0) {
    this.teacherCount -= 1;
  }
  return this.save();
};

// Static methods
instituteSchema.statics.findByName = function(name) {
  return this.findOne({ 
    name: new RegExp(name, 'i'),
    isActive: true 
  });
};

instituteSchema.statics.searchInstitutes = function(searchTerm, limit = 50) {
  const regex = new RegExp(searchTerm, 'i');
  return this.find({
    $and: [
      { isActive: true },
      {
        $or: [
          { name: regex },
          { location: regex }
        ]
      }
    ]
  })
  .select('name location type studentCount teacherCount')
  .limit(limit)
  .sort({ name: 1 });
};

instituteSchema.statics.getPopularInstitutes = function(limit = 20) {
  return this.find({ isActive: true })
    .select('name location type studentCount teacherCount')
    .sort({ studentCount: -1, teacherCount: -1, name: 1 })
    .limit(limit);
};

// Pre-save middleware
instituteSchema.pre('save', function(next) {
  // Capitalize first letter of each word in name
  if (this.isModified('name')) {
    this.name = this.name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  // Capitalize location if provided
  if (this.isModified('location') && this.location) {
    this.location = this.location
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  next();
});

// Create text index for search functionality
instituteSchema.index({ 
  name: 'text', 
  location: 'text' 
}, {
  weights: {
    name: 10,
    location: 5
  },
  name: 'institute_text_index'
});

const Institute = mongoose.model('Institute', instituteSchema);

export default Institute;
