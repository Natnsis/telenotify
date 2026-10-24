# Security policy

Telenotify handles bot tokens, API keys and customers' phone numbers, so we take reports seriously.

## Reporting a vulnerability

Please **don't open a public GitHub issue**. Instead, use GitHub's private reporting: on this repository, open **Security → Report a vulnerability**.

Include what's affected, how to reproduce it and the impact you expect. We'll reply within 3 working days and keep you updated until it's fixed. We're happy to credit you once a fix is released.

## Scope

- The API (`src/`), the portal (`portal/`) and the SDK (`sdk/node/`).
- The hosted service at telenotify.duckdns.org and telenotify-api.duckdns.org. Please test only against your own account and sandbox, and don't run load or denial-of-service tests.

## Supported versions

Fixes go into `main` and the latest SDK release.
