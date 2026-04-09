# Vercel Server

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Deploy to Render](https://img.shields.io/badge/Deploy%20to-Render-46E3B7?logo=render&logoColor=white)](https://render.com/deploy?repo=https://github.com/Firekid-is-him/Vercel-persistent-server)
[![Maintained by Firekid](https://img.shields.io/badge/Maintained%20by-Firekid-red)](https://github.com/Firekid-is-him)

A persistent bridge that runs on Render and forwards Discord and WhatsApp events to your Vercel-hosted bot logic via HTTP. Deploy the bridge once. Build and ship as many bots as you want on Vercel without ever touching the bridge again.

---

## How It Works

Vercel cannot hold persistent WebSocket connections, which Discord and WhatsApp both require. This project solves that by splitting responsibilities:

```
Discord / WhatsApp
       |
  Render Bridge        (holds the WebSocket, forwards events)
       |
  Vercel Bot           (receives events, runs your logic, responds)
```

The bridge is a single always-on service. Each bot you build lives in its own Vercel project and only needs one environment variable to connect to the bridge.

---

## Features

- Multiple Discord bot tokens supported from a single bridge
- WhatsApp support via Baileys (single session)
- Route management via HTTP — no redeployment needed to add new bots
- Separate admin and bridge secrets for security
- Routes stored in Upstash Redis, live instantly
- Payment webhooks work directly on Vercel without the bridge
- Optional Chromium support for scraping and PDF generation

---

## Quick Deploy

**Step 1 — Deploy the bridge on Render**

Click the button below. Render will detect the `render.yaml` and prompt you for environment variables.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Firekid-is-him/Vercel-persistent-server)

**Step 2 — Deploy your bot on Vercel**

Copy the `vercel-bot-template/` folder into a new repository, import it into Vercel, and set the `BRIDGE_SECRET` environment variable to match the one you set on Render.

**Step 3 — Register a route**

Tell the bridge where to forward events for your server or WhatsApp number.

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
| `DISCORD_TOKENS` | Yes (if using Discord) | Comma-separated bot tokens |
| `BRIDGE_SECRET` | Yes | Shared secret for verifying requests to Vercel bots |
| `ADMIN_SECRET` | Yes | Secret for managing routes via the admin API |
| `UPSTASH_URL` | Yes | Upstash Redis REST URL |
| `UPSTASH_TOKEN` | Yes | Upstash Redis REST Token |
| `WA_ENABLED` | No | Set to `true` to enable WhatsApp |

### Vercel (Bot)

| Variable | Required | Description |
|---|---|---|
| `BRIDGE_SECRET` | Yes | Must match the value set on Render |
| `DISCORD_BOT_TOKEN` | Discord only | Bot token for sending messages and responding to interactions |

---

## Documentation

- [Getting Started](./docs/getting-started.md)
- [Adding Routes](./docs/adding-routes.md)
- [Discord Bot Guide](./docs/discord.md)
- [WhatsApp Bot Guide](./docs/whatsapp.md)
- [Payment Webhooks](./docs/payments.md)
- [Using Chromium on Vercel](./docs/chromium.md)

---

## Project Structure

```
vercel-persistent-server/
├── bridge/
│   ├── index.js            Entry point for the Render bridge
│   └── package.json
├── vercel-bot-template/
│   ├── api/
│   │   └── event.js        Drop-in Vercel endpoint template
│   └── package.json
├── docs/
│   ├── getting-started.md
│   ├── adding-routes.md
│   ├── discord.md
│   ├── whatsapp.md
│   ├── payments.md
│   └── chromium.md
├── render.yaml
└── LICENSE
```

---

## License

[MIT](./LICENSE) — maintained by [Firekid](https://github.com/Firekid-is-him)
