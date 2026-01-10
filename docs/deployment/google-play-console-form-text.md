# Google Play Console Form Text - Copy & Paste

Use this exact text when filling out the **App access** form in Google Play Console.

---

## Form Fields

### ❓ Does your app restrict access to any content?
**Answer:** ✅ **Yes**

### ❓ How can reviewers access your app?
**Answer:** Choose: **"Provide instructions and/or a test account"**

### 📝 Instructions (Copy this text):

```
Our app uses email-based OTP authentication.

To allow reviewers to access the app, please use the following test account:

Email: playreviewer@testmail.com
OTP: 123456

When you enter the email address above, the OTP will be automatically returned in the API response (visible in network logs) or you can use the fixed OTP code: 123456

No personal email or payment is required to access the app.
```

---

## Alternative Shorter Version

If the form has character limits, use this shorter version:

```
Our app uses email OTP login.

For Google Play review, reviewers can use:
- Email: playreviewer@testmail.com
- OTP: 123456

The OTP code 123456 works with the test email address. No email delivery is required.
```

---

## Important Notes

1. **Change the OTP** if you've customized `REVIEWER_OTP` in your environment variables
2. **Update email** if you've changed `REVIEWER_TEST_EMAIL`
3. **Test first** - Verify the reviewer bypass works before submitting

---

## Quick Test

Before submitting, test that reviewers can access:

1. Send OTP: `POST /api/auth/send-otp` with `{"email": "playreviewer@testmail.com"}`
2. Should return: `{"otp": "123456", "isReviewer": true}`
3. Verify OTP: `POST /api/auth/verify-otp` with `{"otp": "123456"}`
4. Should return: JWT token and user data

