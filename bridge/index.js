import { WebSocketManager, WebSocketShardEvents } from "@discordjs/ws";
import { REST } from "@discordjs/rest";
import { GatewayIntentBits } from "discord-api-types/v10";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import { Redis } from "@upstash/redis";
import express from "express";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import cron from "node-cron";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

const redis = new Redis({
  url: process.env.UPSTASH_URL,
  token: process.env.UPSTASH_TOKEN,
});

async function getSecret(key) {
  return await redis.get(key);
}

async function getRoutes() {
  return (await redis.hgetall("routes")) || {};
}

async function getConfig(key) {
  return await redis.get(key);
}

async function logEvent(source, routeId, payload) {
  const entry = JSON.stringify({
    source,
    routeId,
    timestamp: Date.now(),
    payload,
  });
  await redis.lpush("event_log", entry);
  await redis.ltrim("event_log", 0, 999);
}

async function isRateLimited(identifier) {
  const config = await getConfig("rate_limit");
  if (!config) return false;
  const { max, windowSeconds } = JSON.parse(config);
  const key = `rl:${identifier}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSeconds);
  return count > max;
}

async function isIPAllowed(ip) {
  const whitelist = await getConfig("ip_whitelist");
  if (!whitelist) return true;
  const list = JSON.parse(whitelist);
  if (list.length === 0) return true;
  return list.includes(ip);
}

async function forwardEvent(routeId, payload, source) {
  const routes = await getRoutes();
  const url = routes[routeId];
  if (!url) return;

  await logEvent(source, routeId, payload);

  const bridgeSecret = await getSecret("bridge_secret");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bridge-secret": bridgeSecret,
    },
    body: JSON.stringify(payload),
  }).catch((err) =>
    console.error(`Forward failed for route ${routeId}: ${err.message}`)
  );

  return res;
}

async function requireAdmin(req, res, next) {
  const adminSecret = await getSecret("admin_secret");

  if (!adminSecret) {
    if (req.headers["x-setup-token"] === process.env.UPSTASH_TOKEN) {
      return next();
    }
    return res.status(401).json({ error: "Not configured. Use setup endpoint." });
  }

  if (req.headers["x-admin-secret"] !== adminSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

async function requireBridge(req, res, next) {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const allowed = await isIPAllowed(ip);
  if (!allowed) return res.status(403).json({ error: "IP not allowed" });

  const bridgeSecret = await getSecret("bridge_secret");
  if (req.headers["x-bridge-secret"] !== bridgeSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

async function sendAlert(message) {
  const alertConfig = await getConfig("alert_config");
  if (!alertConfig) return;

  const { type, destination } = JSON.parse(alertConfig);

  if (type === "discord") {
    await fetch(destination, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    }).catch((err) => console.error(`Alert failed: ${err.message}`));
  }

  if (type === "whatsapp") {
    const bridgeSecret = await getSecret("bridge_secret");
    await fetch(`http://localhost:${process.env.PORT || 3000}/wa/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": await getSecret("admin_secret"),
      },
      body: JSON.stringify({ remoteJid: destination, text: message }),
    }).catch((err) => console.error(`WhatsApp alert failed: ${err.message}`));
  }
}

async function runHealthChecks() {
  const routes = await getRoutes();
  for (const [id, url] of Object.entries(routes)) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) {
        await sendAlert(`Health check failed for route ${id} — status ${res.status}`);
      }
    } catch (err) {
      await sendAlert(`Health check failed for route ${id} — ${err.message}`);
    }
  }
}

async function startDiscord() {
  const tokensRaw = await getConfig("discord_tokens");
  if (!tokensRaw) {
    console.warn("No discord_tokens in Redis. Discord bridge will not start.");
    return;
  }

  const tokens = JSON.parse(tokensRaw);

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

      const tenantConfig = await getConfig(`tenant:${guildId}`);
      const enriched = {
        source: "discord",
        tenant: tenantConfig ? JSON.parse(tenantConfig) : null,
        ...event,
      };

      await forwardEvent(guildId, enriched, "discord");
    });

    manager
      .connect()
      .catch((err) => console.error(`Discord connection failed: ${err.message}`));
  }
}

async function startWhatsApp() {
  const waEnabled = await getConfig("wa_enabled");
  if (waEnabled !== "true") return;

  const { state, saveCreds } = await useMultiFileAuthState("wa_auth");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  app.locals.waSock = sock;

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

      const limited = await isRateLimited(remoteJid);
      if (limited) continue;

      const routes = await getRoutes();
      const url = routes[`wa:${remoteJid}`] || routes["wa:*"];
      if (!url) continue;

      const bridgeSecret = await getSecret("bridge_secret");

      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-bridge-secret": bridgeSecret,
        },
        body: JSON.stringify({ source: "whatsapp", message: msg }),
      }).catch((err) => console.error(`WhatsApp forward failed: ${err.message}`));
    }
  });
}

