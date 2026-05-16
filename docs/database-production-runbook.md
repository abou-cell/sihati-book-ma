# Database Production Runbook

This runbook defines Sihati's Prisma/PostgreSQL migration, backup, rollback, restore-test, and seed-data procedures for local development, staging, and production. It exists because production deployments must use checked-in Prisma migrations and `prisma migrate deploy`; `prisma db push` is only acceptable for disposable local databases.

## Scope and source of truth

- Database engine: PostgreSQL, as configured by `provider = "postgresql"` in `prisma/schema.prisma`.
- ORM/migration tool: Prisma.
- Runtime connection: server-only `DATABASE_URL` environment variable.
- Schema source of truth: `prisma/schema.prisma` plus the checked-in `prisma/migrations/**` history once migrations are introduced.
- Deployment rule: production and staging run `npm run prisma:migrate:deploy` or `npx prisma migrate deploy`; never run `prisma db push` against shared environments.

> Current repository note: there is no `prisma/migrations` directory yet. Before the first staging or production release, create and review an initial migration from the current schema in development, commit it, and promote that exact migration through staging before production.

## Required package commands

Use these npm scripts so CI/CD logs are consistent:

```bash
npm run prisma:validate
npm run prisma:migrate:deploy
npm run prisma:studio
```

`npm run prisma:studio` is for local inspection only. Do not expose Prisma Studio from production networks.

## Environment and permissions

### `DATABASE_URL`

`DATABASE_URL` must be a PostgreSQL connection string that points at the intended database and schema, for example:

```env
DATABASE_URL=postgresql://sihati_app:<password>@<host>:5432/sihati?schema=public
```

Operational requirements:

- Store production and staging values in the platform secret manager, not in Git.
- Use TLS for managed databases when required by the provider.
- Prefer two database roles:
  - **Application role**: read/write application tables at runtime.
  - **Migration role**: allowed to create/alter/drop schema objects and update Prisma migration metadata.
- Run migrations from a single release job, not from every application replica.

## Local development migration workflow

Use this workflow for schema changes intended to ship:

1. Start a local PostgreSQL database, for example with Docker Compose:

   ```bash
   docker compose up -d db
   ```

2. Set local `DATABASE_URL` to the Docker database or copy `.env.example` to `.env.local` and adjust it.
3. Edit `prisma/schema.prisma`.
4. Validate the schema:

   ```bash
   npm run prisma:validate
   ```

5. Create and apply a development migration with a descriptive name:

   ```bash
   npx prisma migrate dev --name <short_snake_case_change>
   ```

6. Review the generated SQL under `prisma/migrations/<timestamp>_<name>/migration.sql` before committing.
7. Regenerate Prisma Client if needed:

   ```bash
   npx prisma generate
   ```

