# Server Changelog

All notable changes to the NextMCQ backend server will be documented in this file.

Format: [#SL] - Brief description of change (1-3 lines)

---

## [Unreleased]
### Added
- API endpoint `/api/test-taking/request-access/:testId` for students to request access to private tests
- Test time limit validation in createTest and updateTest endpoints (1-60 minutes range)
- API endpoint `/api/invites/teacher-requests` for retrieving pending requests and allowed users for teacher's private tests
- API endpoint `/api/invites/approve` for approving pending access requests
- API endpoint `/api/invites/reject` for rejecting pending access requests
- API endpoint `/api/invites/remove-access` for removing allowed users from private tests
- API endpoint `/api/invites/invite-user` for directly inviting users by email to private tests
- Invite controller with comprehensive access management for private tests
- Invite routes with authentication middleware for secure access
- Support for managing allowedUsers and pendingRequests arrays in Test model
- API endpoint `/api/user/teacher-stats` for retrieving comprehensive teacher statistics
- Teacher statistics controller `getTeacherStats` with aggregated data from tests, questions, and attempts
- Teacher stats include: overview (tests, questions, attempts, students, avg score), recent activity (last 30 days), most popular test, recent attempts, and activity chart (last 7 days)
Rahul
- Teacher rewards for test creation (50 coins + 75 XP awarded when teachers create tests)
- Student streak system: Students maintain streaks by submitting at least 1 test daily (fixed first-time user streak initialization)
- Debug logging for student streak system ([STREAK_DEBUG] and [STREAK_CALC] prefixes)

### Removed
- Test completion bonus from reward system (10 coins + 15 XP no longer awarded for completing tests)
- Streak milestone bonuses (1,000-5,000 coins + 500-2,000 XP for 50/100/200 day streaks)
- Daily activity rewards (5 coins + 10 XP for login, 15 coins + 20 XP for first test of day)

### Fixed
- Critical ranking score calculation bug in MongoDB aggregation pipelines (getLeaderboard and getUserRanking methods)
- Fixed double multiplication of accuracy weight causing incorrect ranking scores
- Fixed accuracy rounding inconsistency between method calculation and aggregation pipeline
- Ranking scores now correctly calculate as (Total Tests × 10) + (Accuracy % × 10) with consistent rounding
- Login response now includes complete user data (role, rewards, profile info) with proper null-safe defaults for new users
- Frontend login handler updated to use complete server response instead of hardcoded minimal user data

### Changed
- Maximum test time limit reduced from 180 minutes (3 hours) to 60 minutes (1 hour)
- Test model now enforces timeLimit constraints: minimum 1 minute, maximum 60 minutes, must be whole numbers
- Removed access restrictions from getAllTests endpoint - all authenticated users can now view all tests regardless of visibility settings (isPublic, allowedUsers, createdBy)
- Student ranking score formula adjusted to favor consistency: (Total Tests × 20) + (Accuracy % × 5)
- Reduced accuracy weight from 10 to 5, increased test weight from 10 to 20 to prevent new users with perfect scores from beating experienced users

### Refactored
- Implemented single source of truth for ranking score calculation
- Centralized ranking score logic in `calculateRankingScore()` function in rewards.js
- Created `getRankingScoreAggregation()` helper for MongoDB aggregation pipelines
- Updated User model methods to use centralized calculation functions
- Eliminated code duplication and potential inconsistencies in ranking calculations

### Added
- Complete ranking system with comprehensive API endpoints (/api/ranking/leaderboard, /api/ranking/user-rank, /api/ranking/stats)
- Ranking controller (server/controllers/rankingController.js) with leaderboard aggregation and user rank calculation
- Ranking routes (server/routes/ranking.js) with public and protected endpoints
- Enhanced User model methods for ranking calculation (calculateRankingScore, getLeaderboard, getUserRanking)
- Platform statistics API for global performance metrics and user counts
- Pagination support for leaderboards with configurable limits and categories
- Ranking score formula based on tests completed and accuracy percentage
- User rank tracking with nearby users functionality for competitive engagement
- Category-based leaderboards (global, students, teachers) with proper filtering
- Authentication middleware (server/middlewares/auth.js) for centralized JWT verification
- Role-based authorization middleware for protecting routes by user role
- GET /api/auth/profile endpoint for retrieving complete user profile data
- Logout endpoint (POST /api/auth/logout) for token invalidation and session management
- Server-side token verification and user token clearing in logout process

### Changed
- Refactored auth controllers to use authentication middleware (removed duplicate JWT verification code)
- Enhanced authentication flow with proper logout functionality
- Applied authentication and role-based authorization to protected routes
- Banner and test creation now require teacher role authorization

### Improved
- Code maintainability by centralizing authentication logic
- Security by adding role-based access control
- Error handling consistency across protected endpoints
- Performance optimization for ranking calculations using MongoDB aggregation pipelines

## [#4] - Complete Authentication System Implementation
- **BREAKING**: Implemented email-based OTP authentication system with JWT tokens
- Added comprehensive email service using Nodemailer with customizable SMTP configuration
- Created streamlined 2-endpoint auth flow: send-otp and verify-otp (removed resend-otp)
- Enhanced User model with authentication fields (otp, otpExpiry, token, isEmailVerified, lastLoginAt)
- **BREAKING**: Modified User model to make only email required (name is now optional with default empty string)
- Implemented atomic database operations to prevent parallel save conflicts
- Added JWT token storage in user documents for session management
- Created utils/sendMail.js for email functionality with proper error handling
- Updated API to find users by OTP code instead of email for verification
- Added comprehensive Postman documentation with request/response examples
- Configured environment variables for JWT secrets and email SMTP settings

---

## [#3] - Basic User Model and Database Setup
- Created basic User model with essential fields (name, email, role, institute, subjects)
- Set up database connection with MongoDB
- Added user roles (student, teacher) and basic validation
- Integrated User model with server and added test endpoint

## [#2] - Documentation Structure Created
- Added comprehensive documentation structure in server/docs/
- Created .cursor/rules for automated documentation maintenance
- Set up API documentation templates and schemas

## [#1] - Initial Server Setup
- Created Express.js server with basic "Hello World" endpoint
- Configured package.json with start and dev scripts
- Set up Vercel deployment configuration
