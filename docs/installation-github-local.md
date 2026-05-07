# GitHub and Local Installation Guide

This guide explains how to clone Sihati, configure the local environment, run the app, visualize the UI locally, and execute checks before contributing or deploying.

## 1. Prerequisites

Install the following tools:

- Git.
- Node.js 22 LTS, minimum `22.12.0`.
- npm 10 or newer.
- Docker Desktop or Docker Engine, optional but recommended for local PostgreSQL.
- A code editor such as VS Code.

Verify local versions:

```bash
git --version
node --version
npm --version
```

## 2. Clone the repository

```bash
git clone <repository-url> sihati
cd sihati
```

If you already cloned the repository:

```bash
git status
git pull --ff-only
```

## 3. Install dependencies

Use `npm ci` for reproducible installs from `package-lock.json`:

```bash
npm ci
```

Use `npm install` only when intentionally updating dependencies.

## 4. Configure environment variables

Create a local environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` for local development. Safe local defaults are already documented in `.env.example`.

Minimum local configuration:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sihati
AUTH_SECRET=dev_only_change_me_to_a_very_long_secret_key
APP_ENCRYPTION_KEY=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
```

Important rules:

- Never commit `.env.local`.
- Only `NEXT_PUBLIC_*` variables are safe for browser exposure.
- Replace placeholder secrets before any production deployment.
- Generate a real app encryption key with `openssl rand -base64 32`.

## 5. Database options for local development

### Option A: Run PostgreSQL with Docker Compose

```bash
docker compose up -d db
npx prisma generate
npx prisma db push
```

This is the simplest local path for developers who need database-backed flows.

### Option B: Run the full Docker development stack

```bash
docker compose up --build app db
```

The app container runs Prisma generation, pushes the schema to the local database, and starts the Next.js dev server.

### Option C: Use an existing PostgreSQL instance

Set `DATABASE_URL` in `.env.local`, then run:

```bash
npx prisma generate
npx prisma db push
```

## 6. Run frontend/backend locally

Sihati uses Next.js, so the local frontend and API routes run through one development server:

```bash
npm run dev
```

Open the app:

```text
http://localhost:3000
```

Useful local routes:

- Home: `http://localhost:3000/`
- Search: `http://localhost:3000/search`
- Admin service configuration: `http://localhost:3000/admin/service-config`
- Patient dashboard: `http://localhost:3000/dashboard/patient`
- Practitioner dashboard: `http://localhost:3000/dashboard/practitioner`

Protected routes currently require development-only demo headers. Browser navigation without a production auth provider may redirect to access denied. Use tests or API clients with demo headers for protected route validation until production auth is integrated.

## 7. Visualize the UI locally

1. Start the dev server with `npm run dev`.
2. Open `http://localhost:3000` in a browser.
3. Inspect public pages first: home, search, specialties, and practitioner profiles.
4. For protected areas, use the future production auth provider when configured. During MVP stabilization, demo header auth is not designed for normal browser login.

Do not redesign UI styles during stabilization. UI validation should focus on regressions, broken layouts, missing data states, and accessibility issues.

## 8. Run checks and tests

Recommended pre-commit/pre-deploy command:

```bash
npm run check
```

Individual commands:

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
```

Database commands:

```bash
npx prisma generate
npx prisma validate
npx prisma db push
```

Production deployment should use migrations:

```bash
npx prisma migrate deploy
```

## 9. Common setup issues

### Node version mismatch

Symptoms:

- npm engine warnings.
- Next.js or TypeScript command failures.

Fix:

```bash
node --version
```

Install/use Node.js 22 LTS.

### Dependency install fails

Fixes:

```bash
rm -rf node_modules
npm ci
```

If the lockfile changed unexpectedly, restore it unless dependency updates are intentional.

### `.env.local` missing or invalid

Symptoms:

- Environment validation errors from `lib/env.ts`.
- Production startup fails due to missing required variables.

Fix:

```bash
cp .env.example .env.local
```

Then provide valid local values.

### Prisma cannot connect

Symptoms:

- `P1001` database connection errors.
- `ECONNREFUSED` connecting to PostgreSQL.

Fix:

```bash
docker compose ps
docker compose logs db
npx prisma validate
```

Confirm `DATABASE_URL` points to the right host. Use `localhost` from the host machine and `db` from Docker containers.

### Port 3000 is already in use

Fix:

```bash
lsof -i :3000
```

Stop the conflicting process or run Next.js on another port:

```bash
npm run dev -- -p 3001
```

### Protected route redirects to access denied

This is expected until production auth is integrated. The current demo-header session adapter is non-production and not a complete browser login system.

## 10. Local development checklist

- [ ] Dependencies installed with `npm ci`.
- [ ] `.env.local` created from `.env.example`.
- [ ] Database running if database-backed routes are being tested.
- [ ] Prisma client generated.
- [ ] `npm run dev` starts successfully.
- [ ] Public UI loads at `http://localhost:3000`.
- [ ] `npm run check` passes before commit.
