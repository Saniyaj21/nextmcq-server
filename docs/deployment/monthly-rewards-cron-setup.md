# Monthly Rewards Cron Job Setup Guide

This guide explains how to set up an automated cron job to process monthly ranking rewards.

## 📋 Prerequisites

1. Your server is deployed and accessible via HTTPS
2. API endpoint is live: `POST /api/ranking/monthly-rewards`
3. Environment variable `MONTHLY_REWARDS_API_KEY` is set on your server

## 🔧 Option 1: Using cron-job.org (Recommended)

### Step 1: Create Account

1. Go to [cron-job.org](https://cron-job.org)
2. Click **"Sign Up"** or **"Create Account"**
3. Verify your email address

### Step 2: Create New Cron Job

1. **Login** to your cron-job.org account
2. Click **"Create cronjob"** or **"New Cronjob"** button
3. Fill in the following details:

#### Basic Settings:
- **Title**: `NextMCQ Monthly Rewards`
- **Address (URL)**: `https://your-api-domain.com/api/ranking/monthly-rewards`
  - Replace `your-api-domain.com` with your actual server URL
  - Example: `https://nextmcq-server.vercel.app/api/ranking/monthly-rewards`

#### Request Settings:
- **Request method**: Select **POST**
- **Request headers**: Click **"Add Header"** and add:
  - **Header name**: `X-API-Key`
  - **Header value**: `your-monthly-rewards-api-key` (use your actual API key from `.env`)

#### Schedule Settings:
- **Schedule type**: Select **"Once per month"** or **"Advanced (cron)"**
  
  **Option A - Once per month:**
  - Select: **"Every month"**
  - Day: **"1st"** (First day of month)
  - Time: **"00:05"** (5 minutes after midnight)
  
  **Option B - Advanced cron expression:**
  ```
  5 0 1 * *
  ```
  - Meaning: At 00:05 (5 minutes past midnight) on day 1 of every month
  - Format: `minute hour day month weekday`

#### Notification Settings (Optional):
- Enable **"Notification on failure"** to receive email alerts
- Enter your email address

### Step 3: Save and Activate

1. Click **"Create cronjob"** or **"Save"**
2. Ensure the cron job is **"Active"** (toggle should be ON)
3. Note your cron job ID for reference

### Step 4: Test the Cron Job

1. Click on your cron job
2. Click **"Execute now"** or **"Run now"** button
3. Check the **"Execution Log"** tab to see the result
4. Verify on your server that rewards were processed

---

## 🔧 Option 2: Using Vercel Cron Jobs (If Deployed on Vercel)

If your server is deployed on Vercel, you can use Vercel's built-in cron jobs.

### Step 1: Create `vercel.json`

Create or update `server/vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/ranking/monthly-rewards",
      "schedule": "5 0 1 * *"
    }
  ]
}
```

### Step 2: Update Controller to Accept Vercel Cron

The endpoint needs to accept Vercel's authorization header:

```javascript
// In monthlyRewardsController.js, update the API key check:
const apiKey = req.headers['x-api-key'] || 
               req.headers['authorization']?.replace('Bearer ', '') ||
               req.query.apiKey;
```

### Step 3: Deploy

Push to your repository and Vercel will automatically set up the cron job.

---

## 🔧 Option 3: Using Server Cron (Self-Hosted)

If you're running your own server (VPS, EC2, etc.), you can use system cron.

### Step 1: Create a Script

Create `server/scripts/monthly-rewards-cron.sh`:

```bash
#!/bin/bash

# Configuration
API_URL="https://your-api-domain.com/api/ranking/monthly-rewards"
API_KEY="your-monthly-rewards-api-key"

# Make request
curl -X POST "$API_URL" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  >> /var/log/monthly-rewards.log 2>&1

echo "Executed at $(date)" >> /var/log/monthly-rewards.log
```

### Step 2: Make Script Executable

```bash
chmod +x server/scripts/monthly-rewards-cron.sh
```

### Step 3: Add to Crontab

```bash
# Open crontab editor
crontab -e

# Add this line (runs at 00:05 on 1st of every month)
5 0 1 * * /path/to/your/server/scripts/monthly-rewards-cron.sh
```

---

## 🧪 Testing Your Setup

### Manual Test (Before Setting Up Cron)

Test the endpoint manually to ensure it works:

```bash
curl -X POST https://your-api-domain.com/api/ranking/monthly-rewards \
  -H "X-API-Key: your-monthly-rewards-api-key" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "message": "Monthly rewards processed for X/YYYY",
  "data": {
    "month": 1,
    "year": 2024,
    "categories": { ... },
    "totalRewardsAwarded": 200,
    "totalCoinsAwarded": 70000
  }
}
```

Or if already processed:
```json
{
  "success": true,
  "message": "Monthly rewards already processed",
  "data": {
    "month": 1,
    "year": 2024,
    "status": "already_processed"
  }
}
```

### Test with Postman

1. **Method**: POST
2. **URL**: `https://your-api-domain.com/api/ranking/monthly-rewards`
3. **Headers**:
   - `X-API-Key`: `your-monthly-rewards-api-key`
   - `Content-Type`: `application/json`
4. **Body**: (leave empty)
5. Click **Send**

---

## 📝 Configuration Checklist

Before going live, verify:

- [ ] Server is deployed and accessible
- [ ] `MONTHLY_REWARDS_API_KEY` is set in production environment
- [ ] API endpoint is accessible: `POST /api/ranking/monthly-rewards`
- [ ] Manual test returns success
- [ ] Cron job is scheduled correctly (1st of month, 00:05)
- [ ] Cron job is active/enabled
- [ ] Email notifications are set up (optional but recommended)

---

## 🔍 Monitoring & Debugging

### Check Execution Logs

**cron-job.org:**
1. Login to your account
2. Go to your cron job
3. Click **"Execution Log"** tab
4. Review recent executions

**Vercel:**
1. Go to Vercel Dashboard
2. Navigate to your project
3. Click **"Functions"** → **"Cron Jobs"**
4. View execution history

**Server Logs:**
Check your server logs for:
- `[MonthlyRewards] Processing rewards for X/YYYY`
- `[MonthlyRewards] Awarded ... to user ...`
- Any error messages

### Common Issues

**Issue: 401 Unauthorized**
- Check API key is correct in cron job settings
- Verify `MONTHLY_REWARDS_API_KEY` matches in server `.env`

**Issue: 500 Internal Server Error**
- Check server logs for detailed error
- Verify database connection
- Ensure models are properly imported

**Issue: Cron job not executing**
- Verify cron job is active/enabled
- Check timezone settings (should be UTC)
- Review execution logs for errors

---

## 🎯 Recommended Schedule

**Best Practice:** Schedule for **00:05 AM UTC** on the **1st of each month**

**Why 5 minutes after midnight?**
- Allows for any timezone adjustments
- Avoids potential conflicts with other midnight jobs
- Gives time for month-end data to settle

**Alternative Times:**
- `00:00 1 * *` - Exactly midnight (risky)
- `01:00 1 * *` - 1 AM (safer, less traffic)

---

## 🔒 Security Best Practices

1. **Strong API Key**: Use a long, random string for `MONTHLY_REWARDS_API_KEY`
   ```bash
   # Generate secure key
   openssl rand -base64 32
   ```

2. **HTTPS Only**: Ensure your API is accessible via HTTPS only

3. **Rate Limiting**: Consider adding rate limiting to prevent abuse
   - Only allow cron job IPs (if using cron-job.org)
   - Limit requests per hour

4. **Monitoring**: Set up alerts for:
   - Failed executions
   - Unusual activity
   - Missing executions

---

## 📊 Example cron-job.org Configuration

```
Title: NextMCQ Monthly Rewards
URL: https://nextmcq-server.vercel.app/api/ranking/monthly-rewards
Method: POST
Headers:
  X-API-Key: your-secret-api-key-here
Schedule: 5 0 1 * * (Every 1st at 00:05)
Active: ✅ Yes
Notifications: ✅ Enabled
```

---

## 🆘 Support

If you encounter issues:

1. Check server logs first
2. Test endpoint manually with curl/Postman
3. Verify environment variables are set
4. Check cron job execution logs
5. Review this guide for common issues

---

**Last Updated:** January 2024

