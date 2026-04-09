# Event Logger

The bridge logs every event that passes through it to Upstash Redis. This gives you a history of all activity across all your bots without touching each individual Vercel project.

---

## What Gets Logged

Every forwarded event is stored with:

- The event source (discord, whatsapp, cron, websocket)
- The route ID the event was forwarded to
- The full event payload
- A Unix timestamp

The log stores the 1000 most recent events. Older entries are automatically removed as new ones come in.

---

## Viewing Logs

Via the dashboard — the event log is visible directly in the dashboard UI.

Via the admin API:

```bash
curl https://your-bridge.onrender.com/admin/logs \
  -H "x-admin-secret: your_admin_secret"
```

Response:

```json
[
  {
    "source": "discord",
    "routeId": "1234567890123456789",
    "timestamp": 1700000000000,
    "payload": {
      "t": "MESSAGE_CREATE",
      "d": { ... }
    }
  },
  {
    "source": "whatsapp",
    "routeId": "wa:*",
    "timestamp": 1700000001000,
    "payload": {
      "message": { ... }
    }
  }
]
```

The response always returns the 100 most recent log entries.

---

## Notes

- Logs are stored in Redis as a capped list. The bridge keeps a maximum of 1000 entries. This is not configurable without modifying the bridge source.
- Log entries include full event payloads. Depending on the events passing through, this may include message content and user identifiers. Do not expose the logs endpoint publicly.
- The logger runs on every forwarded event automatically. There is nothing to enable or configure.
