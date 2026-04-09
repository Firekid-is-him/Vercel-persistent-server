# Vercel Server

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Deploy to Render](https://img.shields.io/badge/Deploy%20to-Render-46E3B7?logo=render&logoColor=white)](https://render.com/deploy?repo=https://github.com/Firekid-is-him/Vercel-persistent-server)
[![Maintained by Firekid](https://img.shields.io/badge/Maintained%20by-Firekid-red)](https://github.com/Firekid-is-him)

A persistent bridge that runs on Render and forwards Discord and WhatsApp events to your Vercel-hosted bot logic via HTTP. Deploy the bridge once. Build and ship as many bots as you want on Vercel without ever touching the bridge again.

All configuration is managed through a built-in dashboard and stored in Upstash Redis. The only environment variables you set on Render are your Upstash credentials.

---

## How It Works

Vercel cannot hold persistent WebSocket connections, which Discord and WhatsApp both require. This project solves that by splitting responsibilities:

```
Discord / WhatsApp
       |
  Render Bridge        (holds the WebSocket, forwards events, runs scheduler)
       |
  Vercel Bot           (receives events, runs your logic, responds)
```

The bridge is a single always-on service. Each bot you build lives in its own Vercel project and connects to the same bridge.

---

## Features

- Multiple Discord bot tokens from a single bridge
- WhatsApp support via Baileys (single session)
- WebSocket relay for real-time applications
- Cron job scheduler — trigger Vercel logic on a schedule
- File upload handler — bypasses Vercel's 4.5MB body limit
- Rate limiter — blocks abusive senders before they hit Vercel
- Event logger — full history of all events stored in Redis
- Multi-tenant support — one Vercel deployment, per-server configs
- IP whitelist — restrict which IPs can reach your endpoints
- Health monitor — pings all endpoints every 12 minutes, sends alerts via Discord webhook or WhatsApp
- Built-in dashboard — manage everything visually at your Render URL
- Payment webhooks work directly on Vercel, no bridge needed

---

## Quick Deploy

**Step 1 — Deploy the bridge on Render**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Firekid-is-him/Vercel-persistent-server)

You only need two environment variables: your Upstash REST URL and token. Everything else is configured through the dashboard.

**Step 2 — Run initial setup**

```bash
curl -X POST https://your-bridge.onrender.com/setup \
  -H "x-setup-token: YOUR_UPSTASH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"adminSecret":"your_admin_secret","bridgeSecret":"your_bridge_secret"}'
```

This registers your secrets in Redis and permanently disables the setup endpoint.

**Step 3 — Open the dashboard**

```
https://your-bridge.onrender.com/dashboard
```

Configure Discord tokens, WhatsApp, cron jobs, alerts, and everything else from one place.

**Step 4 — Deploy your bot on Vercel**

Copy `vercel-bot-template/` into a new repo, import it into Vercel, and set `BRIDGE_SECRET` to match the secret you configured in Step 2.

**Step 5 — Register a route**

```bash
curl -X POST https://your-bridge.onrender.com/admin/routes \
  -H "x-admin-secret: your_admin_secret" \
  -H "Content-Type: application/json" \
  -d '{"id":"YOUR_GUILD_ID","url":"https://your-bot.vercel.app/api/event"}'
```

Your bot is live.

---

## Environment Variables

### Render (Bridge)

| Variable | Required | Description |
|---|---|---|
| `UPSTASH_URL` | Yes | Upstash Redis REST URL |
| `UPSTASH_TOKEN` | Yes | Upstash Redis REST Token |

All other configuration — Discord tokens, WhatsApp, secrets, rules, alert destinations — is set through the dashboard and stored in Redis.

### Vercel (Bot)

| Variable | Required | Description |
|---|---|---|
| `BRIDGE_SECRET` | Yes | Must match the bridge secret configured during setup |
| `DISCORD_BOT_TOKEN` | Discord only | Bot token for sending messages and responding to interactions |
| `BRIDGE_URL` | WhatsApp only | Your Render bridge URL for sending WhatsApp replies |

---

## Dashboard

The dashboard is served directly from your Render bridge at `/dashboard`. It is protected by your admin secret and built from a private source repository. The deployed dashboard is compiled, minified, and committed to this repo automatically via GitHub Actions — the source is never exposed publicly.

To self-host or modify the dashboard, fork the private dashboard repository and configure the GitHub Action to push builds to your fork of this repo.

---

## Documentation

- [Getting Started](./docs/getting-started.md)
- [Adding Routes](./docs/adding-routes.md)
- [Discord Bot Guide](./docs/discord.md)
- [WhatsApp Bot Guide](./docs/whatsapp.md)
- [Cron Jobs](./docs/cron.md)
- [WebSocket Relay](./docs/websocket.md)
- [File Uploads](./docs/file-uploads.md)
- [Rate Limiting](./docs/rate-limiting.md)
- [Event Logger](./docs/event-logger.md)
- [Multi-Tenant](./docs/multi-tenant.md)
- [IP Whitelist](./docs/ip-whitelist.md)
- [Health Monitor](./docs/health-monitor.md)
- [Payment Webhooks](./docs/payments.md)
- [Using Chromium on Vercel](./docs/chromium.md)

---

