# WhatsApp Bot Guide

This guide covers how to build WhatsApp bot logic on Vercel using the Vercel Server bridge with Baileys.

---

## Limitations

The WhatsApp integration supports a single WhatsApp session running on the bridge. This is suitable for personal bots or small projects. Multi-user pairing (where different users connect their own numbers) is outside the scope of this project and requires a more complex session management setup.

---

## Enabling WhatsApp

Set the `WA_ENABLED` environment variable on your Render bridge to `true`.

On first boot, the bridge will print a QR code in the Render logs. Scan it with your WhatsApp account to authenticate. After scanning, the session is saved and the bridge will reconnect automatically on restart.

To view the QR code:
1. Go to your Render dashboard
2. Open the bridge service
3. Click **Logs**
4. Scan the QR code that appears with the WhatsApp app on your phone

---

## How Routing Works

WhatsApp events are routed using the sender's JID (a unique identifier for each WhatsApp number or group).

You can register two types of WhatsApp routes:

**Specific chat route** — only messages from a particular number or group are forwarded:
```
id: wa:2348012345678@s.whatsapp.net
```

**Catch-all route** — all WhatsApp messages are forwarded to one endpoint:
```
id: wa:*
```

If both a specific route and a catch-all exist, the specific route takes priority.

See [Adding Routes](./adding-routes.md) to register your WhatsApp route.

---

## Event Payload Structure

Every WhatsApp message forwarded to your Vercel endpoint will look like this:

```json
{
  "source": "whatsapp",
  "message": {
    "key": {
      "remoteJid": "2348012345678@s.whatsapp.net",
      "fromMe": false,
      "id": "message_id"
    },
    "message": {
      "conversation": "ping"
    },
    "messageTimestamp": 1700000000,
    "pushName": "John"
  }
}
```

For extended text messages (replies, links, etc.), the text is under `message.extendedTextMessage.text` instead of `message.conversation`.

---

## Extracting the Message Text

```js
const msg = payload.message;
const text =
  msg.message?.conversation ||
  msg.message?.extendedTextMessage?.text ||
  "";
```

---

## Sending a Reply

WhatsApp replies are sent back through the bridge via an admin endpoint. Add a `BRIDGE_URL` and `ADMIN_SECRET` env var to your Vercel project pointing at your Render bridge.

```js
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
```

---

## Environment Variables Required

| Variable | Description |
|---|---|
| `BRIDGE_SECRET` | Shared secret to verify requests from the bridge |
| `BRIDGE_URL` | Your Render bridge URL, e.g. `https://your-bridge.onrender.com` |
| `ADMIN_SECRET` | Admin secret for sending messages back through the bridge |

---

## Notes

- WhatsApp may flag accounts that send automated messages at high volume. Use responsibly.
- The session is tied to the phone number that scanned the QR code. If that number is banned or logged out, you will need to re-scan.
- Group message JIDs end in `@g.us`. Personal chat JIDs end in `@s.whatsapp.net`.
