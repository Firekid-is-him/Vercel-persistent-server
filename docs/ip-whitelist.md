# IP Whitelist

The IP whitelist restricts which IP addresses can send requests to your Vercel bot endpoints through the bridge. Any request coming from an IP not on the list is rejected at the bridge before it reaches Vercel.

---

## How It Works

When a request arrives at the bridge, it checks the sender's IP against the whitelist stored in Redis. If the whitelist is empty or not configured, all IPs are allowed. If the whitelist contains entries, only those IPs pass through.

---

## Configuring the Whitelist

Via the dashboard or the admin API:

```bash
curl -X POST https://your-bridge.onrender.com/admin/config \
  -H "x-admin-secret: your_admin_secret" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "ip_whitelist",
    "value": ["203.0.113.1", "198.51.100.42"]
  }'
```

Pass an array of allowed IP addresses. IPv4 and IPv6 are both supported.

---

## Allowing All IPs

To disable the whitelist and allow all IPs, set it to an empty array:

```bash
curl -X POST https://your-bridge.onrender.com/admin/config \
  -H "x-admin-secret: your_admin_secret" \
  -H "Content-Type: application/json" \
  -d '{"key":"ip_whitelist","value":[]}'
```

Or delete the key entirely. If the key does not exist in Redis, all IPs are allowed.

---

## Viewing the Current Whitelist

```bash
curl https://your-bridge.onrender.com/admin/config/ip_whitelist \
  -H "x-admin-secret: your_admin_secret"
```

---

## Notes

- The IP check applies to all inbound requests to the bridge, including admin API calls. Make sure your own IP is on the whitelist before enabling it, or you will lock yourself out.
- If you are behind a dynamic IP, use the dashboard to update the whitelist whenever your IP changes. Do not enable a strict whitelist if your IP changes frequently.
- The bridge reads the client IP from the `x-forwarded-for` header first, then falls back to the raw socket address. On Render, the forwarded header is set by Render's proxy layer.
