# @telenotify/node

Official Node.js / TypeScript client for **Telenotify**: customer notifications and phone verification on Telegram, with an instant signal when you should fall back to SMS.

- Zero dependencies (uses the built-in `fetch`, Node 18+)
- Typed responses and errors
- Automatic retries for network errors, 429 and 5xx, only on requests that are safe to repeat
- Webhook signature verification

## Install

```bash
npm install @telenotify/node
```

## Quick start

```ts
import { Telenotify } from '@telenotify/node';

const telenotify = new Telenotify({
  apiKey: process.env.TELENOTIFY_KEY!,      // tn_test_… or tn_live_…
  baseUrl: process.env.TELENOTIFY_API_URL,  // or set TELENOTIFY_API_URL
});

const message = await telenotify.messages.send({
  to: order.customerId,
  text: `Order #${order.id} is out for delivery 🚚`,
  buttons: [[{ text: 'Track order', url: order.trackingUrl }]],
  idempotencyKey: `order-${order.id}-shipped`, // also makes retries safe
});

if (message.status === 'UNDELIVERABLE') {
  await sms.send(order.phone, text); // your own provider, only when needed
}
```

## Connect customers

```ts
const { url } = await telenotify.customers.createLink('customer_123');
// Show `url` as a "Get updates on Telegram" button or QR code.

const customer = await telenotify.customers.get('customer_123');
customer.reachable; // false → use your fallback channel
```

## Verify a phone number without SMS

```ts
const verification = await telenotify.verifications.create({
  phone: '0911223344',      // optional: must match the Telegram number
  externalId: 'customer_123', // optional: also links them for notifications
});
// Send the user to verification.url, then:
const result = await telenotify.verifications.get(verification.id);
if (result.status === 'VERIFIED') console.log('Verified', result.phone);
```

## Webhooks

```ts
import express from 'express';
import { webhooks } from '@telenotify/node';

app.post('/webhooks/telenotify', express.raw({ type: 'application/json' }), (req, res) => {
  const event = webhooks.constructEvent(req.body, req.header('x-telenotify-signature'), process.env.TELENOTIFY_WEBHOOK_SECRET!);
  if (event.event === 'message.undeliverable') {
    // fall back to SMS for event.data.to
  }
  res.sendStatus(200);
});
```

`event.id` stays the same across retries, so store it to ignore duplicates.

## Errors

```ts
import { TelenotifyError } from '@telenotify/node';

try {
  await telenotify.messages.send({ to: 'c', text: 'hi' });
} catch (error) {
  if (error instanceof TelenotifyError && error.isQuotaExceeded) {
    // plan quota reached: fall back and alert your team
  }
}
```
