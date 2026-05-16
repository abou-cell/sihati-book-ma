# Deployment

## Essentials

Use Node.js 22 LTS (`>=22.12.0`) and npm `>=10` in deployment environments. Install dependencies with `npm ci` so deployments match CI and the lockfile.

1. Set production environment variables (`DATABASE_URL`, `AUTH_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).
2. Generate Prisma client: `npx prisma generate`.
3. Run database migrations: `npm run prisma:migrate:deploy` (equivalent to `npx prisma migrate deploy`). Follow `docs/database-production-runbook.md` for backups, smoke tests, rollback/forward-fix, and restore drills.
4. Build app: `npm run build`.
5. Start app: `npm run start`.

## Health checks

- `/api/practitioners/search`
- `/api/practitioners/{id}/available-slots`
- `/api/appointments`
- `/api/payments/checkout`
- `/api/stripe/webhook`
