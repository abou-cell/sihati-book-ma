# Sihati Technical Architecture

Sihati is a Next.js and TypeScript medical appointment booking platform for patient booking, practitioner availability, admin configuration, secure Stripe payments, notifications, and video consultation entry points. This document describes the production-oriented architecture as it exists today and the operational boundaries that must be preserved during stabilization.

## 1. Global architecture

The application is a single Next.js App Router codebase that contains:

- Public and protected server-rendered pages under `app/`.
- API route handlers under `app/api/`.
- Domain services under `lib/services/`.
- Repository/data access modules under `lib/repositories/` and Prisma access through `lib/db/prisma.ts`.
- Security, auth, validation, and runtime configuration modules under `lib/`.
- Shared UI and layout components under `components/`.
- Prisma schema under `prisma/schema.prisma`; migration, backup, rollback, restore-test, and seed-data operations are defined in `docs/database-production-runbook.md`.
- Unit/API tests under `tests/`.

```mermaid
flowchart TD
  Browser[Browser / Patient / Practitioner / Admin]
  Pages[Next.js App Router Pages]
  API[Next.js API Routes]
  Auth[Auth Helpers]
  Validators[Zod Validators]
  Services[Domain Service Layer]
  Repos[Repository / Data Layer]
  Prisma[Prisma Client]
  DB[(PostgreSQL Database)]
  Providers[External Providers: Stripe, Firebase, SMTP/Resend, Cloud Storage, Video]

  Browser --> Pages
  Browser --> API
  Pages --> Auth
  API --> Auth
  API --> Validators
  Pages --> Services
  API --> Services
  Services --> Repos
  Repos --> Prisma
  Prisma --> DB
  Services --> Providers
```

## 2. Frontend architecture

### App Router structure

- `app/page.tsx` is the public home entry point.
- `app/(public)/search/page.tsx` and `app/(public)/specialties/[specialty]/page.tsx` expose public discovery pages.
- `app/practitioners/[slug]/page.tsx` exposes practitioner profile pages.
- `app/booking/new/page.tsx` and `app/booking/new/BookingNewClient.tsx` support patient booking.
- `app/dashboard/patient/*`, `app/dashboard/practitioner/*`, and `app/dashboard/admin/*` are role-protected dashboard areas.
- `app/consultation/[appointmentId]/page.tsx` is the protected video consultation entry page.
- `app/access-denied/page.tsx` is the common authorization failure page.

### Component structure

- `components/layout/` contains global layout primitives such as header and footer.
- `components/ui/` contains reusable UI primitives.
- `components/search/`, `components/calendar/`, and `components/cards/` contain feature-specific presentation components.

### Frontend responsibilities

The frontend should remain focused on:

- Rendering pages and forms.
- Calling internal API routes.
- Displaying validation and access errors safely.
- Never embedding server-only secrets.
- Using only `NEXT_PUBLIC_*` environment variables in browser code.

## 3. Backend/API architecture

API handlers live in `app/api/**/route.ts` and use a consistent shape:

1. Apply authentication/authorization where needed.
2. Apply same-origin checks for browser-originating mutations.
3. Apply route-specific rate limits through `lib/security/rate-limit.ts`.
4. Parse query/body data through Zod validators.
5. Delegate business rules to services.
6. Return sanitized JSON through shared error helpers.

Current API routes include:

| Route | Status | Main responsibility |
| --- | --- | --- |
| `GET /api/practitioners/search` | Public | Search practitioners with validated filters and a safe public search rate limit. |
| `GET /api/practitioners/[id]/available-slots` | Public | Generate available appointment slots with a safe public lookup rate limit. |
| `POST /api/appointments` | Protected | Create appointments for authenticated patients with a medium per-user/IP creation limit. |
| `GET /api/medical-documents` | Protected placeholder | Reserved until storage rules are complete; guarded by strict per-user/IP limits. |
| `POST /api/payments/checkout` | Protected | Creates Stripe Checkout Sessions for authenticated patient-owned pending appointments. |
| `POST /api/stripe/webhook` | Provider endpoint | Verifies Stripe signatures over the raw body and processes idempotent payment events. |
| `GET/POST/PATCH /api/admin/service-config` | Admin only | Manage external service configuration records; mutations use a medium admin per-user/IP limit. |
| `GET /api/reviews` | Placeholder | Reserved for review data with public rate limiting. |

