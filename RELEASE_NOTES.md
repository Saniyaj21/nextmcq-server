# Release Notes - Server

## v1.1.0 - Give Test Module & Profile Images

### Backend Infrastructure
- ✅ Added `TestAttempt` model for tracking test attempts
- ✅ Created `testTakingController.js` with test details and access request functions
- ✅ Added `testTaking.js` routes for test-taking endpoints
- ✅ Integrated test-taking routes in main server

### Access Control System
- ✅ Implemented private test permission checking via `allowedUsers`
- ✅ Added request access functionality for private tests
- ✅ Created pending request tracking system

### Data & API
- ✅ Added profile image support to public profile responses
- ✅ Enhanced `getPublicProfile` with complete user data
- ✅ Improved data validation and error handling

### Bug Fixes
- ✅ Fixed data field mapping issues
- ✅ Enhanced security with proper user validation

---

## Previous Releases
- v1.0.0 - Initial application setup
