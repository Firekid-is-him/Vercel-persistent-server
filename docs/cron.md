# Cron Jobs

Cron jobs allow you to trigger your Vercel bot logic on a schedule. The bridge runs the scheduler and sends a POST request to your registered Vercel endpoint at the configured time.

---

## How It Works

You register cron jobs via the dashboard or the admin API. Each job has a cron expression and a target Vercel URL. When the expression fires, the bridge POSTs a payload to that URL.

---

## Registering a Cron Job

Via the admin API:

```bash
curl -X POST https://your-bridge.onrender.com/admin/config \
  -H "x-admin-secret: your_admin_secret" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "cron_jobs",
    "value": [
      {
        "id": "daily-report",
        "expression": "0 9 * * *",
        "url": "https://your-bot.vercel.app/api/event"
      }
    ]
  }'
```

To add multiple jobs, include them all in the array.

---

## Cron Expression Format

```
* * * * *
| | | | |
| | | | day of week (0-7, Sunday is 0 or 7)
| | | month (1-12)
| | day of month (1-31)
| hour (0-23)
minute (0-59)
```

Common examples:

| Expression | Meaning |
|---|---|
| `0 9 * * *` | Every day at 9:00 AM |
| `*/30 * * * *` | Every 30 minutes |
| `0 0 * * 1` | Every Monday at midnight |
| `0 12 1 * *` | First day of every month at noon |

---

## Payload Your Vercel Bot Receives

```json
{
  "source": "cron",
  "jobId": "daily-report"
}
```

Handle it in your Vercel bot:

```js
if (source === "cron") {
  const { jobId } = payload;

  if (jobId === "daily-report") {
    // run your scheduled logic here
  }
}
```

---

## Notes

- Cron jobs are loaded once when the bridge starts. If you add or update jobs via the API, restart the Render service or redeploy for the new schedule to take effect.
- The bridge already runs an internal ping every 12 minutes to keep itself alive on Render's free tier. This is separate from your custom cron jobs.
- Invalid cron expressions are skipped silently at startup. Check Render logs if a job is not firing.
