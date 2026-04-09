# WebSocket Relay

The bridge supports persistent WebSocket connections from clients. Messages sent over the WebSocket are forwarded to your registered Vercel endpoint as HTTP POST requests. This allows you to build real-time features — live chat, notifications, dashboards — with all logic handled on Vercel.

---

## How It Works

```
Client connects via WebSocket to the bridge
       |
Client sends a message
       |
Bridge forwards it as HTTP POST to your Vercel endpoint
       |
Vercel processes the message and responds via REST if needed
```

---

## Connecting a Client

```js
const ws = new WebSocket(
  "wss://your-bridge.onrender.com?token=your_bridge_secret&routeId=your_route_id"
);

ws.onopen = () => {
  ws.send(JSON.stringify({ type: "ping" }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
};
```

Both `token` and `routeId` are required query parameters. `token` must match your `bridge_secret`. `routeId` must be a registered route in Redis.

If the token is invalid, the connection is closed immediately with code `1008`.

---

## Payload Your Vercel Bot Receives

Whatever the client sends over the WebSocket is forwarded as-is to your Vercel endpoint as the POST body. Wrap your messages in a consistent format:

```json
{
  "type": "chat_message",
  "userId": "user_123",
  "text": "Hello"
}
```

Handle it in your Vercel bot:

```js
export default async function handler(req, res) {
  const payload = req.body;

  if (payload.type === "chat_message") {
    // process the message
  }

  return res.json({ ok: true });
}
```

---

## Sending a Response Back to the Client

Vercel cannot push directly to a WebSocket client. To send a message back, store it in Redis or a database and have the client poll for it, or use Server-Sent Events from a separate endpoint.

---

## Registering a WebSocket Route

WebSocket routes use the same routing table as all other events. Register the route with the client's identifier as the ID:

```bash
curl -X POST https://your-bridge.onrender.com/admin/routes \
  -H "x-admin-secret: your_admin_secret" \
  -H "Content-Type: application/json" \
  -d '{"id":"your_route_id","url":"https://your-bot.vercel.app/api/event"}'
```

---

## Notes

- Each WebSocket connection is persistent for as long as the client stays connected.
- The bridge does not store WebSocket messages. If your Vercel endpoint is down when a message arrives, the message is lost.
- For high-volume WebSocket traffic, consider a dedicated server rather than the free tier bridge.
