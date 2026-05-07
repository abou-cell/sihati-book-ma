# Testing guide

This project uses **Vitest** for fast, deterministic TypeScript tests that fit the current Next.js App Router setup.

## Local commands

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

For watch-mode testing during local development, run `npm run test:watch`. `npm run check` remains a convenience alias for lint plus typecheck, but the full local pre-PR gate matches CI exactly.

## Current test foundation

The initial suite intentionally focuses on production-safety seams that do not require real production providers:

- validators for availability rules, available-slot queries, appointment creation, and practitioner search queries,
- service behavior for appointment creation, practitioner search mapping, availability slot generation, and notifications,
- auth/session helper behavior for local demo headers and production rejection,
- role/permission helpers,
- centralized security error helpers,
- API response contracts for validation errors and safe success envelopes.

## Provider and data isolation rules

Tests must remain fast and deterministic:

- Do not require real Stripe, Firebase, SMTP/Resend, Cloudflare, or other production provider credentials.
- Do not require a live production database.
- Use in-memory repositories, local fixtures, and Vitest mocks for service dependencies.
- Use fake timers for date-sensitive behavior such as future appointment checks and availability generation.
- Keep fixtures minimal and local to each test file unless a shared helper clearly reduces duplication without hiding important setup.

## CI gate

GitHub Actions runs the production-readiness gate on pushes and pull requests:

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`
5. `npm run build`

`npm run check` remains the combined lint/typecheck command for local convenience. CI runs lint and typecheck as separate explicit stages so failures are easier to diagnose.

## Remaining test gaps

The current foundation is intentionally small. Before production release, add:

- route-handler tests for authenticated appointment creation using mocked repositories or dependency injection,
- integration tests against a clearly configured test database for Prisma repositories and transaction/race behavior,
- availability CRUD API tests after those routes exist,
- dashboard and video authorization tests after demo/in-memory data is replaced,
- payment/webhook tests only after verified Stripe integration is implemented with Stripe test fixtures,
- E2E smoke tests for search, booking, dashboards, and access-denied flows.
