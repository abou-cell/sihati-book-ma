# Sihati

Sihati is a Moroccan medical appointment booking platform built with Next.js and TypeScript.

## Environment configuration

Runtime environment validation is implemented with Zod in `lib/env.ts`, and app configuration is centralized in `lib/config/app.ts`.

### Environment variable table

| Variable | Scope | Required in development | Required in production | Description |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public | Yes | Yes | Public base URL for browser and server usage. |
| `DATABASE_URL` | Server-only | Optional now | Yes | Database connection string for backend modules. |
| `AUTH_SECRET` | Server-only | Optional now | Yes | Secret used for auth signing/encryption (future module). |
| `STRIPE_SECRET_KEY` | Server-only | Optional now | Yes | Stripe secret key (future payment module). |
| `STRIPE_WEBHOOK_SECRET` | Server-only | Optional now | Yes | Stripe webhook verification secret (future payment module). |
| `EMAIL_FROM` | Server-only | Optional now | Yes | Default sender address (future email module). |
| `RESEND_API_KEY` | Server-only | Optional now | Yes | Resend API key (future email module). |

## Local setup

1. Install Node.js 20.11+.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create local env file:
   ```bash
   cp .env.example .env.local
   ```
4. Start development server:
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` — run local development server.
- `npm run build` — create production build.
- `npm run start` — run production server.
- `npm run lint` — run ESLint.
- `npm run typecheck` — run TypeScript checks.
- `npm run check` — run lint and typecheck (recommended pre-commit/pre-deploy).

## Testing and quality best practices

- Run `npm run check` before every commit.
- Add unit/integration tests per module as features are introduced.
- Gate deployments through CI using lint, typecheck, tests, and build.

## Deployment notes

- Configure all production-required variables via your platform secret manager.
- In production mode, startup validation fails when required server secrets are missing.
- Rotate secrets regularly and separate credentials across dev/staging/prod.

## Security notes

- Only `NEXT_PUBLIC_*` values may be exposed to client bundles.
- Keep server secrets out of source control and browser-accessible code.
- Never print raw secrets in logs or error responses.

For deeper configuration details, see `docs/configuration.md`.
