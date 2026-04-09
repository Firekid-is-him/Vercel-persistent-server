export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (req.headers["x-bridge-secret"] !== process.env.BRIDGE_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const payload = req.body;
  const { source } = payload;

  if (source === "discord") {
    return handleDiscord(payload, res);
  }

  if (source === "whatsapp") {
    return handleWhatsApp(payload, res);
  }

  return res.status(400).json({ error: "Unknown source" });
}

async function handleDiscord(payload, res) {
  const { t: eventType, data } = payload;

  if (eventType === "INTERACTION_CREATE") {
    const commandName = data?.data?.name;

    if (commandName === "ping") {
      await discordRespond(data.id, data.token, {
        type: 4,
        data: { content: "Pong!" },
      });
    }
  }

  if (eventType === "MESSAGE_CREATE") {
    const content = data?.content;
    const channelId = data?.channel_id;

    if (content === "!hello") {
      await sendDiscordMessage(channelId, "Hello from Vercel.");
    }
  }

  return res.json({ ok: true });
}

async function handleWhatsApp(payload, res) {
  const msg = payload.message;
  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    "";
  const remoteJid = msg.key.remoteJid;

  if (text === "ping") {
    await sendWhatsAppMessage(remoteJid, "Pong!");
  }

  return res.json({ ok: true });
}

async function discordRespond(interactionId, interactionToken, body) {
  await fetch(
    `https://discord.com/api/v10/interactions/${interactionId}/${interactionToken}/callback`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

async function sendDiscordMessage(channelId, content) {
  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
    },
    body: JSON.stringify({ content }),
  });
}

async function sendWhatsAppMessage(remoteJid, text) {
  await fetch(`${process.env.BRIDGE_URL}/wa/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": process.env.ADMIN_SECRET,
    },
    body: JSON.stringify({ remoteJid, text }),
  });
}