## 4. Service layer

The service layer owns business logic and keeps route handlers thin.

| Service | File | Responsibility |
| --- | --- | --- |
| `AppointmentService` | `lib/services/appointment.service.ts` | Appointment creation and appointment business rules. |
| `AvailabilityService` | `lib/services/availability.service.ts` | Availability rules, blocked dates, and slot generation. |
| `PractitionerSearchService` | `lib/services/practitioner-search.service.ts` | Practitioner search orchestration. |
| `NotificationService` | `lib/services/notification.service.ts` | Notification payload preparation and status handling. |
| `AppConfigService` | `lib/services/app-config.service.ts` | Admin-managed external provider configuration with encrypted secrets and masked previews. |
| `PaymentService` | `lib/services/payment.service.ts` | Stripe Checkout creation, appointment payment eligibility checks, verified webhook event transitions, and duplicate event handling. |
| `VideoConsultationService` | `lib/services/video-consultation.service.ts` | Server-side video room authorization, opaque room ID generation, short-lived room token signing, provider adapter handoff, and audit logging. |

Service design rules:

- Keep provider-specific code behind service boundaries.
- Keep validation schemas in `lib/validators/` and call them before service execution.
- Avoid direct database calls from UI components.
- Avoid direct environment variable reads outside `lib/env.ts`, `lib/config/app.ts`, and narrowly scoped provider adapters.

## 5. Repository/data layer

### Prisma

`prisma/schema.prisma` defines the core data model:

- Users and roles: `User`, `UserRole`.
- Practitioners and catalog data: `Practitioner`, `ConsultationReason`.
- Scheduling: `AvailabilityRule`, `BlockedDate`, `Appointment`, `ConsultationType`, `AppointmentStatus`.
- Notifications: `Notification`, notification channel/status/type enums.
- External configuration: `ServiceConfiguration`, `ExternalServiceProvider`.

The current Prisma datasource is PostgreSQL. Production deployments should use migrations (`prisma migrate deploy`) rather than `prisma db push`.

### Repositories

Repository modules under `lib/repositories/` isolate persistence access from service logic. Mock repositories under `lib/repositories/mock/` support deterministic tests and provider-free development.

```mermaid
flowchart LR
  API[API Route] --> Service[Domain Service]
  Page[Server Page] --> Service
  Service --> Repository[Repository Interface / Module]
  Repository --> Prisma[Prisma Client]
  Prisma --> Database[(Database)]
  Service --> MockRepo[Mock Repository for tests]
```

## 6. Authentication flow

Current production state:

- Authentication is centralized in `lib/auth/current-user.ts` and `lib/auth/session.ts`.
- Production authentication uses a signed `sihati_session` token verified with `AUTH_SECRET`; the same signed token may be supplied as `Authorization: Bearer <token>` for non-browser API clients.
- Demo headers (`x-user-id`, `x-user-role`) are accepted only when `NODE_ENV !== "production"`. In production, either header causes the request to fail with `DEMO_AUTH_FORBIDDEN`.
- `NODE_ENV=production` fails closed if `AUTH_SECRET` is missing or shorter than 32 characters.
- Protected API handlers and server pages must resolve the user server-side; client-provided IDs are not trusted for authorization.

```mermaid
sequenceDiagram
  participant Browser
  participant Route as Page/API Route
  participant Auth as Auth Helpers
  participant Permissions as Role/Permission Helpers

  Browser->>Route: Request protected page/API with cookie or bearer token
  Route->>Auth: Resolve current user
  Auth->>Auth: Reject production demo headers
  Auth->>Auth: Verify HMAC signature, payload, and expiry
  alt no valid user/session
    Auth-->>Route: 401 / redirect
  else valid user
    Route->>Permissions: Check allowed roles and resource ownership
    alt denied
      Permissions-->>Route: 403 or access-denied redirect
    else allowed
      Route-->>Browser: Protected response
    end
  end
```

Production auth requirements:

- Keep all user resolution centralized in `lib/auth/session.ts` and `lib/auth/current-user.ts`.
- Reject spoofable identity headers in production.
- Validate tokens/cookies on the server with `AUTH_SECRET`.
- Store only minimal session data in cookies: user ID, role, issued-at, and expiry.
- Re-check ownership server-side for appointment creation/access, consultation access, medical documents, and admin service configuration.
- Preserve same-origin checks on browser-initiated state-changing routes.


