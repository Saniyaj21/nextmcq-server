# API v1 Endpoints

This file documents all the RESTful API endpoints available in version 1 of the NextMCQ API.

## 📍 Base URL

```
Production: https://nextmcq-server.vercel.app/api
Development: http://localhost:8080/api
```

## 🔐 Authentication

Most endpoints require JWT authentication:
```
Authorization: Bearer <token>
```

Some endpoints use API key authentication:
```
X-API-Key: <api-key>
```

---

## 🏆 Ranking Endpoints

### Get Leaderboard
```
GET /api/ranking/leaderboard
```

**Authentication**: Required (JWT)

**Query Parameters**:
- `category` (optional): `global` | `students` | `teachers` | `institute` (default: `global`)
- `limit` (optional): Number of results per page (default: 50, max: 100)
- `page` (optional): Page number (default: 1)
- `institute` (optional): Institute ID filter
- `level` (optional): Level filter

**Response**: Leaderboard with pagination

---

### Get User Rank
```
GET /api/ranking/user-rank
```

**Authentication**: Required (JWT)

**Query Parameters**:
- `category` (optional): `global` | `students` | `teachers` | `institute` (default: `global`)

**Response**: Current user's rank and score

---

### Process Monthly Rewards ⭐ NEW
```
POST /api/ranking/monthly-rewards
```

**Authentication**: API Key (`X-API-Key` header)

**Purpose**: Process monthly rewards for previous month (cron job endpoint)

**Request Headers**:
```
X-API-Key: <your-api-key>
Content-Type: application/json
```

**Response**: Processing summary with statistics

**See**: [Monthly Rewards Documentation](../../../docs/specs/monthly-rewards-and-badges.md)

---

### Get Monthly Reward History ⭐ NEW
```
GET /api/ranking/monthly-rewards/history
```

**Authentication**: Required (JWT)

**Query Parameters**:
- `limit` (optional): Number of records (default: 20, max: 50)

**Response**: User's monthly reward history

**See**: [Monthly Rewards Documentation](../../../docs/specs/monthly-rewards-and-badges.md)

---

## 📚 Additional Documentation

For detailed API documentation, see:
- [Authentication API](./authentication.md)
- [User Management API](./user-management.md)
- [MCQ Management API](./mcq-management.md)
- [Complete API Reference](../../../mobile/docs/api/endpoints.md)

## 🔄 API Versioning

Current version: **v1**

All endpoints are prefixed with `/api/` and do not include version numbers in the path. Future versions may use `/api/v2/` prefix.

## 📝 Notes

- All timestamps are in ISO 8601 format
- All ObjectIds are MongoDB ObjectId strings
- Pagination uses 1-based page numbers
- Default limit for list endpoints is 50, maximum is 100
- All endpoints return JSON responses
- Error responses follow standard format: `{ success: false, message: "..." }`
- [User Management API](./user-management.md)
- [MCQ Management API](./mcq-management.md)
- [Monthly Rewards System](../../../docs/specs/monthly-rewards-and-badges.md)