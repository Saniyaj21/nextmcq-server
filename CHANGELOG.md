# Server Changelog

All notable changes to the NextMCQ backend server will be documented in this file.

Format: [#SL] - Brief description of change (1-3 lines)

---

## [Unreleased]
### Fixed
- Critical ranking score calculation bug in MongoDB aggregation pipelines (getLeaderboard and getUserRanking methods)
- Fixed double multiplication of accuracy weight causing incorrect ranking scores
- Fixed accuracy rounding inconsistency between method calculation and aggregation pipeline
- Ranking scores now correctly calculate as (Total Tests × 10) + (Accuracy % × 10) with consistent rounding

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