## 7. Shared rate limiting

Sihati centralizes route limits in `lib/security/rate-limit.ts`. The limiter exposes one API for route handlers and two adapters:

- Local/test: an in-memory adapter for deterministic development and unit tests.
- Production: a Redis/Upstash REST-compatible adapter using `RATE_LIMIT_REDIS_REST_URL` and `RATE_LIMIT_REDIS_REST_TOKEN` (or `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`).

Production fails closed with `RATE_LIMIT_NOT_CONFIGURED` when shared Redis/Upstash settings are missing. Limiter keys include the route scope, authenticated user ID when available, and client IP address; user IDs and IP addresses are hashed before storage. Route handlers should return only the shared safe `RATE_LIMITED` JSON response for exceeded limits.

Current route policy classes:

| Policy | Applied to | Limit |
| --- | --- | --- |
| Strict auth/session-sensitive | Medical document access, admin configuration reads, and other session-sensitive endpoints | 10/minute |
| Appointment creation | `POST /api/appointments` | 10/minute |
| Admin config mutation | `POST/PATCH /api/admin/service-config` | 20/minute |
| Public search/lookup | Practitioner search, available slots, reviews | 120/minute |
| Provider checkout | `POST /api/payments/checkout` | 30/minute |
| Provider webhook | `POST /api/stripe/webhook` | 120/minute |

## 8. Role-based access control

Roles are defined as:

- `PATIENT`
- `PRACTITIONER`
- `ADMIN`

Permissions are centralized in `lib/auth/permissions.ts` and enforced with helpers from `lib/auth/current-user.ts` and `lib/security/access-control.ts`.

| Area | Patient | Practitioner | Admin |
| --- | --- | --- | --- |
| Create own appointment | Yes | No | No |
| Read own appointments | Yes | No | Yes |
| Read assigned appointments | No | Yes | Yes |
| Manage own availability | No | Yes | Yes |
| Join own/assigned video consultation | Own only | Assigned only | Any |
| Access admin service configuration | No | No | Yes |
| Validate/manage practitioner catalog | No | No | Yes |


## 9. Payment flow

Stripe payments are linked directly to appointment booking. Video appointments are created as `PENDING`; the checkout API re-loads the appointment server-side, verifies that the authenticated patient owns it, verifies it remains payable, derives the amount from the consultation reason, and creates a Stripe Checkout Session using `STRIPE_SECRET_KEY`. The browser is redirected to Stripe but is never trusted to confirm payment.

```mermaid
sequenceDiagram
  participant Patient
  participant API as /api/payments/checkout
  participant Payment as PaymentService
  participant DB as PostgreSQL
  participant Stripe

  Patient->>API: POST appointmentId with signed session
  API->>Payment: createCheckoutSession(userId, appointmentId)
  Payment->>DB: Load appointment + reason/practitioner
  Payment->>Payment: Verify owner, PENDING status, future start, server price
  Payment->>DB: Upsert/create Payment with idempotency key
  Payment->>Stripe: Create Checkout Session with server metadata
  Payment->>DB: Store session/payment-intent identifiers
  API-->>Patient: Checkout URL
```

Webhook processing uses `STRIPE_WEBHOOK_SECRET` and the raw request body. The handler records every Stripe event ID before applying state changes, so a repeated provider event returns a duplicate result without updating the same payment twice. `checkout.session.completed` and `payment_intent.succeeded` mark the payment `SUCCEEDED` and confirm the pending appointment in a transaction. `payment_intent.payment_failed` marks the payment `FAILED`; `checkout.session.expired` marks it `EXPIRED`. Failed and expired events do not cancel or confirm appointments.

## 10. Video consultation flow

The consultation entry route is server-rendered and delegates all join decisions to `VideoConsultationService`. The service requires an authenticated user, loads the appointment from the repository, verifies that it is a confirmed `VIDEO` consultation, rejects cancelled/completed/expired appointments, and authorizes only the owning patient, assigned practitioner, or an admin.

