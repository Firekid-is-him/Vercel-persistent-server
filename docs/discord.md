# Discord Bot Guide

This guide covers how to build your Discord bot logic on Vercel using the Vercel Server bridge.

---

## How It Works

The bridge connects to Discord's gateway using your bot token and listens for all events across every server the bot is in. When an event comes in, it reads the guild ID, looks up the registered route for that guild, and forwards the event to your Vercel endpoint as a POST request.

Your Vercel bot receives the event, processes it, and responds directly to Discord using the Discord REST API.

---

## Event Payload Structure

Every request forwarded to your Vercel endpoint will have the following shape:

```json
{
  "source": "discord",
  "t": "MESSAGE_CREATE",
  "op": 0,
  "d": {
    "id": "message_id",
    "channel_id": "channel_id",
    "guild_id": "guild_id",
    "content": "!hello",
    "author": {
      "id": "user_id",
      "username": "username",
      "discriminator": "0"
    }
  }
}
```

The `t` field is the event type. The `d` field contains the full event data as defined by the [Discord Gateway documentation](https://discord.com/developers/docs/topics/gateway-events).

---

## Common Event Types

| Event | `t` value | Description |
|---|---|---|
| Message sent | `MESSAGE_CREATE` | A user sent a message in a channel |
| Slash command used | `INTERACTION_CREATE` | A user used a slash command or component |
| Member joined | `GUILD_MEMBER_ADD` | A user joined the server |
| Member left | `GUILD_MEMBER_REMOVE` | A user left the server |
| Reaction added | `MESSAGE_REACTION_ADD` | A user reacted to a message |

---

## Handling a Message Command

```js
if (eventType === "MESSAGE_CREATE") {
  const content = payload.d?.content;
  const channelId = payload.d?.channel_id;

  if (content === "!ping") {
    await sendDiscordMessage(channelId, "Pong!");
  }
}
```

---

## Handling a Slash Command

Slash commands arrive as `INTERACTION_CREATE` events. You must respond within 3 seconds or Discord will show an error to the user.

```js
if (eventType === "INTERACTION_CREATE") {
  const commandName = payload.d?.data?.name;
  const interactionId = payload.d?.id;
  const interactionToken = payload.d?.token;

  if (commandName === "ping") {
    await discordRespond(interactionId, interactionToken, {
      type: 4,
      data: { content: "Pong!" },
    });
  }
}
```

Response types:

| Type | Meaning |
|---|---|
| `4` | Reply immediately with a message |
| `5` | Defer the reply (gives you 15 minutes to follow up) |
| `6` | Acknowledge a component interaction with no reply |

---

## Sending a Message

```js
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
```

---

## Registering Slash Commands

Slash commands must be registered with Discord before they appear in the UI. You can do this by calling the Discord REST API once from a local script or a one-time Vercel function.

```js
await fetch(`https://discord.com/api/v10/applications/{APPLICATION_ID}/commands`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
  },
  body: JSON.stringify({
    name: "ping",
    description: "Replies with Pong",
    type: 1,
  }),
});
```

Replace `{APPLICATION_ID}` with your bot's application ID, found in the [Discord Developer Portal](https://discord.com/developers/applications).

---

## Environment Variables Required

| Variable | Description |
|---|---|
| `BRIDGE_SECRET` | Shared secret to verify requests from the bridge |
| `DISCORD_BOT_TOKEN` | Your bot's token for sending messages and responding to interactions |

---

## Gateway Intents

The bridge requests the following intents by default:

- `GUILDS`
- `GUILD_MESSAGES`
- `MESSAGE_CONTENT`
- `GUILD_MEMBERS`

If you need additional intents, update the `intents` field in `bridge/index.js` and enable them in the Discord Developer Portal under **Bot > Privileged Gateway Intents**.
