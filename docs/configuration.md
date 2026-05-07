# Configuration Guide

This document explains how Sihati validates runtime environment variables and exposes safe app configuration values.

## Environment variables

| Variable | Scope | Required in development | Required in production | Description |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public | Yes | Yes | Base app URL exposed to client and server code. |
| `DATABASE_URL` | Server-only | Optional (for future modules) | Yes | Database connection URL used by backend services. |
| `AUTH_SECRET` | Server-only | Optional (for future auth module) | Yes | Secret used for signing/encrypting auth data. |
| `APP_ENCRYPTION_KEY` | Server-only | Optional (until production runtime) | Yes | Base64-encoded 32-byte key for encrypting sensitive application data at rest. |
| `STRIPE_SECRET_KEY` | Server-only | Optional (for future payments) | Yes | Stripe secret key for server-side payment operations. |
| `STRIPE_WEBHOOK_SECRET` | Server-only | Optional (for future payments) | Yes | Stripe webhook signature verification secret. |
| `EMAIL_FROM` | Server-only | Optional (for future email module) | Yes | Sender identity for transactional emails. |
| `RESEND_API_KEY` | Server-only | Optional (for future email module) | Yes | API key for Resend email delivery. |

## Validation behavior

Environment validation is implemented in `lib/env.ts` using Zod:

- Public variables are validated with a dedicated public schema.
- Server variables are validated with a separate server schema.
- Production runtime boot enforces all future-critical server variables, including `APP_ENCRYPTION_KEY`. The Next.js static production build phase (`NEXT_PHASE=phase-production-build`) skips runtime-only presence checks so build artifacts can be created before secrets are injected.
- Development mode allows future-only variables to be unset to avoid blocking local work. Production API routes that would otherwise fall back to mock data now fail fast when required persistent services are missing.

App-level config is exposed through `lib/config/app.ts` for safe imports in server modules.

## Local setup

1. Copy the template file:
   ```bash
   cp .env.example .env.local
   ```
2. Keep placeholders for future modules if you are only working on current setup.
3. Start the app:
   ```bash
   npm run dev
   ```

## Production setup notes

- Configure all listed server variables in your deployment platform secret manager.
- Generate `APP_ENCRYPTION_KEY` with one of these commands and store the exact single-line output as the production secret:
  ```bash
  openssl rand -base64 32
  ```
  or, if OpenSSL is unavailable:
  ```bash
  node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
  ```
- Do not rely on `.env` files committed in git for production.
- Rotate secrets regularly and immediately on suspected leakage.
- Enforce CI checks (`npm run lint`, `npm run typecheck`, `npm run build`, `npm run check`) before deployment.

## Security notes

- Never expose server-only keys in `NEXT_PUBLIC_*` variables.
- Never log raw secrets in server logs.
- Use distinct credentials per environment (dev/staging/prod).
- Restrict dashboard access to authorized operators only.