```mermaid
sequenceDiagram
  participant Patient
  participant App as /consultation/{appointmentId}
  participant Auth
  participant VideoSvc as VideoConsultationService
  participant Repo as Appointment Repository
  participant Adapter as Video Provider Adapter

  Patient->>App: Open consultation entry
  App->>Auth: Resolve signed session server-side
  App->>VideoSvc: Request room access for appointment + actor
  VideoSvc->>Repo: Load appointment
  VideoSvc->>VideoSvc: Validate type, status, time window, and participant/admin authorization
  alt valid confirmed VIDEO appointment
    VideoSvc->>VideoSvc: Derive opaque room ID and sign short-lived room token
    VideoSvc->>Adapter: Build provider-specific join/embed URLs
    VideoSvc->>VideoSvc: Write sanitized audit event without token or PHI
    VideoSvc-->>App: Return room access
    App-->>Patient: Render consultation room entry
  else invalid or unauthorized
    VideoSvc->>VideoSvc: Write sanitized denied audit event
    App-->>Patient: Access denied
  end
```

Production requirements:

- Keep provider-specific WebRTC implementation behind `VideoProviderAdapter`; the current adapter target is `CLOUDFLARE_STREAM_WEBRTC`.
- Use opaque HMAC-derived room IDs (`sihati-v1-*`) that do not expose appointment IDs.
- Generate short-lived signed room tokens server-side and never log or display token payloads.
- Prevent room reuse after cancellation, completion, non-video appointment selection, or expiry of the appointment access window.
- Log join attempts through audit logging with hashed identifiers only.
- Configure TURN/STUN or provider infrastructure for reliable WebRTC connectivity before enabling production traffic.

See `docs/video-consultation.md` for operational details and extension points.

## 11. Notification flow

Notifications are modeled with channel, status, type, recipient, subject, message, sent time, and metadata. The current service foundation should remain provider-independent until SMTP/SMS/push providers are configured.

```mermaid
flowchart TD
  Event[Appointment or Reminder Event]
  NotificationService[NotificationService]
  Template[Email/SMS/Push Template]
  Record[(Notification Record)]
  Provider{Provider configured?}
  Email[Email/SMS/Push Provider]
  Status[Update status SENT/FAILED]

  Event --> NotificationService
  NotificationService --> Template
  NotificationService --> Record
  NotificationService --> Provider
  Provider -- yes --> Email --> Status
  Provider -- no --> Status
```

Production requirements:

- Store provider message IDs in metadata.
- Retry failed notifications with bounded retry policy.
- Avoid sending secrets, tokens, or unnecessary health data in messages.
- Keep provider credentials in encrypted service configuration or server-only environment variables.

## 11. Admin service configuration flow

Admin-managed configuration stores metadata plainly and secret bags encrypted with `APP_ENCRYPTION_KEY`. API responses return masked secret previews only.

Supported provider enum values:

- `STRIPE`
- `CLOUDFLARE_STREAM_WEBRTC`
- `FIREBASE`
- `SMTP`
- `SMS_PROVIDER`
- `PUSH_NOTIFICATIONS`
- `CLOUD_STORAGE`
- `GOOGLE_OAUTH`
- `FACEBOOK_OAUTH`

```mermaid
sequenceDiagram
  participant Admin
  participant UI as /admin/service-config
  participant API as /api/admin/service-config
  participant Auth as RBAC
  participant Service as AppConfigService
  participant Crypto as AES-256-GCM Encryption
  participant DB as ServiceConfiguration

  Admin->>UI: Edit provider metadata/secrets
  UI->>API: POST/PATCH config
  API->>Auth: Require ADMIN + same-origin mutation
  API->>Service: Validate payload
  Service->>Crypto: Encrypt provided secrets
  Service->>DB: Upsert/toggle configuration
  DB-->>Service: Stored record
  Service-->>API: Safe config with masked secrets
  API-->>UI: Sanitized response
```

Operational rules:

- Never return decrypted secrets to browsers.
- Rotate `APP_ENCRYPTION_KEY` with a planned decrypt/re-encrypt migration.
- Treat service configuration as runtime configuration, not as a feature implementation.
- Log admin actions with actor IDs and provider names, not secret values.

## 12. Environment variables

Runtime validation is centralized in `lib/env.ts`. Copy `.env.example` to `.env.local` for local development and provide real values through the deployment platform for production.

