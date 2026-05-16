# Security hardening guide

Last updated: 2026-05-07

## Current authentication model

Sihati is still using an MVP authentication adapter. Current-user resolution is centralized through:

- `lib/auth/session.ts` for session parsing.
- `lib/auth/current-user.ts` for current-user access and role gates.
- `lib/security/access-control.ts` for ownership and route/API authorization rules.

For local development and automated tests only, the app accepts demo headers:

- `x-user-id`
- `x-user-role`

These headers are isolated in `lib/auth/session.ts`, are documented as spoofable, and are disabled when `NODE_ENV=production`. No route or API should read those header names directly. New code must call `getCurrentUserFromRequest`, `requireUserContext`, `getCurrentUserFromServer`, or `requireRolesForPage` instead.

## Roles and permissions matrix

| Role | Allowed capabilities | Server-side helper |
| --- | --- | --- |
| `PATIENT` | Create own appointments, read own appointments, access own video consultations, read own medical documents. | `requireUserContext(request, ["PATIENT"])`, `canAccessAppointment`, `canAccessVideoConsultation` |
| `PRACTITIONER` | Read assigned appointments, manage own availability, access assigned video consultations, read assigned-patient data when implemented. | `requireUserContext(request, ["PRACTITIONER"])`, `canAccessAppointment`, `canAccessVideoConsultation` |
| `ADMIN` | Access admin dashboard pages, validate practitioners, read any appointment/consultation for support/audit workflows. | `requireRolesForPage(["ADMIN"])`, `canAccessAppointment` |

The canonical permission list lives in `ROLE_PERMISSIONS` in `lib/auth/permissions.ts`.

## Protected routes

| Route | Required access |
| --- | --- |
| `/dashboard/admin/catalog` | `ADMIN` |
| `/dashboard/admin/practitioners` | `ADMIN` |
| `/dashboard/patient` | `PATIENT` |
| `/dashboard/patient/appointments` | `PATIENT` |
| `/dashboard/practitioner` | `PRACTITIONER` or `ADMIN` |
| `/dashboard/practitioner/appointments` | `PRACTITIONER` or `ADMIN` |
| `/dashboard/practitioner/availability` | `PRACTITIONER` or `ADMIN` |
| `/booking/new` | `PATIENT` |
| `/booking/success/[appointmentId]` | owning patient, assigned practitioner, or admin |
| `/consultation/[appointmentId]` | owning patient, assigned practitioner, or admin; appointment must be `VIDEO` and not `CANCELLED` |

## Protected APIs

| API | Protection |
| --- | --- |
| `POST /api/appointments` | Requires authenticated `PATIENT`, same-origin browser request, appointment payload validation, appointment service ownership creation, per-user/IP rate limiting. |
| `GET /api/medical-documents` | Requires authenticated `PATIENT`, `PRACTITIONER`, or `ADMIN`; strict per-user/IP rate limiting; returns `501` until storage and row-level access are implemented. |
| `POST /api/payments/checkout` | Requires authenticated `PATIENT`, same-origin browser request, and provider-safe per-user/IP rate limiting; returns `501` until verified payments are implemented. |
| `POST /api/stripe/webhook` | Provider endpoint with IP-scoped webhook rate limiting; requires Stripe signature header and server secret before implementation; does not use browser session auth. |
| `GET /api/practitioners/search` | Public, validated, rate limited. |
| `GET /api/practitioners/[id]/available-slots` | Public, validated, rate limited, blocks public booking for unverified practitioners. |
| `GET /api/reviews` | Public, rate limited placeholder returning safe `501` until persisted reviews exist. |

## Patient and appointment data access

Patient data must only be exposed to:

1. The patient who owns the record.
2. The practitioner assigned to the relevant appointment or care relationship.
3. Admin users for support, compliance, or moderation workflows.

Use `canAccessAppointment` or `assertCanAccessAppointment` for appointment-derived records. Use `canAccessVideoConsultation` or `assertCanAccessVideoConsultation` for video rooms. Do not duplicate ID comparisons in routes.

## Sensitive data exposure

- `passwordHash` must never be selected for public DTOs or API responses.
- User reads should use `PrismaUserRepository.getSafeById`, which selects only safe user fields.
- API responses should use `safeJsonResponse` and route handlers should use `withErrorHandling`.
- Logs include request IDs and safe error summaries; production logs omit stack traces.

## Token/session security

Current demo headers are not production tokens. Production auth must use one of:

- Firebase Auth ID tokens verified on the server with Firebase Admin SDK.
- Signed, HTTP-only, `Secure`, `SameSite=Lax` or `SameSite=Strict` session cookies.
- JWT access tokens validated server-side with rotation and revocation strategy.

Production sessions should include user ID, role, expiry, issuer/audience checks where applicable, and a server-controlled revocation path.

## CSRF, CORS, and XSS

- State-changing browser APIs should call `assertSameOrigin(request)` before processing when cookie-based auth is introduced.
- The app does not expose cross-origin API access by default. Do not add permissive CORS. If partner access is required, create a narrow allow-list and preflight handler.
- Security headers are configured in `next.config.ts`, including CSP, frame restrictions, referrer policy, and content-type sniffing protection.
- CSP currently keeps `unsafe-inline` because the app uses Next.js/Tailwind patterns that need inline styles/scripts in this MVP. `unsafe-eval` is development-only.

