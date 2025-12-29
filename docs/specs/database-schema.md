# Database Schema

This file defines the database design, entity relationships, and data structure specifications for the NextMCQ system.

## 📊 Database Overview

**Database**: MongoDB  
**ODM**: Mongoose ^8.18.0  
**Collections**: 9 main collections

---

## 📋 Collections

### 1. **Users Collection**

User accounts with dual-role support (student/teacher).

```javascript
{
  _id: ObjectId,
  name: String,
  email: String, // unique, indexed
  role: ['student', 'teacher'],
  institute: ObjectId, // ref: 'Institute'
  subjects: [String],
  profileImage: {
    url: String,
    publicId: String,
    uploadedAt: Date
  },
  // Authentication
  otp: String,
  otpExpiry: Date,
  isEmailVerified: Boolean,
  lastLoginAt: Date,
  token: String,
  // Gamification
  rewards: {
    coins: Number,
    xp: Number,
    level: Number
  },
  student: {
    totalTests: Number,
    correctAnswers: Number,
    totalQuestions: Number
  },
  teacher: {
    testsCreated: Number,
    questionsCreated: Number,
    studentsTaught: Number,
    totalAttemptsOfStudents: Number
  },
  // Social Features
  referredBy: ObjectId, // ref: 'User'
  referralCode: String, // unique, sparse
  attemptedTests: [ObjectId], // ref: 'Test'
  timestamps: true
}
```

**Indexes:**
- `email`: unique
- `referralCode`: unique, sparse
- `institute`: indexed
- `role`: indexed

---

### 2. **Tests Collection**

MCQ test definitions created by teachers.

```javascript
{
  _id: ObjectId,
  title: String,
  subject: String,
  chapter: String,
  description: String,
  timeLimit: Number, // minutes
  isPublic: Boolean,
  allowedUsers: [ObjectId], // ref: 'User' (only when !isPublic)
  pendingRequests: [ObjectId], // ref: 'User' (only when !isPublic)
  attemptsCount: Number,
  rating: Number, // 0-5
  createdBy: ObjectId, // ref: 'User'
  attemptedBy: [ObjectId], // ref: 'User'
  questions: [ObjectId], // ref: 'Question'
  timestamps: true
}
```

**Indexes:**
- `createdBy`: indexed
- `subject`: indexed
- `isPublic`: indexed
- `title`: text index

---

### 3. **Questions Collection**

MCQ questions with 4 options.

```javascript
{
  _id: ObjectId,
  question: String,
  options: [String], // exactly 4 options
  correctAnswer: Number, // 0-3 (index of correct option)
  explanation: String,
  tests: [ObjectId], // ref: 'Test'
  createdBy: ObjectId, // ref: 'User'
  timestamps: true
}
```

**Indexes:**
- `createdBy`: indexed
- `tests`: indexed
- `question`: text index

---

### 4. **TestAttempts Collection**

User test attempts with answers and scoring.

```javascript
{
  _id: ObjectId,
  userId: ObjectId, // ref: 'User'
  testId: ObjectId, // ref: 'Test'
  attemptNumber: Number,
  status: ['in_progress', 'completed', 'abandoned', 'timed_out'],
  startedAt: Date,
  completedAt: Date,
  timeLimit: Number, // minutes
  timeSpent: Number, // seconds
  answers: [{
    questionId: ObjectId, // ref: 'Question'
    selectedAnswer: Number, // 0-3
    isCorrect: Boolean,
    timeSpent: Number // seconds on this question
  }],
  score: {
    correct: Number,
    total: Number,
    percentage: Number
  },
  rewards: {
    coins: Number,
    xp: Number
  },
  timestamps: true
}
```

**Indexes:**
- `userId`: indexed
- `testId`: indexed
- `status`: indexed
- Compound: `{ userId: 1, status: 1 }`
- Compound: `{ testId: 1, userId: 1 }`

---

### 5. **MonthlyRankingSnapshot Collection** ⭐ NEW

Historical snapshots of monthly rankings for reward processing.

```javascript
{
  _id: ObjectId,
  month: Number, // 1-12, indexed
  year: Number, // min: 2020, indexed
  category: ['global', 'students', 'teachers'], // indexed
  rankings: [{
    userId: ObjectId, // ref: 'User'
    rank: Number, // min: 1
    score: Number, // min: 0
    userName: String, // snapshot data
    userEmail: String, // snapshot data
    role: ['student', 'teacher']
  }],
  totalUsers: Number, // min: 0
  snapshotDate: Date,
  processed: Boolean, // indexed, default: false
  processedAt: Date,
  timestamps: true
}
```

**Indexes:**
- `month`: indexed
- `year`: indexed
- `category`: indexed
- `processed`: indexed
- Compound: `{ year: 1, month: 1, category: 1 }` (unique)
- Compound: `{ processed: 1, year: 1, month: 1 }`

---

### 6. **MonthlyReward Collection** ⭐ NEW

