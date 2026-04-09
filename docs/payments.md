# Payment Webhooks

Payment webhooks do not require the bridge. Services like Stripe, Paystack, and Flutterwave send HTTP POST requests directly to a URL you provide. Vercel handles these perfectly without any persistent connection.

---

## How It Works

1. You create an endpoint in your Vercel project, for example `/api/webhook`
2. You provide that URL to your payment provider in their dashboard
3. When a payment event occurs, the provider sends a POST request to your endpoint
4. Your Vercel function processes the event and responds

---

## Example Endpoint

```js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const event = req.body;

  if (event.event === "charge.success") {
    const { reference, amount, customer } = event.data;
    // fulfill the order, update your database, etc.
  }

  return res.status(200).json({ received: true });
}
```

---

## Verifying Webhook Signatures

Always verify that the request actually came from your payment provider and not a third party. Each provider has a different method:

**Paystack** — HMAC SHA-512 using your secret key:
```js
import crypto from "crypto";

const hash = crypto
  .createHmac("sha512", process.env.PAYSTACK_SECRET)
  .update(JSON.stringify(req.body))
  .digest("hex");

if (hash !== req.headers["x-paystack-signature"]) {
  return res.status(401).json({ error: "Invalid signature" });
}
```

**Stripe** — use the official Stripe SDK:
```js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const event = stripe.webhooks.constructEvent(
  req.body,
  req.headers["stripe-signature"],
  process.env.STRIPE_WEBHOOK_SECRET
);
```

Refer to your payment provider's documentation for their specific verification method.

---

## Provider Webhook Dashboard URLs

| Provider | Webhook Settings |
|---|---|
| Paystack | [dashboard.paystack.com/settings/developer](https://dashboard.paystack.com/settings/developer) |
| Stripe | [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks) |
| Flutterwave | [dashboard.flutterwave.com/settings/webhooks](https://dashboard.flutterwave.com/settings/webhooks) |

---

## Notes

- Vercel functions have a maximum execution time of 10 seconds on the free plan and 60 seconds on Pro. Keep webhook processing fast or offload heavy work to a queue.
- Do not add payment webhook URLs to the bridge routing table. They are completely separate.
- Always respond with a `200` status quickly, then process the event asynchronously if needed, to prevent the provider from retrying.
