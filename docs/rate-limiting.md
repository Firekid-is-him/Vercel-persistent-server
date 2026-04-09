# Rate Limiting

The bridge can block users or identifiers that send too many requests within a given time window before they ever reach your Vercel endpoint. This protects your Vercel function execution quota and prevents abuse.

---

## How It Works

Request counts are tracked in Upstash Redis per identifier. For WhatsApp, the identifier is the sender's JID. For WebSocket connections, it is the route ID. When a sender exceeds the configured limit within the time window, their messages are dropped silently at the bridge level.

---

## Configuration

Configure rate limiting via the dashboard or the admin API:

```bash
curl -X POST https://your-bridge.onrender.com/admin/config \
  -H "x-admin-secret: your_admin_secret" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "rate_limit",
    "value": {
      "max": 10,
      "windowSeconds": 60
    }
  }'
```

This example allows a maximum of 10 messages per 60 seconds per identifier.

---

## Configuration Fields

| Field | Type | Description |
|---|---|---|
| `max` | number | Maximum number of requests allowed in the window |
| `windowSeconds` | number | Length of the time window in seconds |

---

## Disabling Rate Limiting

To disable rate limiting, delete the config key:

```bash
curl -X POST https://your-bridge.onrender.com/admin/config \
  -H "x-admin-secret: your_admin_secret" \
  -H "Content-Type: application/json" \
  -d '{"key":"rate_limit","value":null}'
```

Or simply leave it unconfigured. If no rate limit config exists in Redis, all requests pass through.

---

## Notes

- Rate limiting currently applies to WhatsApp messages and WebSocket connections. Discord events are not rate limited at the bridge level as Discord handles its own rate limiting upstream.
- Blocked messages are dropped without notifying the sender. If you want to notify users they are being rate limited, implement that logic in your Vercel bot before the limit is reached.
- Rate limit counters reset automatically after the window expires. They are stored as Redis keys with a TTL.