| Variable | Public/server | Production | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public | Required | Canonical app URL used by browser and server. |
| `NODE_ENV` | Server | Required | Runtime mode: `development`, `test`, or `production`. |
| `DATABASE_URL` | Server | Required | Server-only PostgreSQL connection string used by Prisma; see `docs/database-production-runbook.md` for migration-role, backup, and restore expectations. |
| `AUTH_SECRET` | Server | Required | Secret for production session/JWT signing or auth integration. |
| `APP_ENCRYPTION_KEY` | Server | Required | Base64 32-byte key for AES-256-GCM encrypted service secrets. |
| `STRIPE_SECRET_KEY` | Server | Required when payments are active | Stripe API key. |
| `STRIPE_WEBHOOK_SECRET` | Server | Required when payments are active | Stripe webhook signature secret. |
| `EMAIL_FROM` | Server | Required when email is active | Verified outbound sender address. |
| `RESEND_API_KEY` | Server | Required when email is active | Resend/provider API key placeholder. |
| `RATE_LIMIT_REDIS_REST_URL` | Server | Required | Redis/Upstash REST endpoint for shared production rate limiting. |
| `RATE_LIMIT_REDIS_REST_TOKEN` | Server | Required | Bearer token for the shared production rate limiter. |

Generate production secrets with secure tooling, for example:

```bash
openssl rand -base64 32
openssl rand -hex 32
```

## 13. Folder structure

```text
app/                         Next.js App Router pages and API route handlers
app/api/                     Backend API routes
components/                  Reusable UI and feature components
docs/                        Technical, deployment, testing, and operations docs
emails/templates/            Notification templates
lib/auth/                    Current-user, session, and permission helpers
lib/config/                  Central app configuration
lib/db/                      Prisma client bootstrap
lib/repositories/            Data access modules and test-friendly repositories
lib/security/                Error handling, access control, rate limiting, encryption, upload security
lib/services/                Domain service layer
lib/validators/              Zod request and domain validation schemas
prisma/                      Prisma schema and future migrations
tests/                       Unit and API tests
```

## 14. Production architecture target

For production, the recommended deployment topology is:

```mermaid
flowchart TD
  User[Users] --> DNS[Route53 DNS]
  DNS --> CDN[CloudFront]
  CDN --> ALB[Application Load Balancer]
  ALB --> App[EC2/ECS/Node Next.js Runtime]
  App --> RDS[(RDS PostgreSQL)]
  App --> Redis[(Redis/Upstash rate limit store)]
  App --> S3[(S3 private assets/backups)]
  App --> Stripe[Stripe]
  App --> AuthProvider[Firebase Auth or session provider]
  App --> Email[Email/SMS/Push providers]
  App --> Logs[CloudWatch Logs/Metrics]
```

Minimum release gates:

- Verified production authentication.
- Database migrations deployed and tested with the `docs/database-production-runbook.md` workflow.
- HTTPS enforced end-to-end.
- Secrets stored outside Git.
- Backups and restore procedure validated using the `docs/database-production-runbook.md` restore drill.
- `npm run check` and `npm run build` passing in CI.

## Medical document storage architecture

Sihati stores medical document metadata in PostgreSQL and stores file bytes only in a private object store or private server-side volume. The `MedicalDocument` record includes the owning patient, optional practitioner share, optional appointment link, storage provider, opaque object key, MIME type, byte size, SHA-256 checksum, lifecycle status, creation time, and soft-delete timestamp. Application responses expose metadata and short-lived signed URLs only after authorization; object keys are treated as internal implementation details and are never public routes.

The `/api/medical-documents` API uses the service/repository pattern: the route authenticates, rate limits, validates request shape, and delegates policy to `lib/services/medical-document.service.ts`. The service validates uploads, creates private object keys under patient-scoped prefixes, asks the storage signer for short-lived upload/download URLs, and writes sanitized audit events. Direct public serving of medical document objects is not part of the architecture.

Access is intentionally narrow:

- Patients may list, upload, download, and soft-delete their own documents.
- Practitioners may access documents explicitly shared to their practitioner ID or linked to an appointment they own.
- Administrators may list metadata for support/compliance. Download access is disabled unless `MEDICAL_DOCUMENT_ADMIN_DOWNLOADS_ENABLED=true` and a documented access reason is supplied for a break-glass workflow.
