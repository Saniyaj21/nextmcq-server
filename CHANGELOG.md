# Server Changelog

All notable changes to the NextMCQ backend server will be documented in this file.

Format: [#SL] - Brief description of change (1-3 lines)

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
