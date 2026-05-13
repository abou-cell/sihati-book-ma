# Deployment

## Essentials

Use Node.js 22 LTS (`>=22.12.0`) and npm `>=10` in deployment environments. Install dependencies with `npm ci` so deployments match CI and the lockfile.

1. Set production environment variables (`DATABASE_URL`, `AUTH_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).
2. Generate Prisma client: `npx prisma generate`.
3. Run database migrations: `npx prisma migrate deploy`.
4. Build app: `npm run build`.
5. Start app: `npm run start`.


## CI/CD release gates

Production deploys must only proceed from commits that have passed the GitHub Actions workflow in `.github/workflows/ci.yml`. The workflow runs on pull requests and pushes to `main`, uses Node.js from `.nvmrc` (`>=22.12.0` per `package.json`), and exposes only non-secret placeholders needed for deterministic CI builds.

Required gates are split into separate jobs:

1. `install-cache` installs with `npm ci` and warms the npm cache.
2. `lint` runs `npm run lint`.
3. `typecheck` runs `npm run typecheck`.
4. `tests` runs `npm test` for unit/API coverage with provider credentials empty.
5. `production-env-validation` runs the environment-validation regression tests and fails if `NEXT_PHASE` is manually preset to bypass runtime checks.
6. `prisma-validate` runs `npx prisma validate`.
7. `build` runs `npm run build` with CI placeholders, while preventing a manually supplied static-build bypass.
8. `audit` runs `npm run audit:prod` (`npm audit --audit-level=moderate`).
9. `markdown-link-check` runs a configured markdown link-check npm script when present.
10. `docker-build` builds the production `runner` image when `Dockerfile` exists.
11. `release-gate` blocks the workflow if any required job fails.

Do not add secrets to the workflow file. Replace the CI placeholders with real values only in the production secret manager or deployment platform, and keep branch protection/deployment rules configured so merges and deploys require the `release-gate` status to pass.

## Health checks

- `/api/practitioners/search`
- `/api/practitioners/{id}/available-slots`
- `/api/appointments`
- `/api/payments/checkout`
- `/api/stripe/webhook`
