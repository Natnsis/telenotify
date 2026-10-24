# Contributing to Telenotify

Thanks for helping. Bug reports, ideas, docs fixes and pull requests are all welcome.

## Reporting a bug or idea

Open an issue with what you expected, what happened, and how to reproduce it (API request and response, or portal steps). Leave out API keys, bot tokens and customer data.

**Security problems:** don't open a public issue. See [SECURITY.md](SECURITY.md).

## Development setup

The README's "Run locally" section has the full steps. In short:

```bash
docker compose up -d                       # Postgres and Redis
cp .env.example .env && npm install
npx prisma migrate deploy && npm run start:dev   # API on :3000
cd portal && cp .env.example .env.local && npm install && npm run dev   # portal on :3001
```

## Before you open a pull request

- `npm test` passes in the root (API), and `npm test` in `sdk/node` if you touched the SDK.
- `npx tsc --noEmit` passes in the root and in `portal/`.
- New behaviour has a test where it's practical (see the `*.spec.ts` files next to the code).
- Database changes come with a Prisma migration (`npx prisma migrate dev --name what_changed`).
- Keep pull requests focused: one change per PR is easier to review.

## Code style

- Match the surrounding code: names, comment density and structure.
- Comments explain *why*, not what the next line does.
- User-facing text is plain and short; error messages say what to do next.

## Contributor License Agreement (CLA)

Before your first pull request can be merged, you sign our [CLA](CLA.md). It takes one comment: a bot posts the exact text on your pull request, and you reply with it. You only sign once, for all your future contributions.

**Why:** you keep the copyright to your work and Telenotify stays open source (AGPL-3.0). The CLA also lets the project offer Telenotify under other licenses, for example to a bank that can't use AGPL software, which helps keep the project funded.

## License of contributions

Your contributions are published under the project's licenses (AGPL-3.0 for the server and portal, MIT for `sdk/node`) and, as described in the [CLA](CLA.md), may also be licensed under other terms by the project owner.