Records of monthly rewards distributed to users.

```javascript
{
  _id: ObjectId,
  month: Number, // 1-12, indexed
  year: Number, // min: 2020, indexed
  category: ['global', 'students', 'teachers'], // indexed
  userId: ObjectId, // ref: 'User', indexed
  rank: Number, // min: 1
  tier: ['CHAMPION', 'ELITE', 'ACHIEVER', 'PERFORMER', 'UNPLACED'], // indexed
  coinsAwarded: Number, // min: 0
  badgeAwarded: String,
  snapshotId: ObjectId, // ref: 'MonthlyRankingSnapshot', indexed
  status: ['pending', 'awarded', 'failed'], // indexed, default: 'pending'
  errorMessage: String,
  awardedAt: Date,
  timestamps: true
}
```

**Indexes:**
- `month`: indexed
- `year`: indexed
- `category`: indexed
- `userId`: indexed
- `tier`: indexed
- `status`: indexed
- `snapshotId`: indexed
- Compound: `{ userId: 1, year: 1, month: 1 }`
- Compound: `{ year: 1, month: 1, category: 1, tier: 1 }`
- Compound: `{ status: 1, year: 1, month: 1 }`

---

### 7. **Feedback Collection** ⭐ NEW

User feedback, bug reports, and feature requests.

```javascript
{
  _id: ObjectId,
  userId: ObjectId, // ref: 'User', indexed
  type: ['general', 'bug', 'feature', 'question'], // indexed
  subject: String, // maxlength: 100
  message: String, // maxlength: 2000
  email: String, // required, validated
  status: ['pending', 'reviewed', 'resolved', 'closed'], // indexed, default: 'pending'
  adminResponse: String, // maxlength: 1000
  respondedBy: ObjectId, // ref: 'User'
  respondedAt: Date,
  priority: ['low', 'medium', 'high', 'critical'], // default: 'medium'
  tags: [String],
  userAgent: String,
  appVersion: String,
  timestamps: true
}
```

**Indexes:**
- `userId`: indexed
- `type`: indexed
- `status`: indexed
- `createdAt`: indexed
- Compound: `{ userId: 1, createdAt: -1 }`
- Compound: `{ type: 1, status: 1, createdAt: -1 }`
- Compound: `{ status: 1, priority: 1 }`

---

### 8. **Institute Collection** ⭐ NEW

Educational institutes (schools, colleges, universities).

```javascript
{
  _id: ObjectId,
  name: String, // unique, indexed, text index
  location: String, // text index
  type: ['school', 'college', 'university', 'academy', 'institute'], // indexed
  isActive: Boolean, // indexed, default: true
  createdBy: ObjectId, // ref: 'User'
  studentCount: Number, // min: 0, default: 0
  teacherCount: Number, // min: 0, default: 0
  timestamps: true
}
```

**Indexes:**
- `name`: unique, indexed, text index
- `location`: indexed, text index
- `type`: indexed
- `isActive`: indexed
- Text: `{ name: 'text', location: 'text' }` (weights: name: 10, location: 5)

---

### 9. **Banner Collection** ⭐ NEW

App banners for announcements and promotions.

```javascript
{
  _id: ObjectId,
  title: String,
  imageURL: String,
  isActive: Boolean, // default: true
  createdAt: Date
}
```

---

## 🔗 Entity Relationships

```
User
├── institute → Institute
├── referredBy → User (self-reference)
├── attemptedTests → [Test]
└── (student/teacher stats)

Test
├── createdBy → User
├── questions → [Question]
├── allowedUsers → [User]
├── pendingRequests → [User]
└── attemptedBy → [User]

Question
├── createdBy → User
└── tests → [Test]

TestAttempt
├── userId → User
└── testId → Test

MonthlyRankingSnapshot
└── rankings[].userId → User

MonthlyReward
├── userId → User
└── snapshotId → MonthlyRankingSnapshot

Feedback
├── userId → User
└── respondedBy → User

Institute
└── createdBy → User
```

---

## 📈 Database Indexes Summary

### **Performance Indexes**
- User email: unique lookup
- User referral code: unique, sparse
- TestAttempt user/status: query optimization
- MonthlyReward user/year/month: history queries
- Feedback user/createdAt: user history
- Institute text search: name and location

### **Compound Indexes**
- MonthlyRankingSnapshot: `{ year, month, category }` (unique)
- MonthlyReward: `{ userId, year, month }` for user history
- TestAttempt: `{ userId, status }` and `{ testId, userId }`

---

## 🔄 Data Flow

1. **User Registration** → User collection
2. **Test Creation** → Test + Question collections
3. **Test Taking** → TestAttempt collection
4. **Reward Calculation** → User.rewards update
5. **Monthly Processing** → MonthlyRankingSnapshot → MonthlyReward
6. **Feedback Submission** → Feedback collection

---

**Last Updated**: Current implementation status