# Health Monitor

The bridge pings all registered Vercel endpoints every 12 minutes. This serves two purposes: it keeps the Render free tier service alive (which spins down after 15 minutes of inactivity), and it alerts you when a bot endpoint goes down.

---

## How It Works

Every 12 minutes, the bridge sends a GET request to each registered route URL. If the response is not a 2xx status code, or if the request fails entirely, an alert is sent to your configured destination.

---

## Configuring Alerts

Configure where alerts are sent via the dashboard or the admin API:

**Discord webhook:**

```bash
curl -X POST https://your-bridge.onrender.com/admin/config \
  -H "x-admin-secret: your_admin_secret" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "alert_config",
    "value": {
      "type": "discord",
      "destination": "https://discord.com/api/webhooks/your_webhook_url"
    }
  }'
```

**WhatsApp:**

```bash
curl -X POST https://your-bridge.onrender.com/admin/config \
  -H "x-admin-secret: your_admin_secret" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "alert_config",
    "value": {
      "type": "whatsapp",
      "destination": "2348012345678@s.whatsapp.net"
    }
  }'
```

For WhatsApp alerts, `WA_ENABLED` must be set to `true` in Redis and a WhatsApp session must be active on the bridge.

---

## Alert Message Format

When a health check fails, the alert message will be:

```
Health check failed for route 1234567890123456789 — status 500
```

or

```
Health check failed for route 1234567890123456789 — fetch failed
```

---

## Disabling Alerts

To stop receiving alerts without disabling health checks, delete the alert config:

```bash
curl -X POST https://your-bridge.onrender.com/admin/config \
  -H "x-admin-secret: your_admin_secret" \
  -H "Content-Type: application/json" \
  -d '{"key":"alert_config","value":null}'
```

Health checks will continue running every 12 minutes to keep the bridge alive, but no alerts will be sent on failure.

---

## Notes

- Health checks run regardless of whether alert config is set. The 12 minute interval is fixed and cannot be changed without modifying the bridge source, as it is tied to Render's 15 minute spin-down window.
- Health checks send a GET request. Your Vercel bot endpoint handles POST requests for events. If your endpoint rejects GET requests, the health check will always report a failure. Either add a GET handler that returns 200, or accept that health check alerts will fire even when the bot is working correctly.
- The bridge also pings its own `/health` endpoint every 12 minutes as part of the same cycle.
