# Local testing and validation guide

Use this guide to validate Sihati locally without real production providers.

## Prerequisites

- Node.js 22 LTS (`.nvmrc` contains `22`).
- npm 10 or newer.
- Docker Desktop or Docker Engine if testing with PostgreSQL in containers.

## Run locally without Docker

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Run locally with Docker

```bash
docker compose up --build app db
```

The Docker app container automatically generates Prisma client code, pushes the schema to PostgreSQL, and starts the Next.js dev server.

## Test commands

```bash
npm test
npm run test:watch
npm run test:coverage
npm run check
npm run build
```

- `npm test`: one-shot Vitest suite.
- `npm run test:watch`: watch mode for local development.
- `npm run test:coverage`: V8 coverage reports in `coverage/`.
- `npm run check`: ESLint, TypeScript, and tests.

## Current automated coverage

The suite covers:

- authentication demo-header helpers and production rejection,
- role permissions and appointment/video access rules,
- practitioner search service mapping and pagination,
- availability slot generation and available-slots query validation,
- appointment creation rules,
- notification service persistence and failure handling,
- admin service configuration validators and service safety,
- security helpers for API errors, origin checks, upload validation, and rate limiting,
- API route error envelopes for search, available slots, and admin service configuration.

## Test API routes manually

Demo header auth is enabled outside production only.

Practitioner search:

```bash
curl "http://localhost:3000/api/practitioners/search?q=sara&limit=5"
```

Available slots:

```bash
curl "http://localhost:3000/api/practitioners/prac_1/available-slots?reasonId=reason_general&startDate=2026-05-10&endDate=2026-05-20&consultationType=IN_PERSON&isPublic=true"
```

Admin service config:

```bash
curl -H "x-user-id: admin_1" -H "x-user-role: ADMIN" "http://localhost:3000/api/admin/service-config"
```

Appointment creation requires a patient demo identity and same-origin mutation protection:

```bash
curl -X POST "http://localhost:3000/api/appointments" \
  -H "content-type: application/json" \
  -H "origin: http://localhost:3000" \
  -H "x-user-id: patient_1" \
  -H "x-user-role: PATIENT" \
  -d '{"practitionerId":"prac_1","reasonId":"reason_general","consultationType":"IN_PERSON","startTime":"2026-05-20T10:00:00.000Z"}'
```

## Test notifications

Automated notification tests use an injected fake sender and repository. Local runtime email delivery is still a placeholder; in development, the console sender logs safe metadata rather than message secrets. To validate behavior, run `npm test -- tests/unit/services/notification.service.test.ts` and inspect application logs for placeholder notification output during booking flows.

## Test Stripe in test mode

Stripe checkout and webhook routes intentionally return `501` until verified integration is implemented. Use test-mode placeholder keys only. You can validate the current safety behavior with:

```bash
curl -X POST "http://localhost:3000/api/payments/checkout" \
  -H "origin: http://localhost:3000" \
  -H "x-user-id: patient_1" \
  -H "x-user-role: PATIENT"
```

Expected result: a structured `PAYMENTS_NOT_IMPLEMENTED` error. Do not add live Stripe keys to local files.

## Test video consultation flow

Video access rules are covered by unit tests. Locally, use a video appointment fixture or route flow and verify:

- patient owner can access a confirmed video appointment,
- assigned practitioner can access it,
- admins can access for support,
- cancelled appointments are denied,
- in-person appointments are denied for video consultation.

If Jitsi is embedded, browser permissions for camera and microphone must be allowed and CSP must allow `https://meet.jit.si` frames.

## Read logs

Host development:

```bash
npm run dev
```

Docker development:

```bash
docker compose logs -f app
docker compose logs -f db
```

API errors include an `x-request-id` response header. Match that value with server logs when debugging route failures.
