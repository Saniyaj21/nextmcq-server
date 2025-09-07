# Server Changelog

All notable changes to the NextMCQ backend server will be documented in this file.

Format: [#SL] - Brief description of change (1-3 lines)

---

## [Unreleased]

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