## SQL injection protection

Database access should continue through Prisma repositories and Zod validators. Avoid raw SQL. If raw SQL becomes necessary, use Prisma parameterized APIs and add tests for malicious input.

## Rate limiting

`lib/security/rate-limit.ts` provides a shared rate-limiting abstraction with a local/test in-memory adapter and a Redis/Upstash REST-compatible production adapter. Production requests fail closed with `RATE_LIMIT_NOT_CONFIGURED` unless `RATE_LIMIT_REDIS_REST_URL` and `RATE_LIMIT_REDIS_REST_TOKEN` (or the equivalent `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) are configured, so limits coordinate across all app instances. Limiter keys combine the route scope, authenticated user ID when available, and client IP address; raw user IDs and IPs are hashed before being stored in limiter keys. Exceeded limits return a safe `429` JSON error without retry counters, Redis details, or internal key material.

## Error handling and logging

- Route handlers should be wrapped with `withErrorHandling`.
- User-facing errors should be generic and safe.
- Validation details are hidden in production.
- Unexpected errors return `INTERNAL_SERVER_ERROR` without implementation details.
- Logs should not include secrets, tokens, password hashes, raw medical documents, or payment payloads.

## Known MVP limitations

- Demo header auth is only a development/test adapter and must not be trusted in production.
- No complete Firebase Auth, OAuth, password login, refresh-token, or JWT implementation exists yet.
- Medical documents, payments, reviews, notifications, and Stripe webhooks remain placeholder or partial integrations.
- Video consultations use a deterministic Jitsi room name in mock data; production should use signed/expiring room credentials.
- Appointment ownership checks exist for current mock pages, but future database-backed detail APIs need row-level repository methods and integration tests.
- Local/test in-memory rate limiting resets on process restart; production must keep the Redis/Upstash REST configuration present and monitored.

## Production migration checklist

1. Implement Firebase Auth or JWT/session-cookie verification inside `lib/auth/session.ts`.
2. Keep `lib/auth/current-user.ts` as the only current-user entry point for routes and APIs.
3. Map verified provider claims to internal `UserRole` values from the database.
4. Load safe user profiles via a repository that excludes `passwordHash`.
5. Configure and monitor the shared Redis/Upstash production rate limiter (`RATE_LIMIT_REDIS_REST_URL` and `RATE_LIMIT_REDIS_REST_TOKEN`).
6. Add integration tests for patient/practitioner/admin access to every protected API and route.
7. Add audit logs for appointment creation, cancellation, video-room joins, admin actions, and permission denials.

## Medical document security controls

Medical files must remain in private storage. The application creates opaque object keys and returns only short-lived signed upload/download URLs after `PATIENT`, `PRACTITIONER`, or documented admin authorization checks pass. Public buckets, public object ACLs, CDN public origins, and long-lived document URLs are prohibited for medical documents.

Upload validation is centralized in `lib/security/upload.ts` and enforces an allowlist of PDF, JPEG, and PNG MIME types, matching file extensions, blocked executable/script extensions, safe normalized filenames, maximum size, and SHA-256 checksum format. The API should add malware scanning before marking documents `AVAILABLE` in production storage workflows.

Operational logging must never include PHI, file contents, raw object keys, signed URLs, authorization tokens, cookies, or checksum values. Medical-document audit logs record event type, role, hashed identifiers, request ID, and non-PHI denial reasons for upload, download, delete, and access-denied events.

## Structured audit logging policy

Sihati uses `lib/security/audit-log.ts` as the only audit logging entry point for sensitive workflows. Audit logs are structured JSON events and are intentionally limited to safe operational metadata:

- `actorUserId`
- `actorRole`
- `resourceType`
- `resourceId`
- `action`
- `result`
- `timestamp`
- `requestId` when available

Audit logs must never include PHI, patient names, emails, phone numbers, symptoms, appointment notes, file names, document contents, decrypted service configuration, secrets, tokens, cookies, Authorization headers, Stripe raw webhook bodies, room tokens, checkout URLs, signed medical-document URLs, or storage object keys. Use `redactForAudit` or `redactSignedUrl` before logging any diagnostic value that was not produced by the centralized audit logger.

Current audit event types are: `AUTH_SUCCESS`, `AUTH_FAILURE`, `ACCESS_DENIED`, `APPOINTMENT_CREATED`, `APPOINTMENT_CANCELLED`, `VIDEO_JOIN_ATTEMPT`, `MEDICAL_DOCUMENT_UPLOADED`, `MEDICAL_DOCUMENT_DOWNLOADED`, `PAYMENT_CHECKOUT_CREATED`, `PAYMENT_WEBHOOK_RECEIVED`, and `ADMIN_SERVICE_CONFIG_CHANGED`.

Implementation rules:

1. Do not call `console.info` directly for sensitive workflow audit trails; call `writeAuditLog`.
2. Do not pass whole request bodies, headers, webhook events, Stripe objects, provider responses, patient DTOs, or service configuration values into logs.
3. Log success, denial, and provider webhook receipt using stable internal IDs only.
4. Keep human-readable PHI in user-facing responses or encrypted storage only, never in log payloads.
5. Add tests when introducing a new audit event or metadata field.
