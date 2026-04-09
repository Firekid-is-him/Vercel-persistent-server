# Getting Started

Vercel Server is a persistent bridge that runs on Render and forwards events from Discord and WhatsApp to your Vercel-hosted bot logic. You deploy the bridge once. Every new bot you build is a separate Vercel project that connects to the same bridge.

All configuration — secrets, tokens, rules, and settings — is managed through the dashboard and stored in Upstash Redis. The only environment variables you set on Render are your Upstash credentials.

---

## Prerequisites

- A [Render](https://render.com) account
- A [Vercel](https://vercel.com) account
- An [Upstash](https://upstash.com) account (free tier is sufficient)

---

## Step 1 — Create an Upstash Redis Database

1. Log in to [Upstash](https://console.upstash.com)
2. Click **Create Database**
3. Choose a name, select a region closest to your Render deployment region, and click **Create**
4. From the database dashboard, copy the **REST URL** and **REST Token**

---

## Step 2 — Deploy the Bridge on Render

1. Go to [Render](https://dashboard.render.com) and click **New > Web Service**
2. Select **Public Git Repository** and paste:

   ```
   https://github.com/Firekid-is-him/Vercel-persistent-server
   ```

3. Render will detect `render.yaml` automatically
4. Set the following environment variables when prompted:

   | Variable | Description |
   |---|---|
   | `UPSTASH_URL` | REST URL from your Upstash database |
   | `UPSTASH_TOKEN` | REST Token from your Upstash database |

5. Click **Deploy** and wait for the service to go live
6. Copy your Render service URL — you will need it in the next step

---

## Step 3 — Initial Setup

Once the bridge is live, you must configure your admin and bridge secrets before anything else works. Send this request once:

```bash
curl -X POST https://your-bridge.onrender.com/setup \
  -H "x-setup-token: YOUR_UPSTASH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"adminSecret":"your_admin_secret","bridgeSecret":"your_bridge_secret"}'
```

- `x-setup-token` must be your raw Upstash token — this is the only time it is used as auth
- `adminSecret` — a strong random string you will use to manage the bridge
- `bridgeSecret` — a strong random string shared with all your Vercel bots

Generate both using `openssl rand -hex 32`. They must be different values. After this call succeeds, the setup endpoint is permanently disabled.

---

## Step 4 — Configure via Dashboard

Visit your dashboard at:

```
https://your-bridge.onrender.com/dashboard
```

From here you can configure Discord tokens, WhatsApp, cron jobs, rate limits, IP whitelist, health monitor alerts, and everything else. All settings save to Redis instantly.

---

## Step 5 — Deploy Your Bot on Vercel

1. Copy the `vercel-bot-template/` folder into a new repository
2. Push it to GitHub and import into Vercel
3. Add the following environment variables in Vercel project settings:

   | Variable | Description |
   |---|---|
   | `BRIDGE_SECRET` | The bridge secret you set in Step 3 |
   | `DISCORD_BOT_TOKEN` | Your Discord bot token (Discord bots only) |
   | `BRIDGE_URL` | Your Render bridge URL (WhatsApp bots only) |

4. Deploy and copy the Vercel URL

---

## Step 6 — Register a Route

Tell the bridge where to forward events for your server or WhatsApp number. See [Adding Routes](./adding-routes.md).

---

## Next Steps

- [Adding Routes](./adding-routes.md)
- [Discord Bot Guide](./discord.md)
- [WhatsApp Bot Guide](./whatsapp.md)
- [Cron Jobs](./cron.md)
- [WebSocket Relay](./websocket.md)
- [File Uploads](./file-uploads.md)
- [Rate Limiting](./rate-limiting.md)
- [Event Logger](./event-logger.md)
- [Multi-Tenant](./multi-tenant.md)
- [IP Whitelist](./ip-whitelist.md)
- [Health Monitor](./health-monitor.md)
- [Payment Webhooks](./payments.md)
- [Using Chromium on Vercel](./chromium.md)
