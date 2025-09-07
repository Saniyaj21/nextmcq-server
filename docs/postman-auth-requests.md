# NextMCQ Authentication API - Postman Testing

## Base URL
```
http://localhost:8080
```

## 1. Send OTP
**Endpoint:** `POST /api/auth/send-otp`

### Headers
```json
{
  "Content-Type": "application/json"
}
```

### Request Body
```json
{
  "email": "test@example.com"
}
```

### Expected Response (Success)
```json
{
  "success": true,
  "message": "OTP sent successfully to your email",
  "data": {
    "email": "test@example.com",
    "otpExpiry": "2025-01-07T08:10:00.000Z"
  }
}
```

### Expected Response (Error - Invalid Email)
```json
{
  "success": false,
  "message": "Please provide a valid email address"
}
```

### Expected Response (Error - Email Required)
```json
{
  "success": false,
  "message": "Email is required"
}
```

---

## 2. Verify OTP
**Endpoint:** `POST /api/auth/verify-otp`

### Headers
```json
{
  "Content-Type": "application/json"
}
```

### Request Body
```json
{
  "otp": "123456"
}
```

**Note:** Only OTP is required. The system finds the user by the OTP code itself.

### Expected Response (Success - New User)
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "6772a1234567890abcdef123",
      "email": "test@example.com"
    },
    "isNewUser": true
  }
}
```

### Expected Response (Success - Existing User)
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "6772a1234567890abcdef123",
      "email": "test@example.com"
    },
    "isNewUser": false
  }
}
```

### Expected Response (Error - Invalid OTP)
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

### Expected Response (Error - OTP Required)
```json
{
  "success": false,
  "message": "OTP is required"
}
```

---

## Testing Flow

### Step 1: Send OTP
1. Make a POST request to `/api/auth/send-otp`
2. Use any valid email address
3. Check your console/logs for the generated OTP (since email might not be configured yet)

### Step 2: Verify OTP
1. Use only the OTP from your console/logs (no email required)
2. Save the JWT token from the response for future requests
3. Note the `isNewUser` flag to determine next steps

---

## Postman Collection Setup

### Environment Variables
Create a Postman environment with these variables:
```
base_url: http://localhost:8080
email: test@example.com
otp: (update this from console)
jwt_token: (update this from verify response)
```

### Pre-request Scripts
For dynamic email testing, you can use this pre-request script:
```javascript
// Generate random email for testing
const timestamp = Date.now();
pm.environment.set("email", `test${timestamp}@example.com`);
```

---

## Available Endpoints

1. **POST** `/api/auth/send-otp` - Send OTP to email
2. **POST** `/api/auth/verify-otp` - Verify OTP and get JWT token

## Common Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Email is required"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to send OTP email. Please try again."
}
```

---

## Notes for Testing

1. **Email Configuration**: Make sure to set up your SMTP credentials in `.env` file for actual email sending
2. **OTP Expiry**: OTPs expire in 10 minutes
3. **JWT Token**: Save the token for testing protected routes later (also stored in user document)
4. **Console Logs**: Check server console for OTP values during development
5. **Database**: User records are created/updated in MongoDB
6. **Simplified Flow**: Only 2 endpoints needed - send OTP and verify OTP
7. **OTP-based Lookup**: Verify endpoint finds user by OTP, no email needed

## Sample .env Configuration for Testing
```env
NODE_ENV=development
PORT=8080
MONGODB_URI=mongodb://localhost:27017/nextmcq
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
SMPT_HOST=smtp.gmail.com
SMPT_PORT=587
SMPT_SERVICE=gmail
SMPT_MAIL=your-gmail@gmail.com
SMPT_PASSWORD=your-app-password
```
