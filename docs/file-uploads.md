# File Uploads

Vercel serverless functions have a 4.5MB body size limit and a 10 second execution timeout on the free tier. This makes receiving large file uploads directly on Vercel impractical.

The bridge solves this by acting as the upload receiver. It accepts the file, streams it to your chosen storage provider, and then POSTs the result to your Vercel endpoint. Vercel only ever receives a small JSON payload with the file URL — it never touches the raw file.

---

## How It Works

```
Client uploads file to bridge
       |
Bridge streams file to your storage provider
       |
Bridge POSTs file URL and metadata to your Vercel endpoint
       |
Vercel handles the rest (save to DB, notify user, etc.)
```

---

## Configuration

Configure your storage provider via the dashboard. The bridge reads your provider settings from Redis at upload time. No env vars on Render are required.

The settings you provide depend entirely on your chosen storage provider. At minimum you will need:

- The provider's API endpoint or bucket URL
- An access key or token with write permissions
- A bucket or container name

Refer to your storage provider's documentation for the exact credentials required.

---

## Uploading a File

Send a `multipart/form-data` POST request to the bridge upload endpoint:

```
POST https://your-bridge.onrender.com/upload
x-bridge-secret: your_bridge_secret
x-route-id: your_route_id
Content-Type: multipart/form-data

file: [binary data]
```

The `x-route-id` header tells the bridge which Vercel endpoint to notify after the upload completes.

---

## Payload Your Vercel Bot Receives

```json
{
  "source": "upload",
  "routeId": "your_route_id",
  "file": {
    "url": "https://your-storage-provider.com/bucket/filename.jpg",
    "name": "filename.jpg",
    "size": 204800,
    "mimeType": "image/jpeg"
  }
}
```

Handle it in your Vercel bot:

```js
if (source === "upload") {
  const { url, name, size, mimeType } = payload.file;
  // save to database, notify user, trigger processing, etc.
}
```

---

## Storage Provider Options

The bridge is storage-agnostic. Any provider with an HTTP upload API or S3-compatible interface will work. Popular options include:

- Cloudflare R2
- AWS S3
- Backblaze B2
- Supabase Storage
- Any S3-compatible provider

Choose based on your budget, region, and egress requirements. Configure credentials through the dashboard.

---

## Notes

- The bridge streams the file directly to storage without loading it fully into memory, keeping RAM usage low.
- There is no file size limit imposed by the bridge itself. Limits depend on your storage provider and Render's network.
- Files are not stored on the bridge. If the upload to storage fails, nothing is forwarded to Vercel.
