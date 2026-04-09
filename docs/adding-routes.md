# Adding Routes

Routes tell the bridge where to forward incoming events. Each route maps an identifier (a Discord guild ID or a WhatsApp JID) to a Vercel endpoint URL.

Routes are stored in Upstash Redis and take effect immediately. No redeployment of the bridge is required.

---

## Route Identifiers

| Source | Identifier Format | Example |
|---|---|---|
| Discord | Guild ID (server ID) | `1234567890123456789` |
| WhatsApp (specific chat) | `wa:` prefix + JID | `wa:2348012345678@s.whatsapp.net` |
| WhatsApp (catch-all) | `wa:*` | `wa:*` |

A Discord guild ID can be found by enabling Developer Mode in Discord settings, then right-clicking any server and selecting **Copy Server ID**.

A WhatsApp JID is the phone number in international format followed by `@s.whatsapp.net`. For group chats, it ends in `@g.us`.

---

## Adding a Route

Send a POST request to your bridge's admin endpoint:

```
POST https://your-bridge.onrender.com/admin/routes
x-admin-secret: your_admin_secret
Content-Type: application/json

{
  "id": "1234567890123456789",
  "url": "https://your-bot.vercel.app/api/event"
}
```

On success, the response will be:

```json
{
  "ok": true,
  "id": "1234567890123456789",
  "url": "https://your-bot.vercel.app/api/event"
}
```

---

## Listing All Routes

```
GET https://your-bridge.onrender.com/admin/routes
x-admin-secret: your_admin_secret
```

Response:

```json
{
  "1234567890123456789": "https://your-bot.vercel.app/api/event",
  "wa:*": "https://your-wa-bot.vercel.app/api/event"
}
```

---

## Removing a Route

```
DELETE https://your-bridge.onrender.com/admin/routes/1234567890123456789
x-admin-secret: your_admin_secret
```

Response:

```json
{
  "ok": true,
  "deleted": "1234567890123456789"
}
```

---

## Using curl

If you prefer the terminal:

```bash
curl -X POST https://your-bridge.onrender.com/admin/routes \
  -H "x-admin-secret: your_admin_secret" \
  -H "Content-Type: application/json" \
  -d '{"id":"1234567890123456789","url":"https://your-bot.vercel.app/api/event"}'
```

---

## Notes

- The `ADMIN_SECRET` header is required for all `/admin/` routes. Requests without it will receive a `401 Unauthorized` response.
- `BRIDGE_SECRET` and `ADMIN_SECRET` are different values. `BRIDGE_SECRET` is shared with Vercel bots. `ADMIN_SECRET` is yours alone.
- You can register as many routes as needed. There is no limit imposed by the bridge.
