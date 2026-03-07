# Monthly Rewards V2 — Cron Job Setup Guide

This guide explains how to set up automated cron jobs for the V2 monthly rewards system (job queue architecture).

## Overview

V2 uses a two-step approach with batched processing:

1. **`/init`** — Creates reward jobs and snapshots for the previous month (run once on the 1st)
2. **`/process`** — Processes one batch of users per call (run every 1 minute until all jobs complete)

Both endpoints require the `X-API-Key` header.

## Prerequisites

1. Server is deployed and accessible via HTTPS
2. Environment variable `MONTHLY_REWARDS_API_KEY` is set on your server
3. API endpoints are live:
   - `POST /api/ranking/v2/monthly-rewards/init`
   - `POST /api/ranking/v2/monthly-rewards/process`

## Cron Job Setup (cron-job.org)

You need **two** cron jobs:

### Job 1: Initialize (Monthly)

| Setting | Value |
|---------|-------|
| Title | `NextMCQ Monthly Rewards — Init` |
| URL | `https://your-api-domain.com/api/ranking/v2/monthly-rewards/init` |
| Method | POST |
| Header | `X-API-Key: your-monthly-rewards-api-key` |
| Schedule | `5 0 1 * *` (1st of every month at 00:05 UTC) |

### Job 2: Process Batches (Every Minute)

| Setting | Value |
|---------|-------|
| Title | `NextMCQ Monthly Rewards — Process` |
| URL | `https://your-api-domain.com/api/ranking/v2/monthly-rewards/process` |
| Method | POST |
| Header | `X-API-Key: your-monthly-rewards-api-key` |
| Schedule | `* * * * *` (every 1 minute) |

The `/process` endpoint is safe to call continuously — it returns `{ status: 'idle' }` when there are no pending jobs.

## How It Works

1. On the 1st of each month, `/init` creates jobs for `students` and `teachers` categories
2. Each job tracks progress: total users, current batch, processed count
3. `/process` picks up pending jobs, processes 50 users per batch (within 25s time limit)
4. Failed jobs are automatically retried up to 3 times
5. Once all batches complete, the job is marked `completed`

## Testing

### Test Init

```bash
curl -X POST https://your-api-domain.com/api/ranking/v2/monthly-rewards/init \
  -H "X-API-Key: your-monthly-rewards-api-key"
```

### Test Process

```bash
curl -X POST https://your-api-domain.com/api/ranking/v2/monthly-rewards/process \
  -H "X-API-Key: your-monthly-rewards-api-key"
```

### Check Status

```bash
curl "https://your-api-domain.com/api/ranking/v2/monthly-rewards/status?apiKey=your-key"
```

## Monitoring

- Check the admin panel at `/dashboard/monthly-rewards` for job status and reward history
- Server logs are prefixed with `[MonthlyRewards]`
- Failed jobs appear with `status: 'failed'` and include error details
- Jobs stuck in `processing` for >5 minutes are automatically picked up on the next `/process` call

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| 401 Unauthorized | Bad API key | Check `MONTHLY_REWARDS_API_KEY` in `.env` matches header |
| Jobs stuck in `processing` | Server timeout / crash | Will auto-recover after 5 min stale window |
| Jobs in `failed` state | User-level errors | Check `errorLog` on the job; auto-retries up to 3 times |
| No jobs created | Init didn't run | Manually call `/init` or check cron schedule |

## Security

1. Use a strong random API key: `openssl rand -base64 32`
2. HTTPS only
3. The `/process` endpoint is idempotent — duplicate calls are safe
4. Individual reward awarding is idempotent — no double payouts
