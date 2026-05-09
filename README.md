# Sihati

Sihati is a Moroccan medical appointment booking platform built with Next.js and TypeScript.

## Documentation package

The repository now includes a complete technical, deployment, and operations documentation package for final stabilization and production preparation. Start with the architecture and checklist documents, then use the environment-specific guides for setup and deployment.

### Core production-readiness documents

- [Technical architecture](docs/technical-architecture.md) — global architecture, frontend/backend layering, auth/RBAC, data flow, service configuration flow, environment variables, folder structure, and Mermaid diagrams.
- [GitHub/local installation guide](docs/installation-github-local.md) — clone, dependency installation, `.env.local` setup, local frontend/API startup, UI visualization, checks, tests, and common setup issues.
- [Firebase Auth guide](docs/firebase-auth-guide.md) — production Firebase Auth usage, provider setup, frontend/backend configuration, security rules, user management, and migration from demo-header auth.
- [AWS deployment guide](docs/aws-deployment.md) — EC2, S3, CloudFront, RDS, Route53, load balancing, HTTPS, DNS, environment variables, server security, backups, monitoring, and deployment checklist.
- [Database options](docs/database-options.md) — AWS RDS PostgreSQL/MySQL, Supabase PostgreSQL, and SQL Server setup and compatibility notes.
- [Debugging and maintenance](docs/debugging-maintenance.md) — logs, common errors, Docker, Firebase, CORS, deployments, database errors, WebRTC/Jitsi, Stripe, diagnostics, and recovery procedures.
- [Production checklist](docs/production-checklist.md) — frontend/backend optimization, bundle size, images, cache, secrets, SEO, HTTPS, backups, monitoring, scalability, auth/database gates, and smoke tests.

### Existing stabilization documents

- [Security hardening guide](docs/security.md)
- [Authentication and authorization](docs/authentication.md)
- [Admin-managed service configuration](docs/service-configuration.md)
- [Stripe payments](docs/payments.md)
- [Testing guide](docs/testing.md)
- [Local validation guide](docs/local-testing.md)
- [Docker guide](docs/docker.md)
- [Deployment essentials](docs/deployment.md)
- [Database integration](docs/database-integration.md)
- [Configuration guide](docs/configuration.md)
- [Final audit report](docs/final-audit-report.md)
- [Final production readiness report](docs/final-production-readiness-report.md)
- [Completion roadmap](docs/completion-roadmap.md)

## Production readiness

Sihati is in final stabilization. Production deployment must preserve the current UI style and avoid unrelated product expansion while hardening security, deployment operations, testing discipline, and maintainability.

Minimum release gates before production:

- Replace development-only demo-header auth with a server-verified production auth provider such as Firebase Auth, signed session cookies, or JWT verification.
- Keep current-user lookup, role checks, ownership checks, and permission logic centralized in `lib/auth/` and `lib/security/`.
- Deploy the database with reviewed Prisma migrations and a tested backup/restore plan.
- Store secrets in deployment secret management, never in Git or browser-exposed variables.
- Enforce HTTPS, production DNS, provider webhook URLs, and secure cookie settings when sessions are implemented.
- Run and pass `npm run prod:check` in CI before deployment, or run its lint, typecheck, test, build, and audit stages separately for clearer failure diagnostics.
- Configure monitoring, logs, alerts, and documented recovery procedures.


## Environment configuration

Runtime environment validation is implemented with Zod in `lib/env.ts`, and app configuration is centralized in `lib/config/app.ts`.

### Environment variable table

| Variable | Scope | Required in development | Required in production | Description |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public | Yes | Yes | Public base URL for browser and server usage. |
| `DATABASE_URL` | Server-only | Optional now | Yes | Database connection string for backend modules. |
| `AUTH_SECRET` | Server-only | Optional now | Yes | Secret used for auth signing/encryption (future module). |
| `APP_ENCRYPTION_KEY` | Server-only | Optional now | Yes | Base64-encoded 32-byte key for production encryption of sensitive application data. |
| `STRIPE_SECRET_KEY` | Server-only | Optional for non-payment local work | Yes | Stripe secret key used only server-side to create Checkout Sessions. |
| `STRIPE_WEBHOOK_SECRET` | Server-only | Optional for non-payment local work | Yes | Stripe webhook signing secret used to verify raw webhook payloads. |
| `EMAIL_FROM` | Server-only | Optional now | Yes | Default sender address (future email module). |
| `RESEND_API_KEY` | Server-only | Optional now | Yes | Resend API key (future email module). |


