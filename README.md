# Telenotify

Telegram notifications for businesses, through one API call. Organizations sign up in the **developer portal**, try everything in a **sandbox**, then go **live** with their own bot.

Telenotify only sends on Telegram. When a customer can't be reached there, the API says so immediately (`UNDELIVERABLE` with a reason) and sends webhook events, so the organization's own SMS or email provider can take over.

```
.             NestJS API (public /v1 API, portal API, auth, Telegram webhooks)
portal/       Next.js developer portal (talks to the API through its /api proxy)
```

## Run locally

```bash
docker compose up -d                  # Postgres :5440, Redis :6390
cp .env.example .env                  # fill ENCRYPTION_KEY, SANDBOX_WEBHOOK_SECRET, ...
npm install && npx prisma migrate deploy
npm run start:dev                     # API on :3000, reference at /docs

cd portal
cp .env.example .env.local
npm install && npm run dev            # portal on http://localhost:3001
```

- **Email:** without `SMTP_URL`, verification and reset emails are printed in the API log. Open the link from there.
- **Google sign-in:** create an OAuth client and add `${PORTAL_URL}/api/auth/google/callback` as an authorized redirect URI. The button is hidden until `GOOGLE_CLIENT_ID`/`SECRET` are set.
- **Sandbox bot:** create one with @BotFather and set `SANDBOX_BOT_TOKEN`. Telegram must reach `PUBLIC_BASE_URL` over HTTPS, so use a tunnel locally (`cloudflared tunnel --url http://localhost:3000`). Without it, the test customers still work.

## Concepts

| | Sandbox | Live |
|---|---|---|
| API key | `tn_test_…` | `tn_live_…` |
| Bot | Shared Telenotify sandbox bot; messages are labelled `[SANDBOX · Org]` | The organization's own @BotFather bot |
| Limits | 100 messages/day, 10 linked Telegram users | none yet |
| Test customers | `test_linked`, `test_not_linked`, `test_blocked`, `test_chat_gone`, `test_telegram_down` | — |
| Webhook URL | http or https | https only |

Every customer, message, key and webhook setting belongs to one environment.

## Public API (`x-api-key`)

| Method | Path | |
|---|---|---|
| POST | `/v1/customers/link` | One-time `t.me` connect link for `externalId` |
| PUT / GET | `/v1/customers/:externalId` | Upsert (phone) / status incl. `reachable` |
| POST | `/v1/messages` | Send. Returns `QUEUED`, or `UNDELIVERABLE` + `reason` right away |
| GET | `/v1/messages`, `/v1/messages/:id` | History (cursor pagination) / status |

Message results:

| Status | Reason | Meaning |
|---|---|---|
| `QUEUED` | — | Accepted; the final result arrives as an event |
| `SENT` | — | Telegram accepted it |
| `UNDELIVERABLE` | `not_linked`, `blocked`, `chat_gone` | Can't reach this customer on Telegram; use your fallback |
| `FAILED` | `telegram_unavailable`, `telegram_rejected` | Telegram kept failing (after 5 tries) or rejected the content |

Events (queued with retries; signed with `x-telenotify-signature: t=<ts>,v1=HMAC_SHA256(secret, "<ts>.<body>")`, plus a stable `x-telenotify-event-id`): `message.sent`, `message.undeliverable`, `message.failed`, `message.received`, `customer.linked`, `customer.blocked`, `webhook.test`.

## Portal

The portal includes:

- **Accounts:** sign up with email and password (with email verification and password reset), or with Google.
- **Organizations:** create several and switch between them; each one starts with a sandbox key.
- **Sandbox / Live switch.**
- **Get started:** a checklist and usage numbers.
- **Playground:** connect your own Telegram and send to any customer, including the test customers.
- **API keys:** create and revoke.
- **Webhooks:** set the URL, send a test event, rotate the signing secret.
- **Live bot:** connect your own bot.
- **Logs:** messages and customers.
- **Integration guide.**

## Security

- **Rate limits** (`src/common/throttling.ts`), per client IP and per email:

  | Route | Limit |
  |---|---|
  | login | 10 per minute per IP; 5 per 15 minutes per email (then blocked for 15 minutes) |
  | signup | 5 per 10 minutes |
  | forgot-password | 5 per 15 minutes per IP; 3 per hour per email |
  | resend-verification | 3 per 10 minutes |

  Counters live in memory, which is correct for a single API instance.
- **Webhook URLs:** URLs that point at private, loopback, link-local (cloud metadata) or reserved addresses are rejected when saved. Every address is checked again at connection time, so changing DNS later can't get around the check. Redirects are not followed. Set `ALLOW_PRIVATE_WEBHOOK_URLS=true` only for local development.
- **Webhook delivery:** events are queued in Redis and retried 10 times with exponential backoff (about 40 minutes in total). `x-telenotify-event-id` stays the same across retries, so receivers can de-duplicate.
- **Client IP:** the API trusts `X-Forwarded-For` only from `TRUST_PROXY` hops. Next.js keeps any `X-Forwarded-For` it receives, so in production the portal must sit behind a proxy that overwrites it. The Caddy setup below does this.

## Deploy (single server, Docker)

```bash
cd deploy
cp .env.production.example .env.production   # fill in domains, secrets, bot, Google, SMTP
docker compose --env-file .env.production up -d --build
```

- **Before starting:** point the `API_DOMAIN` and `PORTAL_DOMAIN` DNS records at the server. Caddy gets HTTPS certificates automatically.
- **Exposed ports:** only Caddy listens publicly (80/443). It sets `X-Forwarded-For` to the real client, and the API runs with `TRUST_PROXY=1`.
- **Migrations:** the API applies pending database migrations each time it starts.
- **Google:** add `https://<PORTAL_DOMAIN>/api/auth/google/callback` as a redirect URI, and publish the consent screen.
- **Back up** the `pgdata` volume and `ENCRYPTION_KEY`.

## Not done yet

- Inviting teammates and roles (the data model has OWNER/MEMBER; there is no UI or permission checks yet).
- Approval or KYC before going live; live usage limits and billing.
- Rate-limit counters are per instance (in memory); use Redis storage before running more than one API instance.
- A delivery log of webhook events in the portal.
- Per-bot send rate limits (one global 25/s limit today).
- A retry can send a message twice if the database update fails right after Telegram accepts it.
- Media and documents, templates and broadcasts.
- A landing page and visual polish of the portal.