8. Run application checks:

   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```

9. Commit `prisma/schema.prisma`, `prisma/migrations/**`, and any code changes together.

Local-only exceptions:

- `npx prisma db push` may be used only for disposable local prototyping when no migration is meant to be committed.
- If `db push` was used during exploration, reset the local database and create a real migration with `migrate dev` before opening a production-bound pull request.

## Staging migration workflow

Staging is the rehearsal for production and must use production-like deployment steps.

1. Confirm the migration has been reviewed in pull request, including the generated SQL.
2. Confirm staging `DATABASE_URL` points to staging, not production:

   ```bash
   node -e "const u=new URL(process.env.DATABASE_URL); console.log(u.host, u.pathname)"
   ```

3. Create a pre-migration staging backup or snapshot.
4. Install dependencies and generate Prisma Client:

   ```bash
   npm ci
   npx prisma generate
   ```

5. Apply checked-in migrations only:

   ```bash
   npm run prisma:migrate:deploy
   ```

6. Build and start the application artifact:

   ```bash
   npm run build
   npm run start
   ```

7. Run the post-migration smoke tests in this runbook.
8. Record migration name(s), deployment version, backup/snapshot ID, smoke-test results, and any anomalies in the release notes.
9. If staging fails, do not promote. Either restore staging and fix the migration locally, or add a forward-fix migration and rehearse again.

## Production migration workflow

Production migrations are release events and require an explicit go/no-go checkpoint.

### Pre-flight checklist

- [ ] Migration was created with `prisma migrate dev`, committed, code-reviewed, and successfully deployed to staging.
- [ ] Generated SQL was reviewed for locking, table rewrites, destructive changes, and long-running backfills.
- [ ] A rollback/forward-fix plan exists for this specific release.
- [ ] A fresh backup/snapshot exists and its identifier is recorded.
- [ ] Restore permissions and operator contacts are confirmed.
- [ ] Application release artifact is ready and matches the commit tested in staging.
- [ ] Monitoring dashboards and logs are open.
- [ ] A maintenance window or low-traffic deployment window is approved when the migration can lock or rewrite large tables.

### Deployment steps

1. Put the release pipeline in single-migration-job mode so only one process runs Prisma migrations.
2. Confirm production database identity without printing credentials:

   ```bash
   node -e "const u=new URL(process.env.DATABASE_URL); console.log(u.host, u.pathname)"
   ```

3. Run a schema validation against the release artifact:

   ```bash
   npm run prisma:validate
   ```

4. Generate Prisma Client:

   ```bash
   npx prisma generate
   ```

5. Apply migrations:

   ```bash
   npm run prisma:migrate:deploy
   ```

6. Deploy or restart the application only after migrations succeed.
7. Run post-migration smoke tests.
8. Watch database CPU, locks, connection count, slow queries, application error rate, and payment/webhook errors until the release is stable.

Do not run `prisma migrate dev`, `prisma db push`, `prisma migrate reset`, or Prisma Studio against production.

## Pre-migration backup

### Managed PostgreSQL/RDS snapshot

Preferred for AWS RDS:

```bash
aws rds create-db-snapshot \
  --db-instance-identifier <prod-db-instance> \
  --db-snapshot-identifier sihati-prod-pre-migration-$(date -u +%Y%m%d%H%M%S)
```

Wait until the snapshot is available before migrating:

```bash
aws rds wait db-snapshot-available --db-snapshot-identifier <snapshot-id>
```

### Logical backup with `pg_dump`

Use this when snapshots are unavailable or as an additional logical backup:

```bash
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="sihati-pre-migration-$(date -u +%Y%m%d%H%M%S).dump"
```

Backup handling requirements:

- Encrypt backups at rest.
- Store them in an access-controlled backup bucket or managed backup service.
- Record backup location, timestamp, database name, migration name, and operator.
- Follow privacy/compliance retention requirements because backups can contain protected health information.

## Post-migration smoke tests

Run these after staging and production migrations. Use staging-safe or production-safe test accounts/data; do not create real patient appointments in production unless the account and data are explicitly approved for smoke testing.

1. Health and read-only API checks:

   ```bash
   curl -fsS "$NEXT_PUBLIC_APP_URL/api/practitioners/search?city=Casablanca"
   ```

2. Practitioner slot lookup for a known test practitioner:

   ```bash
   curl -fsS "$NEXT_PUBLIC_APP_URL/api/practitioners/<id>/available-slots?date=<yyyy-mm-dd>&type=IN_PERSON"
   ```

3. Authenticated protected-flow smoke tests using a test account/session:
   - Patient dashboard loads without database errors.
   - Appointment creation validation rejects invalid payloads safely.
   - Practitioner/admin protected routes enforce role checks.

4. Payment safety checks when Stripe is enabled:
   - Checkout route rejects unauthenticated requests.
   - Webhook route rejects invalid signatures.
   - No unexpected `FAILED`/`EXPIRED` spikes appear after deploy.

5. Operational checks:
   - Application logs contain no Prisma migration/runtime errors.
   - Database reports expected migration rows in `_prisma_migrations`.
   - Error rate, slow queries, lock waits, and connection count remain within the release threshold.

## Rollback and forward-fix strategy

Prisma migrations are designed to move forward. The default production response to a bad migration is a forward fix, not editing or deleting an already-applied migration.

### Prefer forward fixes when data is intact

Use a forward-fix migration when:

- The migration applied successfully but application behavior is wrong.
- A column/index/constraint needs adjustment.
- Data remains intact and the application can be repaired by another migration or code change.

Forward-fix steps:

1. Disable or roll back the application feature flag/release if possible.
2. Create a new migration locally with `npx prisma migrate dev --name forward_fix_<issue>`.
3. Review generated SQL and test against a restored staging copy.
4. Deploy the new migration with `npm run prisma:migrate:deploy`.
5. Re-run smoke tests and monitoring checks.

### Restore from backup only for severe cases

Restore from backup when:

- Data was corrupted or deleted.
- The database cannot serve critical traffic.
- A failed migration leaves the schema in an unrecoverable state and a forward fix is unsafe.

Restore tradeoff: restoring a snapshot rolls the database back to the backup timestamp and can lose writes after that point. Before restoring, decide whether point-in-time recovery, logical data repair, or provider-assisted recovery can preserve more data.

### Prisma migration metadata

Do not manually edit `_prisma_migrations` in production unless Prisma support/provider guidance and a written incident plan require it. If a migration failed partway, inspect status with:

```bash
npx prisma migrate status
```

Use `npx prisma migrate resolve` only when the database state has been manually verified and the command is part of an approved incident procedure.

## Restore test procedure

Run restore drills before launch and at least quarterly, plus after major schema changes.

1. Choose a recent staging backup or sanitized production backup/snapshot.
2. Restore it into an isolated staging/restore-test database that cannot send emails, SMS, push notifications, Stripe calls, or webhooks.
3. Set `DATABASE_URL` to the restored database.
4. Verify the restored database identity:

   ```bash
   node -e "const u=new URL(process.env.DATABASE_URL); console.log(u.host, u.pathname)"
   ```

5. Apply pending migrations if the backup predates the current release:

   ```bash
   npm run prisma:migrate:deploy
   ```

6. Run smoke tests and selected service tests against the restored database.
7. Validate representative records:
   - Users, practitioners, availability rules, appointments, payments, notifications, medical-document metadata, and service configuration rows are present as expected.
   - Sensitive integrations remain disabled or pointed at sandbox providers.
8. Document:
   - Backup/snapshot ID.
   - Restore start/end time and recovery duration.
   - Commands used.
   - Migration version before/after restore.
   - Smoke-test results.
   - Any data or permission issues found.

## Seed data policy

- Production seed data must be minimal, deterministic, reviewed, and safe to re-run.
- Do not seed demo patients, fake medical records, real-looking PHI, payment records, or test credentials into production.
- Seed only required reference/configuration data, such as safe practitioner specialties or feature configuration, when the application cannot start without it.
- Keep local demo seeds separate from production seeds. Local seeds may create fake practitioners and appointments only in local or disposable databases.
- The repository currently has no `prisma/seed.ts`; adding seed support must include separate local/staging/production behavior and clear idempotency.
- Never run local/demo seed commands against staging or production.

## Zero-downtime considerations

Use expand-and-contract changes for live systems:

1. **Expand**: add nullable columns, new tables, or backward-compatible indexes first.
2. **Dual support**: deploy code that can read/write both old and new shapes when needed.
3. **Backfill**: run batch backfills separately from request traffic for large data changes.
4. **Constrain**: add `NOT NULL`, uniqueness, and foreign-key constraints only after data is valid.
5. **Contract**: remove old columns/tables in a later release after all code no longer uses them.

Additional guidance:

- Avoid long transactions and large table rewrites during peak hours.
- Create indexes in a low-traffic window; for very large tables, use PostgreSQL concurrent indexes through reviewed raw SQL when Prisma-generated SQL would lock writes too long.
- Do not combine risky data backfills with application deploys unless the backfill is small and reversible.
- Make application code backward compatible with the currently deployed schema and the next schema during rolling deploys.
- Keep one migration job per release; app replicas should start only after migrations finish.

## Incident log template

Use this template for migration and restore events:

```text
Date/time UTC:
Environment:
Release commit:
Migration(s):
Operator(s):
Pre-migration backup/snapshot ID:
Commands run:
Smoke tests run:
Result:
Follow-up actions:
```
