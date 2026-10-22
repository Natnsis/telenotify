# Deploying the test environment (Vercel + Render free)

This is a **test** deployment: the portal and landing page on Vercel, and the API, Postgres and Redis on Render's free plans. Production will be hosted elsewhere; see [What changes for production](#what-changes-for-production).

```
Browser ──► Vercel (portal + landing) ──/api/*──► Render: telenotify-api ──► Postgres (free)
Telegram ─────────────────────────────────────►        (Docker)          ──► Key Value / Redis (free)
Your API clients ─────────────────────────────►
```

Do the steps in order: Render first (the portal needs the API's address), then Vercel.

---

## 1. Prepare secrets (on your machine)

Generate these new values for the test deployment. Don't reuse the ones from your local `.env`.

| Variable | How to generate |
|---|---|
| `ENCRYPTION_KEY` | `openssl rand -base64 32` |
| `SANDBOX_WEBHOOK_SECRET` | `openssl rand -hex 32` (letters and digits only; Telegram rejects `+ / =`) |

- [ ] **Create a new test bot** with @BotFather (e.g. `@telenotify_test_bot`) and use its token as `SANDBOX_BOT_TOKEN`.
  Don't reuse your local sandbox bot. A bot has a single webhook, and each API points it at itself on startup. Your laptop and Render would keep taking it from each other.
- [ ] The same applies to live bots: don't connect `@melaloan1_bot` on Render while your local API still uses it.

## 2. Render: API, Postgres and Redis

1. [ ] Render dashboard → **New → Blueprint** → connect `sami-yesha/telenotify`. Render reads `render.yaml` and creates three resources:
   - `telenotify-api` (web, Docker, free)
   - `telenotify-db` (Postgres, free)
   - `telenotify-redis` (Key Value, free, `noeviction`)
2. [ ] Fill in the values Render asks for:

   | Variable | Value |
   |---|---|
   | `PUBLIC_BASE_URL` | `https://telenotify-api.onrender.com` (Render may add a suffix if the name is taken; fix it in step 4) |
   | `PORTAL_URL` | The Vercel address you'll use, e.g. `https://telenotify.vercel.app` |
   | `ENCRYPTION_KEY`, `SANDBOX_WEBHOOK_SECRET`, `SANDBOX_BOT_TOKEN` | From step 1 |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Same Google OAuth client as local (add the new redirect URI in step 5) |
   | `SMTP_URL` | Your Brevo SMTP URL, or leave it empty to print emails to the Render log |
   | `MAIL_FROM` | e.g. `Telenotify <no-reply@yourdomain>` (must be a sender verified in Brevo) |

3. [ ] Apply. The first build takes a few minutes. Database migrations run automatically every time the container starts (see `Dockerfile`).
4. [ ] Open the service and copy its real URL. If it differs from what you entered, update `PUBLIC_BASE_URL`; changing an environment variable redeploys the service.
5. [ ] Check it:
   - `https://<api>.onrender.com/health` returns OK
   - `/docs` shows Swagger
   - the log shows `Sandbox bot @… ready`

## 3. Vercel: portal and landing page

1. [ ] Vercel → **Add New → Project** → import `sami-yesha/telenotify`.
2. [ ] **Root Directory: `portal`**. Vercel detects Next.js; leave the build settings at their defaults.
3. [ ] Environment variables (Production):

   | Variable | Value |
   |---|---|
   | `API_URL` | `https://<api>.onrender.com` (the portal forwards `/api/*` here) |
   | `NEXT_PUBLIC_API_BASE_URL` | Same URL (shown in docs and code samples) |

   Both are fixed when the portal is built. If you change them, redeploy.
4. [ ] Deploy. If the address isn't the `PORTAL_URL` you gave Render, update `PORTAL_URL` on Render.

## 4. Google sign-in

In the Google Cloud console, open your OAuth client and add:

- [ ] **Authorized JavaScript origin:** `https://<portal>.vercel.app`
- [ ] **Authorized redirect URI:** `https://<portal>.vercel.app/api/auth/google/callback`

Keep the localhost entries so local development keeps working.

## 5. Email (Brevo)

Brevo only accepts SMTP logins from IPs you have whitelisted, and Render sends from different IPs than your laptop.

- [ ] Render → service → **Connect → Outbound**: copy the outbound IP ranges and add them in Brevo → **Security → Authorized IPs**.
- [ ] Or, for testing, disable the IP restriction in Brevo.

## 6. Smoke test

- [ ] **Account**
  - [ ] Landing page loads, the theme switch works, and the pricing shows 199 / 599 ETB.
  - [ ] Sign up with email: the verification email arrives.
  - [ ] Google sign-in works.
- [ ] **Sandbox messaging**
  - [ ] Playground → connect your Telegram to the new test bot, then send a message and receive it.
  - [ ] Playground → Verify with Telegram completes on your phone.
- [ ] **Webhooks:** set a webhook URL (e.g. webhook.site) → Send test event → it shows as delivered.
- [ ] **SMS fallback:** turn it on in the sandbox → send to a customer who isn't linked but has a phone → the message shows "SMS sent (simulated)".
- [ ] **Client IPs** (checks `TRUST_PROXY`)
  - [ ] Make one API call with a sandbox key from your machine.
  - [ ] Open **Configure → API keys**, request log. The IP should be your own public IP.
  - [ ] If it shows an IP from Vercel or Render instead, change `TRUST_PROXY` on Render (try `3`).
  - [ ] Why it matters: rate limits are per IP, so a wrong IP puts everyone in one bucket.

## Free-plan behaviour (expected, not bugs)

- **Cold starts.** The API sleeps after 15 minutes idle and needs about a minute to wake.
  - The first portal request may time out: open `https://<api>.onrender.com/health` first, then reload the portal.
  - Telegram retries webhook updates, so a `/start` sent while the API sleeps arrives late rather than never.
- **Redis is not persistent.** A restart or redeploy drops queued messages and pending webhook retries.
- **Postgres expires 30 days after creation.** Render emails you before it does. To keep testing, create a new free database and point `DATABASE_URL` at it; the migrations rebuild the tables.
- **750 free instance hours a month**, which is enough for this one service running all the time.
- **Vercel Hobby** is for non-commercial use, which covers a test deployment.

## Updating

- Push to `main` and both deploy automatically.
- Render only rebuilds when API files change (`buildFilter` in `render.yaml`).
- Vercel rebuilds the portal on every push. You can limit that with an "Ignored Build Step" of `git diff --quiet HEAD^ HEAD -- .` in the project settings.

## What changes for production

- **Hosting**
  - A paid, always-on API: no sleeping, persistent Redis with `noeviction`, and backed-up Postgres.
  - Or the single-server setup in `deploy/` (Docker Compose + Caddy).
- **Secrets:** new ones for production (`ENCRYPTION_KEY`, webhook secret) and a production sandbox bot.
- **Domain:** a custom domain for both the portal and the API.
  - Update `PORTAL_URL`, `PUBLIC_BASE_URL`, the Google OAuth URIs and `MAIL_FROM`.
- **`TRUST_PROXY`:** set it to match the real proxy hops.
- **Data residency:** for regulated customers (banks, payment gateways), confirm where data is hosted. This is the last open item in the roadmap's readiness list.
