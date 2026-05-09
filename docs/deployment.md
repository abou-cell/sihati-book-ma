# Deployment

## Essentials

Use Node.js 22 LTS (`>=22.12.0`) and npm `>=10` in deployment environments. Install dependencies with `npm ci` so deployments match CI and the lockfile.

1. Set production environment variables (`DATABASE_URL`, `AUTH_SECRET`, `APP_ENCRYPTION_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `EMAIL_FROM`, `RESEND_API_KEY`, shared Redis/Upstash rate-limit credentials, and `MEDICAL_DOCUMENTS_SIGNING_SECRET`).
2. Generate Prisma client: `npx prisma generate`.
3. Run database migrations: `npx prisma migrate deploy`.
4. Build app: `npm run build`.
5. Start app: `npm run start`.

## CI/CD release gates

The GitHub Actions `CI` workflow is the required pre-merge and pre-deploy release gate. It runs on pull requests and pushes to `main` with Node.js `22.12.0`, matching the project engine floor. Each gate is isolated in its own job for clear diagnostics:

- Install/cache warm-up with `npm ci`.
- `npm run lint`.
- `npm run typecheck`.
- `npm test` for unit and API coverage, plus the targeted production environment validation regression tests.
- `npm run build` using safe, non-secret CI placeholder environment values.
- `npm run audit:prod` (`npm audit --audit-level=moderate`).
- `npx prisma validate`.
- Markdown link checking when a supported npm script is configured.
- Docker image build and container smoke run when `Dockerfile` exists.

Production-critical environment validation must not be bypassed at runtime. The CI test gate must continue to fail if required production variables can be omitted outside the Next.js static production build phase. The GitHub Pages deployment workflow runs only after the `CI` workflow succeeds on `main`, preventing deploys that have not passed the release gates.

## Health checks

- `/api/practitioners/search`
- `/api/practitioners/{id}/available-slots`
- `/api/appointments`
- `/api/payments/checkout`
- `/api/stripe/webhook`
