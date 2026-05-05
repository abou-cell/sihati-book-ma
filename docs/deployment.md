# Deployment

## Essentials

1. Set production environment variables (`DATABASE_URL`, `AUTH_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).
2. Generate Prisma client: `npx prisma generate`.
3. Run database migrations: `npx prisma migrate deploy`.
4. Build app: `npm run build`.
5. Start app: `npm run start`.

## Health checks

- `/api/practitioners/search`
- `/api/practitioners/{id}/available-slots`
- `/api/appointments`
- `/api/payments/checkout`
- `/api/stripe/webhook`