## Security and authentication status

Sihati is in final stabilization and now centralizes authentication and authorization through `lib/auth/current-user.ts`, `lib/auth/session.ts`, `lib/auth/permissions.ts`, and `lib/security/access-control.ts`. The current MVP auth adapter accepts demo headers only outside production and documents them as non-production. Protected API routes and protected server pages must use the central helpers rather than reading identity headers directly.

Security documentation:

- [Security hardening guide](docs/security.md)
- [Authentication and authorization](docs/authentication.md)
- [Admin-managed service configuration](docs/service-configuration.md)
- [Stripe payments](docs/payments.md)

Production readiness requirements before release:

- Replace demo-header auth with Firebase Auth verification, signed session cookies, or JWT verification.
- Keep current-user lookup centralized in `lib/auth/current-user.ts`.
- Keep patient data scoped to the owning patient, assigned practitioner, or admin.
- Replace in-memory rate limiting with a shared store such as Redis, Upstash, or an edge/WAF limiter.
- Add integration tests for every protected route and API permission path.


## Admin-managed external service configuration

External provider settings are managed through an admin-only configuration foundation. The server stores non-sensitive metadata plainly, encrypts secret bags with `APP_ENCRYPTION_KEY`, returns only masked secret previews to the admin UI, and logs sanitized update attempts. The supported records are Stripe, Cloudflare Stream/WebRTC, Firebase, SMTP, SMS provider, push notifications, cloud storage, Google OAuth, and Facebook OAuth.

- Admin UI: `/admin/service-config`
- Admin API: `/api/admin/service-config`
- Documentation: [`docs/service-configuration.md`](docs/service-configuration.md)

This module only manages configuration. Provider flows such as payments, video provisioning, SMS delivery, push delivery, storage operations, and OAuth login remain separate follow-up integrations.

## Local setup

1. Install Node.js 22 LTS (minimum 22.12.0; see `.nvmrc`).
2. Install dependencies:
   ```bash
   npm ci
   ```
3. Create local env file:
   ```bash
   cp .env.example .env.local
   ```
