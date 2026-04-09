# Getting Started

Vercel Server is a persistent bridge that runs on Render and forwards events from Discord and WhatsApp to your Vercel-hosted bot logic. You deploy the bridge once and never touch it again. Every new bot you build is a separate Vercel project.

---

## Prerequisites

Before deploying, make sure you have the following:

- A [Render](https://render.com) account
- A [Vercel](https://vercel.com) account
- An [Upstash](https://upstash.com) account (free tier is sufficient)
- A Discord bot token (if using Discord)
- Node.js 18 or later (for local development only)

---

## Step 1 — Create an Upstash Redis Database

1. Log in to [Upstash](https://console.upstash.com)
2. Click **Create Database**
3. Choose a name, select a region closest to your Render region, and click **Create**
4. From the database dashboard, copy the **REST URL** and **REST Token** — you will need these in the next step

---

## Step 2 — Deploy the Bridge on Render

1. Go to [Render](https://dashboard.render.com) and click **New > Web Service**
2. Select **Public Git Repository** and paste the following URL:

   ```
   https://github.com/Firekid-is-him/Vercel-persistent-server
   ```

3. Render will detect the `render.yaml` file automatically and configure the service
4. Fill in the required environment variables when prompted:

   | Variable | Description |
   |---|---|
   | `DISCORD_TOKENS` | Comma-separated list of Discord bot tokens |
   | `BRIDGE_SECRET` | A strong random string shared with your Vercel bots |
   | `ADMIN_SECRET` | A separate strong random string for managing routes |
   | `UPSTASH_URL` | REST URL from your Upstash database |
   | `UPSTASH_TOKEN` | REST Token from your Upstash database |
   | `WA_ENABLED` | Set to `true` to enable WhatsApp, leave as `false` otherwise |

5. Click **Deploy**. Once the deploy finishes, copy your Render service URL — you will need it when registering routes

> Generate `BRIDGE_SECRET` and `ADMIN_SECRET` using a password manager or by running `openssl rand -hex 32` in your terminal. They must be different values.

---

## Step 3 — Deploy Your Bot on Vercel

1. Copy the contents of the `vercel-bot-template/` folder into a new project
2. Push it to a GitHub repository
3. Import the repository into Vercel
4. Add the following environment variables in the Vercel project settings:

   | Variable | Description |
   |---|---|
   | `BRIDGE_SECRET` | The same value you set on Render |
   | `DISCORD_BOT_TOKEN` | The token for this specific bot (Discord only) |

5. Deploy the project and copy the Vercel deployment URL

---

## Step 4 — Register a Route

Once both the bridge and your Vercel bot are live, you need to tell the bridge where to forward events.

See [Adding Routes](./adding-routes.md) for the full guide.

---

## Next Steps

- [Discord Bot Guide](./discord.md)
- [WhatsApp Bot Guide](./whatsapp.md)
- [Payment Webhooks](./payments.md)
- [Using Chromium on Vercel](./chromium.md)