async function startCronJobs() {
  const jobsRaw = await getConfig("cron_jobs");
  if (!jobsRaw) return;

  const jobs = JSON.parse(jobsRaw);

  for (const job of jobs) {
    if (!cron.validate(job.expression)) {
      console.warn(`Invalid cron expression for job ${job.id}: ${job.expression}`);
      continue;
    }

    cron.schedule(job.expression, async () => {
      const bridgeSecret = await getSecret("bridge_secret");
      await fetch(job.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-bridge-secret": bridgeSecret,
        },
        body: JSON.stringify({ source: "cron", jobId: job.id }),
      }).catch((err) => console.error(`Cron job ${job.id} failed: ${err.message}`));
    });
  }
}

wss.on("connection", async (ws, req) => {
  const bridgeSecret = await getSecret("bridge_secret");
  const token = new URL(req.url, "http://localhost").searchParams.get("token");

  if (token !== bridgeSecret) {
    ws.close(1008, "Unauthorized");
    return;
  }

  const routeId = new URL(req.url, "http://localhost").searchParams.get("routeId");
  ws.routeId = routeId;

  ws.on("message", async (data) => {
    const routes = await getRoutes();
    const url = routes[routeId];
    if (!url) return;

    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bridge-secret": bridgeSecret,
      },
      body: data,
    }).catch((err) => console.error(`WS forward failed: ${err.message}`));
  });
});

app.post("/wa/send", async (req, res) => {
  const adminSecret = await getSecret("admin_secret");
  if (req.headers["x-admin-secret"] !== adminSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { remoteJid, text } = req.body;
  const sock = req.app.locals.waSock;
  if (!sock) return res.status(503).json({ error: "WhatsApp not connected" });

  await sock.sendMessage(remoteJid, { text });
  res.json({ ok: true });
});

app.post("/setup", async (req, res) => {
  if (req.headers["x-setup-token"] !== process.env.UPSTASH_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const existing = await getSecret("admin_secret");
  if (existing) {
    return res.status(400).json({ error: "Already configured. Use dashboard." });
  }

  const { adminSecret, bridgeSecret } = req.body;
  if (!adminSecret || !bridgeSecret) {
    return res.status(400).json({ error: "adminSecret and bridgeSecret are required" });
  }

  await redis.set("admin_secret", adminSecret);
  await redis.set("bridge_secret", bridgeSecret);

  res.json({ ok: true });
});

app.post("/admin/routes", requireAdmin, async (req, res) => {
  const { id, url } = req.body;
  if (!id || !url) return res.status(400).json({ error: "id and url are required" });
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

app.post("/admin/config", requireAdmin, async (req, res) => {
  const { key, value } = req.body;
  if (!key || value === undefined) {
    return res.status(400).json({ error: "key and value are required" });
  }
  await redis.set(key, typeof value === "string" ? value : JSON.stringify(value));
  res.json({ ok: true, key });
});

app.get("/admin/config/:key", requireAdmin, async (req, res) => {
  const value = await getConfig(req.params.key);
  res.json({ key: req.params.key, value });
});

app.get("/admin/logs", requireAdmin, async (req, res) => {
  const logs = await redis.lrange("event_log", 0, 99);
  res.json(logs.map((l) => JSON.parse(l)));
});

app.post("/admin/tenant", requireAdmin, async (req, res) => {
  const { guildId, config } = req.body;
  if (!guildId || !config) {
    return res.status(400).json({ error: "guildId and config are required" });
  }
  await redis.set(`tenant:${guildId}`, JSON.stringify(config));
  res.json({ ok: true, guildId });
});

app.delete("/admin/tenant/:guildId", requireAdmin, async (req, res) => {
  await redis.del(`tenant:${req.params.guildId}`);
  res.json({ ok: true, deleted: req.params.guildId });
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/dashboard", express.static(path.join(__dirname, "dist")));

const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
  console.log(`Bridge running on port ${PORT}`);
  await startDiscord();
  await startWhatsApp();
  await startCronJobs();

  cron.schedule("*/12 * * * *", async () => {
    await runHealthChecks();
    await fetch(`http://localhost:${PORT}/health`).catch(() => {});
  });
});
