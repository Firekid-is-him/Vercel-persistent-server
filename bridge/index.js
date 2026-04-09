import { WebSocketManager, WebSocketShardEvents } from "@discordjs/ws";
import { REST } from "@discordjs/rest";
import { GatewayIntentBits } from "discord-api-types/v10";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import { Redis } from "@upstash/redis";
import express from "express";

const app = express();
app.use(express.json());

const redis = new Redis({
  url: process.env.UPSTASH_URL,
  token: process.env.UPSTASH_TOKEN,
});

async function getRoutes() {
  return (await redis.hgetall("routes")) || {};
}

async function forwardEvent(routeId, payload) {
  const routes = await getRoutes();
  const url = routes[routeId];
  if (!url) return;

  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bridge-secret": process.env.BRIDGE_SECRET,
    },
    body: JSON.stringify(payload),
  }).catch((err) =>
    console.error(`Forward failed for route ${routeId}: ${err.message}`)
  );
}

function requireAdmin(req, res, next) {
  if (req.headers["x-admin-secret"] !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

async function startDiscord() {
  const tokens = process.env.DISCORD_TOKENS
    ? process.env.DISCORD_TOKENS.split(",").map((t) => t.trim())
    : [];

  if (tokens.length === 0) {
    console.warn("No DISCORD_TOKENS provided. Discord bridge will not start.");
    return;
  }

  for (const token of tokens) {
    const rest = new REST({ version: "10" }).setToken(token);

    const manager = new WebSocketManager({
      token,
      rest,
      intents:
        GatewayIntentBits.Guilds |
        GatewayIntentBits.GuildMessages |
        GatewayIntentBits.MessageContent |
        GatewayIntentBits.GuildMembers,
    });

    manager.on(WebSocketShardEvents.Dispatch, async (event) => {
      const guildId = event.data?.guild_id;
      if (!guildId) return;
      await forwardEvent(guildId, { source: "discord", ...event });
    });

    manager
      .connect()
      .catch((err) =>
        console.error(`Discord connection failed: ${err.message}`)
      );
  }
}

async function startWhatsApp() {
  if (process.env.WA_ENABLED !== "true") return;

  const { state, saveCreds } = await useMultiFileAuthState("wa_auth");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startWhatsApp();
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message) continue;
      const remoteJid = msg.key.remoteJid;
      const routes = await getRoutes();
      const url = routes[`wa:${remoteJid}`] || routes["wa:*"];
      if (!url) continue;

      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-bridge-secret": process.env.BRIDGE_SECRET,
        },
        body: JSON.stringify({ source: "whatsapp", message: msg }),
      }).catch((err) =>
        console.error(`WhatsApp forward failed: ${err.message}`)
      );
    }
  });
}

app.post("/admin/routes", requireAdmin, async (req, res) => {
  const { id, url } = req.body;
  if (!id || !url)
    return res.status(400).json({ error: "id and url are required" });
  await redis.hset("routes", { [id]: url });
  res.json({ ok: true, id, url });
});

app.delete("/admin/routes/:id", requireAdmin, async (req, res) => {
  await redis.hdel("routes", req.params.id);
  res.json({ ok: true, deleted: req.params.id });
});

app.get("/admin/routes", requireAdmin, async (req, res) => {
  const routes = await getRoutes();
  res.json(routes);
});

app.get("/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bridge running on port ${PORT}`));

startDiscord();
startWhatsApp();
