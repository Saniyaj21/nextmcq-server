# Test-Taking Feature - Technical Specifications

## 📋 Document Overview
**Version**: 1.0  
**Last Updated**: January 2024  
**Status**: Ready for Implementation  
**Priority**: High  

## 🎯 Feature Summary
Complete test-taking functionality for NextMCQ platform including secure test execution, real-time timer validation, gamified rewards system, and comprehensive results analytics.

## 🏗️ System Architecture

### **API Endpoints**

#### 1. Start Test
```http
POST /api/test-taking/start-test/:testId
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**: None

**Response**:
```json
{
  "success": true,
  "data": {
    "attemptId": "507f1f77bcf86cd799439011",
    "testId": "507f1f77bcf86cd799439012",
    "questions": [
      {
        "id": "507f1f77bcf86cd799439013",
        "question": "What is 2+2?",
        "options": ["1", "2", "3", "4"],
        "correctAnswer": 2
      }
    ],
    "timeLimit": 30,
    "totalQuestions": 10,
    "serverStartTime": "2024-01-01T10:00:00.000Z",
    "attemptNumber": 1
  },
  "message": "Test started successfully"
}
```

**Validation**:
- User authentication required
- Test access validation (public or allowed users)
- Prevent multiple simultaneous attempts
- Validate test exists and has questions

#### 2. Submit Answer
```http
POST /api/test-taking/submit-answer/:attemptId
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "questionId": "507f1f77bcf86cd799439013",
  "selectedAnswer": 2,
  "timeSpent": 45
}
```

**Response**:
```json
{
  "success": true,
  "message": "Answer saved successfully"
}
```

#### 3. Submit Test
```http
POST /api/test-taking/submit-test/:attemptId
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "answers": {
    "507f1f77bcf86cd799439013": 2,
    "507f1f77bcf86cd799439014": 1
  },
  "clientEndTime": "2024-01-01T10:30:00.000Z"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "attemptId": "507f1f77bcf86cd799439011",
    "score": {
      "correct": 8,
      "total": 10,
      "percentage": 80
    },
    "timeSpent": 1800,
    "rewards": {
      "coins": 95,
      "xp": 95,
      "breakdown": {
        "questionRewards": { "coins": 80, "xp": 80 },
        "speedBonus": { "coins": 15, "xp": 15 }
      }
    },
    "speedBonusEarned": true,
    "rank": 42
  },
  "message": "Test submitted successfully"
}
```

#### 4. Get Test Results
```http
GET /api/test-taking/test-results/:attemptId
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "attempt": {
      "id": "507f1f77bcf86cd799439011",
      "testId": "507f1f77bcf86cd799439012",
      "score": { "correct": 8, "total": 10, "percentage": 80 },
      "timeSpent": 1800,
      "completedAt": "2024-01-01T10:30:00.000Z"
    },
    "questions": [
      {
        "id": "507f1f77bcf86cd799439013",
        "question": "What is 2+2?",
        "options": ["1", "2", "3", "4"],
        "correctAnswer": 2,
        "userAnswer": 2,
        "isCorrect": true,
        "timeSpent": 45
      }
    ],
    "rewards": {
      "coins": 95,
      "xp": 95
    },
    "test": {
      "title": "Math Quiz",
      "subject": "Mathematics",
      "createdBy": {
        "name": "John Doe",
        "profileImage": { "url": "..." }
      }
    }
  }
}
```

#### 5. Get User Attempts
```http
GET /api/test-taking/user-attempts/:testId
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "attempts": [
      {
        "id": "507f1f77bcf86cd799439011",
        "attemptNumber": 1,
        "score": { "correct": 8, "total": 10, "percentage": 80 },
        "timeSpent": 1800,
        "completedAt": "2024-01-01T10:30:00.000Z",
        "rewards": { "coins": 95, "xp": 95 }
      }
    ],
    "totalAttempts": 3,
    "bestScore": 90,
    "averageScore": 76.7
  }
}
```

## 🗄️ Data Models

### **TestAttempt Model Updates**
```javascript
const testAttemptSchema = new mongoose.Schema({
  // Existing fields...
  
  // New fields for test-taking
  currentQuestion: {
    type: Number,
    default: 0,
    min: 0
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  serverStartTime: {
    type: Date,
    required: true
  },
  
  serverEndTime: {
    type: Date,
    default: null
  },
  
  clientTimeValidation: {
    startTime: Date,
    endTime: Date,
    timeDifference: Number // seconds
  },
  
  // Enhanced answers tracking
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    selectedAnswer: {
      type: Number,
      min: 0,
      max: 3,
      default: null
    },
    isCorrect: {
      type: Boolean,
      default: false
    },
    timeSpent: {
      type: Number, // seconds on this question
      default: 0
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Enhanced rewards tracking
  rewards: {
    coins: {
      type: Number,
      default: 0
    },
    xp: {
      type: Number,
      default: 0
    },
    breakdown: {
      questionRewards: { coins: Number, xp: Number },
      speedBonus: { coins: Number, xp: Number },
      completionBonus: { coins: Number, xp: Number }
    }
  }
}, { timestamps: true });
```

### **Database Indexes**
```javascript
// Performance optimization indexes
TestAttempt.collection.createIndex({ userId: 1, testId: 1, status: 1 });
TestAttempt.collection.createIndex({ testId: 1, completedAt: -1 });
TestAttempt.collection.createIndex({ userId: 1, completedAt: -1 });
TestAttempt.collection.createIndex({ serverStartTime: 1 });
TestAttempt.collection.createIndex({ status: 1, createdAt: -1 });
```

## 🔒 Security Specifications

### **Time Validation**
```javascript
const validateTestTime = (attempt, clientEndTime) => {
  const serverTime = new Date();
  const clientTime = new Date(clientEndTime);
  const serverStartTime = attempt.serverStartTime;
  
  // Calculate expected time spent
  const expectedTimeSpent = Math.floor((serverTime - serverStartTime) / 1000);
  const clientTimeSpent = Math.floor((clientTime - serverStartTime) / 1000);
  
  // Allow 5% tolerance for network delays
  const tolerance = Math.max(30, expectedTimeSpent * 0.05);
  const timeDifference = Math.abs(expectedTimeSpent - clientTimeSpent);
  
  if (timeDifference > tolerance) {
    throw new Error('Time validation failed - possible timer manipulation');
  }
  
  return expectedTimeSpent;
};
```

### **Access Control**
```javascript
const validateTestAccess = async (userId, testId) => {
  const test = await Test.findById(testId);
  
  if (!test) {
    throw new Error('Test not found');
  }
  
  // Check if test is public
  if (test.isPublic) {
    return true;
  }
  
  // Check if user is in allowed users
  const hasAccess = test.allowedUsers.some(user => 
    user.toString() === userId
  ) || test.createdBy.toString() === userId;
  
  if (!hasAccess) {
    throw new Error('Access denied to private test');
  }
  
  return true;
};
```

### **Input Validation**
```javascript
const validateAnswerSubmission = (questionId, selectedAnswer, timeSpent) => {
  // Validate question ID
  if (!mongoose.Types.ObjectId.isValid(questionId)) {
    throw new Error('Invalid question ID');
  }
  
  // Validate selected answer
  if (selectedAnswer < 0 || selectedAnswer > 3) {
    throw new Error('Selected answer must be between 0 and 3');
  }
  
  // Validate time spent
  if (timeSpent < 0 || timeSpent > 3600) { // Max 1 hour per question
    throw new Error('Invalid time spent on question');
  }
  
  return true;
};
```

## 🎁 Reward System Specifications

### **Reward Calculation**
```javascript
const calculateTestRewards = (attempt, test, user) => {
  const isFirstAttempt = attempt.attemptNumber === 1;
  const baseReward = isFirstAttempt 
    ? REWARDS.QUESTION_CORRECT.FIRST_ATTEMPT
    : REWARDS.QUESTION_CORRECT.REPEAT_ATTEMPT;
  
  // Calculate question rewards (correct answers only)
  const correctAnswers = attempt.answers.filter(answer => answer.isCorrect);
  const questionRewards = {
    coins: correctAnswers.length * baseReward.coins,
    xp: correctAnswers.length * baseReward.xp
  };
  
  // Calculate speed bonus
  const timeThreshold = test.timeLimit * 0.5; // 50% of time limit
  const speedBonus = attempt.timeSpent < timeThreshold 
    ? REWARDS.SPEED_BONUS.UNDER_50_PERCENT_TIME 
    : { coins: 0, xp: 0 };
  
  // Calculate completion bonus
  const completionBonus = REWARDS.TEST_COMPLETION;
  
  return {
    coins: questionRewards.coins + speedBonus.coins + completionBonus.coins,
    xp: questionRewards.xp + speedBonus.xp + completionBonus.xp,
    breakdown: {
      questionRewards,
      speedBonus,
      completionBonus
    }
  };
};
```

### **Teacher Reward Distribution**
```javascript
const distributeTeacherRewards = async (testId, studentAttempt) => {
  const test = await Test.findById(testId).populate('createdBy');
  const teacher = test.createdBy;
  
  const teacherReward = REWARDS.TEACHER.STUDENT_ATTEMPT;
  
  await User.findByIdAndUpdate(teacher._id, {
    $inc: {
      'rewards.coins': teacherReward.coins,
      'rewards.xp': teacherReward.xp,
      'teacher.totalAttemptsOfStudents': 1
    }
  });
  
  return teacherReward;
};
```

## 📊 Performance Specifications

### **Response Time Requirements**
- Start Test API: < 500ms
- Submit Answer API: < 200ms
- Submit Test API: < 1000ms
- Get Results API: < 300ms
- Get User Attempts API: < 400ms

### **Concurrency Handling**
- Support 1000+ concurrent test attempts
- Database connection pooling
- Efficient query optimization
- Caching for frequently accessed data

### **Error Handling**
```javascript
const errorHandler = (error, req, res, next) => {
  console.error('Test-taking error:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.errors
    });
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
};
```

## 🔄 State Management

### **Test Attempt States**
```javascript
const ATTEMPT_STATES = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
  TIMED_OUT: 'timed_out',
  SUBMITTED: 'submitted'
};
```

### **State Transitions**
```
in_progress → completed (on successful submission)
in_progress → abandoned (on user cancellation)
in_progress → timed_out (on timeout)
completed → (final state)
```

## 📝 Logging & Monitoring

### **Required Logs**
```javascript
// Test start
// Log test start event (use proper logging service in production)

// Answer submission
// Log answer submission event (use proper logging service in production)

// Test completion
// Log test completion event (use proper logging service in production)

// Reward distribution
// Log reward distribution event (use proper logging service in production)

// Security events
console.warn(`Time validation failed: attemptId=${attemptId}, timeDiff=${timeDifference}`);
```

### **Metrics to Track**
- Test completion rates
- Average test duration
- Reward distribution accuracy
- Time validation failures
- API response times
- Error rates by endpoint

## 🧪 Testing Specifications

### **Unit Tests Required**
- Reward calculation functions
- Time validation logic
- Input validation functions
- Access control checks
- Score calculation algorithms

### **Integration Tests Required**
- Complete test-taking flow
- API endpoint functionality
- Database operations
- Error handling scenarios
- Security validations

### **Performance Tests Required**
- Concurrent user load testing
- Database query optimization
- Memory usage monitoring
- Response time validation

---

*This technical specification provides the complete foundation for implementing a robust, secure, and scalable test-taking system for NextMCQ.*
