# API Documentation Overview

This file provides a comprehensive overview of the NextMCQ server API structure and documentation organization.

## 📚 Documentation Structure

### **Version 1 API Documentation**
- **[Endpoints Overview](v1/endpoints.md)**: Complete endpoint reference
- **[Authentication API](v1/authentication.md)**: Authentication and authorization
- **[User Management API](v1/user-management.md)**: User profile and management
- **[MCQ Management API](v1/mcq-management.md)**: Tests and questions management

### **API Schemas**
- **[Request Schemas](schemas/request-schemas.md)**: Request body structures
- **[Response Schemas](schemas/response-schemas.md)**: Response data structures
- **[Error Responses](schemas/error-responses.md)**: Error response formats

### **Testing & Tools**
- **[Postman Collection](postman/)**: Postman collection for API testing
- **[Postman Auth Requests](../../postman-auth-requests.md)**: Authentication testing guide

---

## 🔗 API Base URLs

```
Production: https://nextmcq-server.vercel.app/api
Development: http://localhost:8080/api
```

---

## 🔐 Authentication

### **JWT Token Authentication**
Most endpoints require JWT authentication:
```
Authorization: Bearer <jwt-token>
```

### **API Key Authentication**
Some endpoints (like monthly rewards processing) use API key:
```
X-API-Key: <api-key>
```

---

## 📡 Endpoint Categories

### **Authentication** (`/api/auth`)
- Send OTP
- Verify OTP
- Logout
- Complete onboarding
- Get/Update profile
- Search users

### **User Management** (`/api/user`)
- Public profile
- Search users
- Teacher statistics
- Upload profile image

### **Test Management** (`/api/test`)
- Get all tests
- Get teacher's tests
- Create/Update/Delete test
- Remove question from test

### **Question Management** (`/api/question`)
- Get questions
- Create/Update/Delete question
- Get question by ID

### **Test Taking** (`/api/test-taking`)
- Get test details
- Request access
- Start test
- Submit answer
- Submit test
- Get results
- Get user attempts

### **Ranking & Rewards** (`/api/ranking`)
- Get leaderboard
- Get user rank
- Get monthly reward history
- Process monthly rewards (cron)

### **Feedback** (`/api/feedback`)
- Submit feedback
- Get my feedback

### **Invites & Access** (`/api/invites`)
- Get teacher requests
- Approve/Reject request
- Remove access
- Invite user

### **Rating** (`/api/rating`)
- Rate test
- Get user rating
- Get test rating

### **Institutes** (`/api/institutes`)
- Search institutes
- Get popular institutes
- Get institute by ID
- Get all institutes
- Create institute

### **Banners** (`/api/banner`)
- Get banners
- Create banner (admin)

---

## 📋 Response Format

### **Success Response**
```json
{
  "success": true,
  "data": { ... }
}
```

### **Error Response**
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

---

## 🔢 Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

---

## 📝 Pagination

List endpoints support pagination:
```
GET /api/endpoint?page=1&limit=50
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 500,
      "itemsPerPage": 50
    }
  }
}
```

---

## 🔍 Filtering & Search

Many endpoints support filtering:
- `category`: For leaderboards (global, students, teachers, institute)
- `subject`: For tests and questions
- `search`: Text search query
- `institute`: Institute ID filter
- `status`: Status filter (for attempts, feedback, etc.)

---

## 📚 Additional Resources

- **Complete Endpoint Reference**: [Mobile API Docs](../../../mobile/docs/api/endpoints.md)
- **Server README**: [../../README.md](../../README.md)
- **Database Schema**: [../specs/database-schema.md](../specs/database-schema.md)

---

**Last Updated**: Current implementation status