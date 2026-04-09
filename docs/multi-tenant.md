# Multi-Tenant Bots

Multi-tenant support allows a single Vercel bot deployment to serve multiple Discord servers with different configurations per server. Instead of deploying a separate Vercel project for each server, you deploy once and store per-server config in Redis. The bridge attaches the relevant config to every event before forwarding it.

---

## How It Works

When the bridge receives a Discord event, it looks up a tenant config for the guild ID in Redis. If one exists, it is attached to the forwarded payload under a `tenant` field. Your Vercel bot reads this field to determine how to behave for that specific server.

---

## Registering a Tenant Config

```bash
curl -X POST https://your-bridge.onrender.com/admin/tenant \
  -H "x-admin-secret: your_admin_secret" \
  -H "Content-Type: application/json" \
  -d '{
    "guildId": "1234567890123456789",
    "config": {
      "prefix": "!",
      "language": "en",
      "plan": "pro",
      "customGreeting": "Welcome to the server."
    }
  }'
```

The `config` object can contain anything you need. There is no fixed schema.

---

## Removing a Tenant Config

```bash
curl -X DELETE https://your-bridge.onrender.com/admin/tenant/1234567890123456789 \
  -H "x-admin-secret: your_admin_secret"
```

---

## Payload Your Vercel Bot Receives

```json
{
  "source": "discord",
  "t": "MESSAGE_CREATE",
  "d": { ... },
  "tenant": {
    "prefix": "!",
    "language": "en",
    "plan": "pro",
    "customGreeting": "Welcome to the server."
  }
}
```

If no tenant config exists for a guild, `tenant` is `null`.

---

## Using Tenant Config in Your Bot

```js
async function handleDiscord(payload, res) {
  const { t: eventType, d: data, tenant } = payload;

  const prefix = tenant?.prefix || "!";
  const content = data?.content || "";

  if (eventType === "MESSAGE_CREATE" && content.startsWith(prefix)) {
    const command = content.slice(prefix.length).trim();

    if (command === "hello") {
      const greeting = tenant?.customGreeting || "Hello.";
      await sendDiscordMessage(data.channel_id, greeting);
    }
  }

  return res.json({ ok: true });
}
```

---

## Notes

- Tenant configs are stored in Redis under the key `tenant:{guildId}`. You can store any JSON-serializable data.
- If you are routing multiple servers to the same Vercel URL, make sure that URL is registered as the route for each guild ID individually. See [Adding Routes](./adding-routes.md).
- Tenant config is read from Redis on every event. Changes take effect immediately without redeploying anything.