4. Start development server:
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` — run local development server.
- `npm run build` — create production build.
- `npm run start` — run production server.
- `npm run lint` — run ESLint.
- `npm run typecheck` — run TypeScript checks.
- `npm run check` — run lint, typecheck, and the Vitest suite (recommended pre-commit/pre-deploy).
- `npm test` — run the Vitest unit/API test suite once.
- `npm run test:watch` — run Vitest in watch mode for local development.
- `npm run test:coverage` — run Vitest with V8 coverage reports in `coverage/`.

## Test foundation and CI gate

Automated behavioral tests are now configured with Vitest. The current foundation covers deterministic unit/API tests for validators, auth/session helpers, role permissions, security error contracts, provider-free services, availability slot generation, and mocked notification delivery.

- Test config: `vitest.config.ts`
- Test files: `tests/**/*.test.ts`
- Testing guide: [`docs/testing.md`](docs/testing.md)
- Local validation guide: [`docs/local-testing.md`](docs/local-testing.md)
- Docker guide: [`docs/docker.md`](docs/docker.md)
- Debugging and maintenance guide: [`docs/debugging-maintenance.md`](docs/debugging-maintenance.md)
- CI workflow: `.github/workflows/ci.yml`

The CI quality gate runs:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Tests must not require real Stripe, Firebase, SMTP/Resend, Cloudflare credentials, or a production database. Use mocks, in-memory repositories, fake timers, and local fixtures for all provider-facing behavior until dedicated test providers or a test database are explicitly configured. Docker Compose provides an optional local PostgreSQL container for manual validation and future repository integration tests.

## Docker local development

Start the application and PostgreSQL locally with Docker:

```bash
docker compose up --build app db
```

The development container runs Prisma client generation, pushes the local schema to PostgreSQL, and starts `next dev` with hot reload. For a production-like standalone image, run:

```bash
docker compose --profile prod up --build app-prod db
```

See [`docs/docker.md`](docs/docker.md) for environment variables, persistent volumes, logs, and troubleshooting.

## Practitioner search API

### Endpoint

`GET /api/practitioners/search`

### Query parameters

- `q`: text search across practitioner name, specialty, clinic, and city.
- `specialty`: exact specialty filter.
- `city`: exact city filter.
- `video`: `true`/`false` to filter practitioners who accept video consultation.
- `availableToday`: `true`/`false` to filter by same-day availability.
- `minPrice`: minimum consultation fee.
- `maxPrice`: maximum consultation fee.
- `sort`: one of `nextAvailable`, `priceAsc`, `priceDesc`.
- `page`: page number (minimum `1`).
- `limit`: page size (minimum `1`, maximum `50`).

### Example requests

- `/api/practitioners/search?q=cardio&city=Rabat`
- `/api/practitioners/search?specialty=Dermatology&video=true&sort=priceAsc&page=1&limit=10`
- `/api/practitioners/search?minPrice=200&maxPrice=500&availableToday=true`

### Response shape

```json
{
  "data": [
    {
      "id": "p_1",
      "slug": "dr-sara-alaoui",
      "name": "Dr. Sara Alaoui",
      "specialty": "Dermatology",
      "city": "Casablanca",
      "address": "Maarif Center, Casablanca",
      "consultationFee": 300,
      "videoConsultationFee": 250,
      "acceptsVideoConsultation": true,
      "isVerified": true,
      "nextAvailableSlot": "2026-05-06T09:00:00.000Z",
      "ratingAverage": 4.8,
      "reviewsCount": 128
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```


## Practitioner available slots API

### Endpoint

`GET /api/practitioners/[id]/available-slots`

### Query parameters

- `reasonId` (required): consultation reason id.
- `startDate` (required): `YYYY-MM-DD`.
- `endDate` (required): `YYYY-MM-DD`.
- `consultationType` (required): `IN_PERSON` or `VIDEO`.
- `isPublic` (optional, default `true`): when `true`, unverified practitioners are blocked.

### Example request

`/api/practitioners/p_1/available-slots?reasonId=reason_general&startDate=2026-05-10&endDate=2026-05-20&consultationType=IN_PERSON`

### Example response

```json
{
  "data": [
    {
      "date": "2026-05-11",
      "slots": [
        {
          "startTime": "2026-05-11T09:30:00.000Z",
          "endTime": "2026-05-11T10:00:00.000Z",
          "consultationType": "IN_PERSON"
        }
      ]
    }
  ]
}
```

### Validation and business rules

- Query validation is enforced with Zod and returns structured `400` errors.
- `endDate` must be on or after `startDate`.
- Requested date range is limited to a maximum of **30 days**.
- `consultationType` must be one of `IN_PERSON` or `VIDEO`.
- Slot generation uses `AvailabilityService` and excludes:
  - blocked dates,
  - confirmed appointments,
  - pending appointments that can block payment flow,
  - past time slots.
- Public access (`isPublic=true`) is denied for unverified practitioners.

## Testing and quality best practices

- Run `npm run check` before every commit.
- Add unit/integration tests for API modules (`validators`, `services`, route handlers) as features are introduced.
- Gate deployments through CI using lint, typecheck, tests, and build.
- Keep API response contracts versioned and covered by automated tests before release.

## Deployment notes

- Configure all production-required variables via your platform secret manager.
- Generate `APP_ENCRYPTION_KEY` with `openssl rand -base64 32` and store the exact output in your production secret manager.
- In production runtime, startup validation fails when required server secrets, including `APP_ENCRYPTION_KEY`, are missing. The Next.js static production build phase is allowed to complete without runtime-only secrets so CI/CD can build artifacts before injecting production secrets at runtime.
- Rotate secrets regularly and separate credentials across dev/staging/prod.
- Deploy behind HTTPS, enable structured request logging, and monitor 4xx/5xx rates for API reliability.

## Security notes

- Only `NEXT_PUBLIC_*` values may be exposed to client bundles.
- Keep server secrets out of source control and browser-accessible code.
- Never print raw secrets in logs or error responses.
- Validate all incoming API query input and enforce bounded pagination.

For deeper configuration details, see `docs/configuration.md`.

## Search page notes

- Route: `/search` (`app/(public)/search/page.tsx`).
- The page is client-rendered and keeps filter state synchronized with URL query parameters for shareable links and browser navigation consistency.
- Data source: `GET /api/practitioners/search`.
- Includes loading, empty, and error result states plus previous/next pagination controls.
- The **Book appointment** CTA links to `/practitioners/[slug]` profile pages, whose MVP booking CTAs now use the `/booking/new` URL contract with placeholder reason/start-time values.

### Filter behavior

- `q`: text search across practitioner name, specialty, clinic, and city.
- `specialty`: exact specialty filter (case-insensitive on backend).
- `city`: exact city filter (case-insensitive on backend).
- `video=true`: shows only practitioners that support video consultation.
- `availableToday=true`: shows only practitioners with a next available slot on current date.
- `minPrice` / `maxPrice`: bounded integer filtering for in-person consultation fee.
- `sort`: supports `nextAvailable`, `priceAsc`, and `priceDesc`.
- `page`: updated when paginating; reset to `1` when filters change.

## Practitioner availability module

### Availability logic

- Route: `/dashboard/practitioner/availability`.
- Practitioners can create and manage multiple availability rules.
- Each rule targets a single weekday and one consultation type (`IN_PERSON` or `VIDEO`).
- Rules can be toggled active/inactive without deletion.
- Practitioners can block specific dates that should not expose any slots.
- Input validation is centralized in `lib/validators/availability.ts`.

### Slot generation rules

Main service function: `getAvailableSlots(practitionerId, reasonId, dateRange, consultationType)`.

Generation pipeline:

1. Validate input payload (`practitionerId`, `reasonId`, date range, consultation type).
2. Load active availability rules for the practitioner and selected consultation type.
3. Load blocked dates for the same practitioner and date range.
4. Load existing appointments in range and exclude cancelled records.
5. Load consultation reason and use its `slotDurationMinutes`.
6. For each day in date range:
   - Skip blocked dates.
   - Match weekday rules.
   - Generate contiguous slots from `startTime` to `endTime`.
   - Remove slots overlapping break window (`breakStart`-`breakEnd`).
   - Remove past slots.
   - Remove already booked slots.
7. Return chronologically sorted available slots.

### Security notes for availability

- Always scope reads/writes by authenticated practitioner id (no cross-practitioner access).
- Never trust client-supplied practitioner ids without server-side ownership verification.
- Validate all rule and blocked-date payloads on the server before persistence.
- Exclude cancelled appointments only; pending/confirmed appointments must block slots.
- Keep slot generation and filtering in server-side service modules to prevent client tampering.

## Setup, testing, and deployment guidance (production)

### Setup

- Use Node.js 22 LTS (`>=22.12.0`) and npm `>=10`.
- Install dependencies via `npm ci`.
- Configure environment variables in `.env.local` (development) and your secret manager (staging/production).

### Testing strategy

- Minimum local gate before commit: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
- Add unit tests for:
  - availability validators
  - `getAvailableSlots` edge cases (breaks, blocked dates, booked slots, past slots)
- Add integration tests for authenticated practitioner ownership enforcement in availability routes.

### Deployment best practices

- Enforce CI stages: lint -> typecheck -> tests -> build.
- Deploy immutable builds and pin runtime Node version.
- Add structured logs and alerting for scheduling failures and abnormal slot-generation latency.
- Rotate secrets and audit access controls for practitioner scheduling data regularly.

## Appointment creation flow

### Route and files

- Booking confirmation page: `app/booking/new/page.tsx`
- Appointment validator: `lib/validators/appointment.ts`
- Appointment orchestration service: `lib/services/appointment.service.ts`
- API endpoint: `POST /api/appointments` in `app/api/appointments/route.ts`

### URL contract for booking page

`/booking/new?practitionerId=...&reasonId=...&consultationType=IN_PERSON|VIDEO&startTime=ISO_DATE`

The page reads all required parameters from the URL, renders practitioner/reason/date-time/price summaries, and asks user confirmation before creating the appointment.

### Appointment status rules

- `IN_PERSON` => appointment is created directly as `CONFIRMED`.
- `VIDEO` => appointment is created as `PENDING`; Stripe Checkout must be created server-side for the authenticated owner before the appointment can become `CONFIRMED`.

### API security and business rules

`POST /api/appointments` enforces:

- authenticated user headers present and role = `PATIENT`.
- practitioner must be verified before booking.
- consultation reason must belong to selected practitioner.
- `VIDEO` booking is blocked if reason is not video-enabled.
- start time must be a valid future ISO datetime.
- slot is re-checked for availability before creation.
- a second race-condition check is done right at insert time.

### Payment status rules

`POST /api/payments/checkout` requires a signed patient session, verifies appointment ownership, confirms the appointment is still `PENDING` and in the future, computes the price from the appointment reason on the server, creates a Stripe Checkout Session with `STRIPE_SECRET_KEY`, and stores a `Payment` row keyed by a server-generated idempotency key. The client receives only the Checkout URL and must never mark payment complete by itself.

`POST /api/stripe/webhook` verifies the raw request body with `STRIPE_WEBHOOK_SECRET` before any state transition. Stripe event IDs are recorded to prevent duplicate processing. Successful Checkout or PaymentIntent events mark the payment `SUCCEEDED` and confirm the pending appointment; failed or expired events mark only the payment as `FAILED` or `EXPIRED`. See `docs/payments.md` for setup and operational details.

Appointment creation still creates a placeholder notification after the appointment record.

### Setup, test, and deployment instructions

#### Setup

1. Install dependencies: `npm ci`
2. Start local app: `npm run dev`
3. Open booking page with params, for example:
   - `/booking/new?practitionerId=p_1&reasonId=reason_general&consultationType=IN_PERSON&startTime=2026-06-01T09:00:00.000Z`

#### Test and quality

- Run lint and type safety checks:
  - `npm run check`
- Run default test gate:
  - `npm test`
- Add integration tests for concurrent booking attempts and role authorization failures.

#### Deployment notes

- Keep appointment creation server-side (API route + service).
- Enforce real authentication middleware/session validation in production (replace demo headers).
- Add database unique/partial index over `(practitionerId, startTime)` for non-cancelled appointments.
- Emit audit logs for appointment creation and conflict failures.


## Booking success page

### Route and behavior

- Route: `/booking/success/[appointmentId]`.
- Displays appointment confirmation with:
  - practitioner name,
  - specialty,
  - clinic address for in-person appointments,
  - video consultation status for video appointments,
  - appointment date and time,
  - **View my appointments** CTA,
  - **Add to calendar** placeholder button (non-functional by design).
- Payment logic is intentionally excluded from this page.
- Video room creation is intentionally excluded from this page unless provided by a dedicated existing module.

### Access control rules

- Returns `404` when `appointmentId` does not exist.
- Allows access for:
  - the patient who owns the appointment,
  - the practitioner assigned to the same appointment.
- Denies access (`403`) to:
  - unauthenticated users,
  - authenticated users unrelated to the appointment.
- Authorization checks are enforced server-side in the page module and must not rely on client-side gating.

## Patient dashboard module

### Route

- `/dashboard/patient` (`app/dashboard/patient/page.tsx`).

### Patient dashboard features

- Displays upcoming appointments and past appointments in separate sections.
- Shows appointment status, practitioner name, specialty, date/time, and consultation type.
- Supports optional cancellation reason input for future appointments.
- Exposes **Cancel appointment** action for future appointments only.
- Exposes **View details** action for both future and past appointments.
- Shows **Join video** action only for `VIDEO` appointments when join is available.
- Includes a medical documents placeholder section.
- Includes a patient profile summary card.
- Uses responsive layout with stacked mobile sections and multi-column desktop layout.

### Access control rules

- Route is restricted to users with role `PATIENT`.
- Patient can only see appointments where `appointment.patientId === currentUser.id`.
- Patient cannot cancel past appointments.
- Cancellation reason is optional and persisted in local dashboard state for detail view.

### Setup, test, and deployment instructions

#### Setup

1. Install dependencies:
   ```bash
   npm ci
   ```
2. Start development server:
   ```bash
   npm run dev
   ```
3. Open patient dashboard route:
   ```
   http://localhost:3000/dashboard/patient
   ```

#### Testing

- Run static quality checks:
  ```bash
  npm run lint
  npm run typecheck
  ```
- Recommended pre-commit gate:
  ```bash
  npm run check
  ```

#### Deployment

- Build production artifact:
  ```bash
  npm run build
  ```
- Run production server:
  ```bash
  npm run start
  ```
- Enforce CI quality gates (`lint`, `typecheck`, tests, build) before release.
- Ensure role and ownership checks remain server-enforced when wiring real auth and data sources.

## Video consultation page

### Route and behavior

- Route: `/consultation/[appointmentId]`.
- Page validates request authentication through centralized server auth helpers (`lib/auth/current-user.ts`).
- Access is restricted to the appointment patient or practitioner only.
- Only `VIDEO` appointments can be opened on this route.
- `CANCELLED` appointments are explicitly blocked.
- If access is attempted before the allowed window, the page shows a waiting room state.
- When access is valid and time window is open, the page renders:
  - consultation metadata,
  - practitioner/patient information,
  - security status,
  - Jitsi embedded iframe with a **Join consultation** button fallback that opens in a new tab.

### Access window rules

- Join access opens exactly **15 minutes before appointment start time**.
- Join access expires exactly **2 hours after appointment end time**.
- Requests outside this window are denied with explicit security messaging.

### Security notes for video consultations

- Authentication is mandatory: missing/invalid session identity results in access denial.
- Authorization is mandatory: users not assigned to the appointment are denied.
- Appointment integrity checks enforce consultation type and cancellation status before any room exposure.
- Jitsi embed uses `referrerPolicy="no-referrer"` and a constrained iframe `allow` policy for camera/mic/fullscreen and screen-share capabilities.
- For production, keep the same auth helper interfaces and replace the session reader with signed cookie/session or JWT verification.

### Setup, testing, and deployment guidance (video module)

- Setup: ensure your auth layer injects trusted user identity for server-rendered pages (e.g., session cookie to server context).
- Testing:
  - validate patient access success,
  - validate practitioner access success,
  - validate unauthorized user denial,
  - validate cancelled appointment denial,
  - validate non-video appointment denial,
  - validate waiting-room timing and expired timing boundaries.
- Deployment:
  - enforce HTTPS and secure cookie/session flags,
  - centralize audit logging for consultation access attempts,
  - monitor denied-access rates and abnormal room-entry patterns,
  - externalize room naming/signing strategy to backend service to avoid predictable meeting IDs.

## Notification architecture (MVP)

- Core service: `lib/services/notification.service.ts`.
- Responsibility: build safe appointment notification messages, dispatch via active channel (email for MVP), and persist every event in the Notification table/repository.
- Current channel behavior:
  - `EMAIL`: active sender (console-based MVP; can be replaced by Resend adapter).
  - `SMS`: reserved placeholder (not dispatched yet).
  - `WHATSAPP`: reserved placeholder (not dispatched yet).
- Implemented service methods:
  - `sendAppointmentConfirmationPatient`
  - `sendAppointmentConfirmationPractitioner`
  - `sendAppointmentCancellation`
  - `sendVideoConsultationLink`
  - `sendAppointmentReminder24h`
  - `sendAppointmentReminder2h`

### Future notes: Email / SMS / WhatsApp

- Email production path: replace the redacted development-only console sender with a provider adapter (Resend, SES, etc.) and add retry policy + dead-letter handling.
- SMS path: add dedicated SMS adapter interface and template truncation rules for short-message constraints.
- WhatsApp Cloud API path: add approved template mapping, webhook delivery status updates, and conversation window handling.
- Keep all channels behind the same service contract to avoid route/controller coupling.

### Privacy notes for notifications

- Do not expose diagnosis, symptoms, or other sensitive medical details in message content.
- Keep notifications focused on operational logistics (date/time/type/link).
- Avoid embedding identifiers that could be abused if intercepted.
- Persist only minimum metadata needed for auditability and support.

## Setup, test, and deployment instructions (notifications)

### Setup

1. Ensure base project setup is done (`npm ci`, `.env.local`).
2. Configure optional email variables for real provider integration later:
   - `EMAIL_FROM`
   - `RESEND_API_KEY`

### Test

- Run static quality gate:
  - `npm run check`
- Add unit tests around `NotificationService` method outputs and repository writes before enabling external provider sending.

### Deployment

- Keep provider credentials in secret manager only (never in source).
- Add provider health checks and failure alerts before enabling non-console transport.
- Enforce audit logging around notification send failures and retries.
- Roll out SMS/WhatsApp by feature flags per environment.

## Production security checklist

- Enforce Zod validation on all API payloads/queries/route params.
- Use server-side role checks before sensitive business actions.
- Apply endpoint-specific rate limiting for booking/auth-sensitive actions.
- Protect consultation access by participant identity + session timing windows.
- Validate file uploads (size, mime type, extension) before storage.
- Use centralized error handling with request IDs and safe error responses.
- Never leak stack traces or secrets in HTTP responses.
- Render a dedicated access-denied route for unauthorized navigation.

## Access control summary

- API access control relies on centralized current-user helpers and explicit role whitelists.
- Booking creation is restricted to `PATIENT` role only.
- Consultation pages are restricted to appointment participants (patient/practitioner) and valid video sessions.
- Unauthorized users are redirected to `/access-denied`.

## Production hardening notes

- Current in-memory rate limiting is safe for single-instance deployments; move to Redis/Upstash for distributed environments.
- Keep `x-request-id` propagation enabled across proxies and app servers for incident tracing.
- Route all structured server error logs to your log pipeline (Datadog/ELK/CloudWatch).
- Add WAF + bot protection in front of public APIs.
- Ensure file uploads pass antivirus scanning in production storage workflows.
- Keep strict secret management and periodic credential rotation.

## Setup, test, and deployment instructions

### Setup

1. Install dependencies with `npm ci`.
2. Create environment file (`cp .env.example .env.local`).
3. Start local server (`npm run dev`).

### Testing and checks

- Run `npm run lint` for lint checks.
- Run `npm run typecheck` for TypeScript checks.
- Run `npm run check` before commit/push.

### Deployment

1. Set all production env vars in your deployment platform.
2. Run pre-deploy checks (`npm run check`).
3. Build (`npm run build`) and deploy (`npm run start` or platform runtime).
4. Verify rate-limit behavior, access control paths, and logging in production monitoring.

## Current integration status

A full repository integration audit was completed on **2026-05-05**.

- Read the report: [`docs/integration-audit.md`](docs/integration-audit.md)
- Scope includes: data layer maturity, auth consistency, route integrity, quality gates, security posture, and roadmap gap analysis.


## Repository layer and Prisma integration (2026-05-05)
- Added Prisma schema baseline at `prisma/schema.prisma` and client singleton at `lib/db/prisma.ts`.
- Introduced typed repositories under `lib/repositories/` for practitioner, availability, appointment, notification, and user reads/writes.
- `POST /api/appointments` is now Prisma-backed through repository abstraction.
- `GET /api/practitioners/[id]/available-slots` is Prisma-backed when `DATABASE_URL` is configured, with isolated mock fallback under `lib/repositories/mock/availability.repository.ts`.
- Remaining MVP placeholder areas: demo data in frontend pages (`app/dashboard/patient/page.tsx`, `app/consultation/[appointmentId]/page.tsx`, `app/booking/success/[appointmentId]/page.tsx`) and local-only mock repositories for practitioner search and availability when `DATABASE_URL` is absent outside production.

## Repository layer and Prisma integration status

### Repository layer overview
- Service modules keep business rules, while repository modules encapsulate persistence queries.
- Primary repository implementations live in `lib/repositories/*.repository.ts`.
- Non-database fallbacks are isolated in `lib/repositories/mock/*`.

### Current Prisma-backed modules
- Appointments: transactional create + notification write.
- Availability: rules, blocked dates, existing appointments, consultation reason lookups.
- Practitioners: public practitioner lookup and searchable listing.
- Users: safe user reads excluding sensitive fields.

### Remaining mock-backed areas
- Practitioner search fallback (used only when `DATABASE_URL` is not configured).
- Availability fallback (used only when `DATABASE_URL` is not configured).

For detailed status and migration notes, see `docs/database-integration.md`.


## Authentication architecture

- Central auth modules:
  - `lib/auth/session.ts`
  - `lib/auth/permissions.ts`
  - `lib/auth/current-user.ts`
- Demo headers remain supported for local MVP development, but are isolated to `lib/auth/session.ts` only and are disabled when `NODE_ENV=production`.
- APIs enforce role checks server-side and return consistent auth errors.
- Server pages enforce role checks server-side and redirect unauthorized users to `/access-denied`.
- See `docs/authentication.md` for full migration path to production cookie/session/JWT auth.


## MVP placeholder and production fail-fast policy

The application intentionally keeps a few MVP placeholders isolated until their production integrations are implemented:

- Demo-header authentication is local-development only and is rejected in production.
- Practitioner search and available-slot mock repositories are local-development fallbacks only; production requires `DATABASE_URL`.
- Medical documents, reviews, Stripe checkout, and Stripe webhook routes return explicit `501` errors instead of success-like placeholder payloads.
- Video consultation, booking success, and dashboard sample data remain documented MVP placeholders and must be replaced with database-backed, resource-authorized flows before release.

These safeguards prevent mock data and unsafe provider placeholders from being mistaken for production-ready behavior.

## Project roadmap

- See `docs/completion-roadmap.md` for the current completion and production-readiness plan.

## Final audit report

See [docs/final-audit-report.md](docs/final-audit-report.md) for the final technical audit, production-readiness risks, and recommended stabilization checklist.

## Final production readiness verification

The current verification report is [`docs/final-production-readiness-report.md`](docs/final-production-readiness-report.md). It records the final readiness score, completed checks, deployment blockers, remaining MVP limitations, monitoring and backup recommendations, and file-change inventory for the May 7, 2026 production-readiness pass.

## Build, check, and dependency audit workflow

Use the following commands before production deployment or before opening a release PR:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run audit:prod
```

`npm run check` intentionally runs lint, TypeScript, and unit/API tests. `npm run prod:check` adds the production build and dependency audit for release candidates. Run the stages separately in CI when clearer failure diagnostics are preferred because Next.js generates typed-route artifacts and performs production prerendering checks that are not covered by plain `tsc --noEmit`.

### Dependency audit note

The project currently uses Next.js `16.2.4`. Next still pins a nested PostCSS package, so `package.json` includes an npm `overrides.postcss` entry that resolves PostCSS to the patched direct dependency version used by the app. Keep this override until a future Next.js release removes the vulnerable nested PostCSS pin, then remove the override as part of a normal lockfile update and rerun `npm audit --audit-level=moderate`.

### Production readiness gates

A production candidate should pass all of these gates in CI:

- Lint: `npm run lint`
- TypeScript: `npm run typecheck`
- Combined local check: `npm run check`
- Production build: `npm run build`
- Dependency audit: `npm run audit:prod`

Do not treat a passing build as full production approval. Authentication, persistence, payments, deployment infrastructure, and broader automated tests still require separate hardening work before release.
