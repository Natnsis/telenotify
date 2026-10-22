# Telenotify roadmap: before payment integration

Agreed order (2026-10-22). Tick items as they ship; keep this file current.

## Batch 1: Developer debugging ✅ (done 2026-10-22)
- [x] Webhook delivery log in the portal: every event with status, attempts, HTTP response, payload
- [x] Resend a webhook event from the portal
- [x] Message detail view: timeline, reason, request, related webhook events, "copy as curl"

## Batch 2: Required before taking money ✅ (done 2026-10-22)
- [x] Account settings: change name and password, linked Google account, delete account
- [x] Organization settings: rename, leave, delete organization
- [x] Terms of Service, Privacy Policy and Refund Policy pages
- [x] Usage alert emails at 80% and 100% of the plan quota
- [x] Audit log: keys created/revoked, bot connected, invites, plan changes

## Batch 3: Make the value visible ✅ (done 2026-10-22)
- [x] Analytics on Get started: messages per day, delivery rate, % reachable on Telegram, SMS money saved
- [x] Customer detail page: link status, phone, verification history, messages, send test, unlink
- [x] QR codes for connect links (downloadable PNG)
- [x] Quick search (Cmd+K) and a short first-login tour, with better empty states

## Batch 4: Faster integration
- [ ] Official Node/TypeScript SDK (send, verify, link, verifyWebhook)
- [ ] Request log per API key (endpoint, status, error, timing)
- [ ] Interactive API reference in the portal + Postman collection

## Batch 4b: Look and feel
- [ ] Theme switcher: light / dark / follow system, for the portal and landing page (remembered per user)

## Proposed: payment-gateway readiness (from the 2026-10-22 scenario, not yet agreed)
- [ ] Per-bot send rate limits and a priority lane so OTP/transaction messages jump ahead of bulk sends
- [ ] Message templates with Amharic/English variants
- [ ] Optional "bring your own SMS provider" fallback (e.g. AfroMessage credentials), so Telenotify sends the SMS itself when Telegram can't
- [ ] Data-residency and compliance notes for regulated customers (hosting location, DPA)

## Batch 5: Payments
- [ ] Online plan payment (e.g. Chapa)
