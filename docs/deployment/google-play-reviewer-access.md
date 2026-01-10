# Google Play Console Reviewer Access Setup

This guide explains how to configure the app for Google Play Console reviewers to access the app without being blocked by OTP authentication.

## Overview

The app uses email-based OTP authentication. To allow Google Play reviewers to test the app, we've implemented a reviewer bypass system that:

1. **Automatically detects reviewer emails** (based on configured domains)
2. **Uses a fixed OTP** (configurable via environment variable)
3. **Returns OTP in API response** (instead of sending email) for reviewer emails
4. **Allows reviewers to log in** using the fixed OTP code

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Enable reviewer bypass (default: enabled)
REVIEWER_BYPASS_ENABLED=true

# Fixed OTP for reviewers (default: 123456)
REVIEWER_OTP=123456

# Test account email for reviewers
REVIEWER_TEST_EMAIL=playreviewer@testmail.com
```

### Default Configuration

If environment variables are not set, the system uses these defaults:
- **Reviewer OTP**: `123456`
- **Test Email**: `playreviewer@testmail.com`
- **Bypass Enabled**: `true`

## How It Works

### For Reviewer Test Email

1. **Send OTP Request**: Reviewer enters test email (`playreviewer@testmail.com`)
2. **OTP Generation**: System generates fixed OTP (`123456` by default)
3. **Response**: API returns OTP in response body (no email sent)
4. **Login**: Reviewer uses the fixed OTP to log in

### For Regular Users

1. **Send OTP Request**: User enters email
2. **OTP Generation**: System generates random 6-digit OTP
3. **Email Sent**: OTP sent via email
4. **Login**: User uses OTP from email to log in

## Google Play Console Form Instructions

When filling out the **App access** form in Google Play Console, use this text:

### Option 1: Test Account (Recommended)

**Question: Does your app restrict access to any content?**
- ✅ **Yes**

**Question: How can reviewers access your app?**
- Choose: **Provide instructions and/or a test account**

**Instructions to paste:**

```
Our app uses email-based OTP authentication.

To allow reviewers to access the app, please use the following test account:

Email: playreviewer@testmail.com
OTP: 123456

When you enter the email address above, the OTP will be automatically returned in the API response (visible in network logs) or you can use the fixed OTP code: 123456

No personal email or payment is required to access the app.
```

### Option 2: Simplified Instructions

If you prefer shorter instructions:

```
Our app uses email OTP login.

For Google Play review, reviewers can use:
- Email: playreviewer@testmail.com
- OTP: 123456

The OTP code 123456 works with the test email address. No email delivery is required.
```

## Testing Reviewer Access

### Test the Reviewer Bypass Locally

1. **Start the server** with reviewer bypass enabled
2. **Send OTP request**:
   ```bash
   curl -X POST http://localhost:8080/api/auth/send-otp \
     -H "Content-Type: application/json" \
     -d '{"email": "playreviewer@testmail.com"}'
   ```
3. **Check response** - Should include `otp: "123456"` in the response
4. **Verify OTP**:
   ```bash
   curl -X POST http://localhost:8080/api/auth/verify-otp \
     -H "Content-Type: application/json" \
     -d '{"otp": "123456"}'
   ```

### Expected Response for Reviewer Email

```json
{
  "success": true,
  "message": "OTP generated successfully for reviewer access",
  "data": {
    "email": "playreviewer@testmail.com",
    "otp": "123456",
    "otpExpiry": "2025-01-07T10:10:00.000Z",
    "isReviewer": true
  }
}
```

## Security Considerations

### Production Safety

1. **Reviewer bypass is safe** - It only works for specific email domains
2. **Fixed OTP is configurable** - Change `REVIEWER_OTP` to a custom value
3. **Can be disabled** - Set `REVIEWER_BYPASS_ENABLED=false` to disable
4. **No impact on regular users** - Regular users still receive OTP via email

### Best Practices

1. **Use a custom OTP** - Don't use the default `123456` in production
2. **Limit reviewer domains** - Only add domains you trust
3. **Monitor reviewer access** - Check logs for reviewer login attempts
4. **Test before submission** - Verify reviewer bypass works before submitting to Play Store

## Troubleshooting

### Reviewer Can't Log In

1. **Check environment variables** - Ensure `REVIEWER_BYPASS_ENABLED=true`
2. **Verify test email** - Must use exact test email from `REVIEWER_TEST_EMAIL`
3. **Check OTP code** - Ensure using the correct fixed OTP from `REVIEWER_OTP`
4. **Check server logs** - Look for `[REVIEWER ACCESS]` log messages

### OTP Not Returned in Response

1. **Check test email** - Email must exactly match `REVIEWER_TEST_EMAIL`
2. **Verify bypass enabled** - Check `REVIEWER_BYPASS_ENABLED` environment variable
3. **Check server logs** - Look for reviewer detection logs

## API Endpoints

### Send OTP (Reviewer)
```http
POST /api/auth/send-otp
Content-Type: application/json

{
  "email": "playreviewer@testmail.com"
}
```

**Response (Reviewer):**
```json
{
  "success": true,
  "message": "OTP generated successfully for reviewer access",
  "data": {
    "email": "playreviewer@testmail.com",
    "otp": "123456",
    "otpExpiry": "2025-01-07T10:10:00.000Z",
    "isReviewer": true
  }
}
```

### Verify OTP (Reviewer)
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... },
    "isNewUser": false
  }
}
```

## Additional Notes

- **Reviewer accounts are created automatically** if they don't exist
- **Reviewer accounts have default profile** (name: "Play Store Reviewer", role: "student")
- **Reviewer OTP expires in 10 minutes** (same as regular OTP)
- **Multiple reviewers can use the same OTP** (as long as it's not expired)

