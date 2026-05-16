# Docker local development

This repository includes a practical Docker setup for local development and production-like build validation.

## Services

- `app`: Next.js development container with hot reload.
- `db`: PostgreSQL 16 with a persistent named volume (`postgres-data`).
- `app-prod`: optional production-like standalone Next.js container enabled with the `prod` profile.

## Start the development stack

```bash
docker compose up --build app db
```

The development container runs:

```bash
npx prisma generate && npx prisma db push && npm run dev
```

This keeps the local PostgreSQL schema aligned with `prisma/schema.prisma` for disposable Docker development. For schema changes intended to ship, create checked-in migrations with `npx prisma migrate dev --name <change>` and follow `docs/database-production-runbook.md`.

## Environment variables

`docker-compose.yml` defines safe local placeholders for the variables the app validates:

- `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `DATABASE_URL=postgresql://postgres:postgres@db:5432/sihati`
- `AUTH_SECRET`
- `APP_ENCRYPTION_KEY`
- Stripe, email, and notification placeholders

For local overrides, either edit a temporary compose override file or pass variables in the shell before `docker compose up`. Do not commit real secrets.

## Persistent database volume

PostgreSQL data is stored in the `postgres-data` named volume. To reset the Docker database completely:

```bash
docker compose down -v
```

Then start the stack again so `prisma db push` recreates the schema.

## Production-like build mode

Build and run the standalone image with:

```bash
docker compose --profile prod up --build app-prod db
```

This mode uses the `runner` Dockerfile target and starts `node server.js` from Next.js standalone output. It is intended for local image validation, not AWS deployment.

## Logs

```bash
docker compose logs -f app
docker compose logs -f db
docker compose logs -f app-prod
```

Use app logs for Next.js route errors and db logs for PostgreSQL readiness, authentication, and connection errors.

## Troubleshooting

### Port already in use

Change the host port mapping in `docker-compose.yml`, for example `3001:3000`, or stop the process using the port.

### Database is not ready

The app waits for the PostgreSQL healthcheck. If startup still fails, inspect:

```bash
docker compose ps
docker compose logs db
```

### Prisma schema drift during stabilization

Run:

```bash
docker compose exec app npx prisma db push
```

For staging and production releases, replace `db push` with checked-in Prisma migrations and `npm run prisma:migrate:deploy` as described in `docs/database-production-runbook.md`.

### Environment variable failures

Confirm all required values exist in the container:

```bash
docker compose exec app env | sort
```

Production mode validates stricter runtime secrets. Local placeholder values are only for development.

### Node version mismatches

The Docker image uses Node 22. If host commands fail with engine warnings, switch your local Node version to `22` before running npm scripts outside Docker.
