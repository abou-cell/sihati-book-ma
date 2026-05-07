# Debugging and maintenance guide

## Common local errors and fixes

### Unsupported Node engine

Use Node 22 LTS. The project declares `node >=22.12.0`. Docker already uses Node 22.

### Missing environment variables

Copy `.env.example` to `.env.local` for host development. Production runtime requires real values for database, auth, encryption, Stripe, and email settings. Generate encryption keys with:

```bash
openssl rand -base64 32
```

### Invalid `APP_ENCRYPTION_KEY`

The key must be base64 encoded and decode to at least 32 bytes. Do not wrap it in quotes in env files unless your platform requires quotes.

## Database troubleshooting

### Cannot connect to PostgreSQL

Check `DATABASE_URL`, confirm the database is running, and inspect logs:

```bash
docker compose ps
docker compose logs db
```

### Schema is missing tables

During local Docker development, the app runs `npx prisma db push`. On host machines, run the same command after changing `prisma/schema.prisma`. For production, use committed migrations and `npx prisma migrate deploy`.

### Need a clean local database

```bash
docker compose down -v
docker compose up --build app db
```

## Docker troubleshooting

### App container exits during build

Run the same quality gate on the host or inside the dev container:

```bash
npm run check
npm run build
```

### Hot reload does not update

Restart the app container and clear the named Next.js cache volume if needed:

```bash
docker compose down
docker volume rm sihati_next-cache
```

## CORS and origin issues

Mutating API routes enforce same-origin checks when an `Origin` header is present. For local requests, use:

```text
Origin: http://localhost:3000
```

Cross-site origins return `INVALID_ORIGIN`. If a browser request fails, confirm `NEXT_PUBLIC_APP_URL` exactly matches the local origin including protocol and port.

## WebRTC and Jitsi issues

- Use HTTPS in production for camera and microphone permissions.
- Allow browser camera and microphone permissions.
- Keep `frame-src https://meet.jit.si` in CSP when Jitsi is used.
- Check corporate firewalls/VPNs if media connects locally but fails on another network.
- Confirm only confirmed video appointments are allowed into consultation rooms.

## Stripe issues

- Use `sk_test_...` and Stripe CLI test webhooks locally only after the integration is implemented.
- Current checkout and webhook route handlers intentionally return `501` safety errors.
- Never commit live Stripe keys.
- Confirm webhook signing secrets begin with `whsec_` when real verification is added.

## Notification issues

- Current development email behavior is placeholder logging.
- Automated tests inject a fake sender and verify persistence status.
- When a real provider is added, keep tests provider-free by mocking the sender and add separate provider contract tests with test credentials only.

## API route debugging

- Inspect HTTP status and JSON error `code` first.
- Capture the `x-request-id` response header.
- Check server logs around that request ID.
- Validation failures return `VALIDATION_ERROR` with flattened field errors.
- Auth failures return `UNAUTHENTICATED` or `ACCESS_DENIED`.

## Maintenance checklist

Before merging stabilization changes:

```bash
npm ci
npm run check
npm run test:coverage
npm run build
```

Keep tests deterministic, avoid live provider credentials, and prefer service-level tests plus small route-handler tests for API contracts.
