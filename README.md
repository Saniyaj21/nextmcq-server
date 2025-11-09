# NextMCQ Backend Server

A robust Node.js/Express API server powering the NextMCQ gamified learning platform. Built with modern JavaScript, MongoDB, and comprehensive security features.

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### **Installation**

1. **Clone and navigate to server directory**
   ```bash
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp config/env.example .env
   ```

   Configure your `.env` file:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/nextmcq

   # JWT
   JWT_SECRET=your-super-secret-jwt-key-here

   # Email Service (Gmail)
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-specific-password

   # Cloudinary (for image uploads)
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret

   # Server
   PORT=8080
   NODE_ENV=development
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:8080` with hot reloading enabled.

## 🏗️ **Architecture**

### **Core Technologies**
- **Runtime**: Node.js with ES6 modules
- **Framework**: Express.js v5.1.0
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with email/OTP verification
- **File Storage**: Cloudinary for media assets
- **Email**: Nodemailer for OTP delivery

### **Project Structure**
```
server/
├── config/           # Configuration files
│   ├── database.js   # MongoDB connection
│   └── env.example   # Environment template
├── constants/        # Application constants
│   ├── index.js      # General constants
│   └── rewards.js    # Gamification rules
├── controllers/      # Route controllers
│   ├── authController.js
│   ├── userController.js
│   ├── testController.js
│   └── ...
├── middlewares/      # Express middlewares
│   └── auth.js       # JWT authentication
├── models/          # Mongoose schemas
│   ├── User.js      # User model
│   ├── Test.js      # Test model
│   ├── Question.js  # Question model
│   └── TestAttempt.js
├── routes/          # API route definitions
│   ├── auth.js      # Authentication routes
│   ├── user.js      # User management
│   └── ...
├── utils/           # Utility functions
│   └── sendMail.js  # Email utility
├── docs/            # API documentation
└── server.js        # Application entry point
```

## 📡 **API Endpoints**

### **Authentication**
```
POST   /api/auth/send-otp      # Send OTP to email
POST   /api/auth/verify-otp    # Verify OTP and login
POST   /api/auth/logout        # Logout user
```

### **User Management**
```
GET    /api/user/profile       # Get user profile
PUT    /api/user/profile       # Update user profile
GET    /api/user/leaderboard   # Get rankings
```

### **Test Management**
```
GET    /api/test               # Get tests (filtered)
POST   /api/test               # Create test
GET    /api/test/:id           # Get test details
PUT    /api/test/:id           # Update test
DELETE /api/test/:id           # Delete test
POST   /api/test/:id/request-access  # Request private test access
```

### **Question Management**
```
GET    /api/question           # Get questions (filtered)
POST   /api/question           # Create question
GET    /api/question/:id       # Get question details
PUT    /api/question/:id       # Update question
DELETE /api/question/:id       # Delete question
```

### **Test Taking**
```
POST   /api/test-taking/start   # Start test attempt
POST   /api/test-taking/:id/answer  # Submit answer
POST   /api/test-taking/:id/complete  # Complete test
GET    /api/test-taking/history # Get attempt history
```

### **Social Features**
```
GET    /api/ranking/global      # Global leaderboard
GET    /api/ranking/institute   # Institute rankings
POST   /api/user/referral       # Generate referral code
```

## 🎮 **Gamification Engine**

### **Reward System**
The server implements a comprehensive gamification system with:

- **Coins**: Primary currency earned through activities
- **XP**: Experience points for level progression
- **Levels**: Automatic level calculation based on XP
- **Leaderboards**: Real-time ranking calculations

### **Reward Calculation Logic**
```javascript
// Example: Test completion rewards
const calculateTestRewards = (isFirstAttempt, accuracy) => {
  // Base rewards
  const base = isFirstAttempt
    ? { coins: 50, xp: 100 }
    : { coins: 10, xp: 20 };

  // Accuracy bonuses
  const accuracyTier = getAccuracyTier(accuracy);
  const bonus = ACCURACY_BONUSES[accuracyTier];

  return {
    coins: Math.floor(base.coins * bonus.coinMultiplier),
    xp: base.xp + bonus.bonusXP
  };
};
```

## 🗄️ **Database Schema**

### **Key Models**

#### **User Model**
- Authentication (email, OTP, JWT)
- Profile (name, role, institute, subjects)
- Rewards (coins, XP, level)
- Performance stats (tests taken, accuracy)
- Social features (referrals)

#### **Test Model**
- Metadata (title, subject, chapter, description)
- Configuration (timeLimit, isPublic)
- Access control (allowedUsers, pendingRequests)
- Statistics (attemptsCount, rating)

#### **Question Model**
- MCQ structure (question, 4 options, correctAnswer)
- Explanations and test associations
- Creator tracking and timestamps

#### **TestAttempt Model**
- Attempt lifecycle (in_progress → completed)
- Answer tracking with timing
- Score calculation and reward storage

## 🔒 **Security Features**

### **Authentication & Authorization**
- JWT token-based authentication
- Email/OTP verification for account security
- Password hashing with bcryptjs
- Protected routes with middleware validation

### **Data Validation**
- Input sanitization and validation
- MongoDB schema validation
- Business rule enforcement
- Error handling with detailed messages

### **Rate Limiting & Security**
- API rate limiting (planned)
- CORS configuration (planned)
- Input validation middleware
- Secure environment variable handling

## 📊 **Performance & Optimization**

### **Database Optimization**
- Strategic indexing on frequently queried fields
- Aggregation pipelines for complex queries
- Connection pooling and error handling
- Query optimization for leaderboard calculations

### **Caching Strategy** (Planned)
- Redis for session and leaderboard caching
- Response caching for frequently accessed data
- Database query result caching

### **Monitoring & Logging**
- Request logging with Morgan (planned)
- Error tracking and monitoring (planned)
- Performance monitoring (planned)

## 🚀 **Deployment**

### **Development**
```bash
npm run dev  # Starts with nodemon for hot reloading
```

### **Production**
```bash
npm start    # Production server
```

### **Environment Variables**
```env
# Required for production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=production-secret-key
EMAIL_USER=production-email@gmail.com
EMAIL_PASS=production-app-password
CLOUDINARY_CLOUD_NAME=production-cloud
CLOUDINARY_API_KEY=production-key
CLOUDINARY_API_SECRET=production-secret
PORT=8080
NODE_ENV=production
```

## 🧪 **Testing**

### **API Testing**
```bash
# Use tools like Postman, Insomnia, or curl
curl -X POST http://localhost:8080/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### **Database Testing**
- MongoDB Compass for database inspection
- Direct MongoDB queries for data validation
- Aggregation pipeline testing

## 📚 **API Documentation**

### **Response Format**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### **Error Response**
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information"
}
```

## 🤝 **Contributing**

### **Development Guidelines**
1. Follow ES6+ syntax and async/await patterns
2. Use meaningful variable and function names
3. Add JSDoc comments for complex functions
4. Implement proper error handling
5. Write clear commit messages

### **Code Standards**
- ESLint configuration for code quality
- Consistent error handling patterns
- Proper separation of concerns
- Comprehensive input validation

## 📞 **Support**

- **Issues**: GitHub Issues for bug reports
- **API Documentation**: Inline code comments and JSDoc
- **Logs**: Server logs for debugging and monitoring

---

**NextMCQ Server** - Powering gamified education through robust APIs 🖥️⚡