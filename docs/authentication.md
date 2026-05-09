# Authentication and authorization

Last updated: 2026-05-09

## Summary

Sihati uses a centralized production authentication boundary for protected server pages and API routes. All protected code must resolve the authenticated user through:

- `lib/auth/session.ts` — signed session parsing and demo-header isolation.
- `lib/auth/current-user.ts` — normalized current-user helpers for pages and APIs.
- `lib/auth/permissions.ts` — role and permission matrix.
- `lib/security/access-control.ts` — role, ownership, video-consultation, medical-document, CSRF-origin, and API boundary helpers.

The production adapter uses a secure signed session token carried in an `HttpOnly` cookie named `sihati_session`. API clients may also send the same signed token as `Authorization: Bearer <token>` when a browser cookie is not available. The token payload contains only `userId`, `role`, `iat`, and `exp`, and the signature is verified server-side with `AUTH_SECRET` using HMAC-SHA256.

## Required production configuration

Production fails closed unless `AUTH_SECRET` is present and at least 32 characters long. Missing or weak configuration returns a safe authentication error instead of falling back to demo identity.

Required environment variable:

- `AUTH_SECRET` — high-entropy secret used to sign and verify `sihati_session` tokens.

Operational requirements:

- Rotate `AUTH_SECRET` through a managed secret store.
- Use TLS in production; signed session cookies include `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Max-Age` attributes.
- Keep login/session issuance server-side. Client code must never mint roles or trust local storage for identity.

## Development/demo auth

In development and tests only, `lib/auth/session.ts` can parse these headers:

- `x-user-id`
- `x-user-role`

These headers are spoofable and are accepted only when `NODE_ENV !== "production"`. In production, requests containing either header are rejected with `DEMO_AUTH_FORBIDDEN`; they are not silently ignored.

Supported roles are:

- `PATIENT`
- `PRACTITIONER`
- `ADMIN`

## Production auth flow

1. A login/session issuer creates a signed Sihati session token by calling the server-side session adapter.
2. Browser clients receive the token in the `sihati_session` cookie. Non-browser API clients may use `Authorization: Bearer <token>`.
3. Protected API routes call `requireCurrentUserForApi()` or `requireUserContext()`.
4. Protected server pages call `requireRolesForPage()` or `getCurrentUserFromServer()`.
5. `lib/auth/session.ts` rejects production demo headers, verifies the token signature, validates the payload shape, checks expiry, and returns a normalized `CurrentUser`.
6. The route/page applies role checks and then resource ownership checks before returning protected data.

## Roles and permissions matrix

| Capability | Patient | Practitioner | Admin |
| --- | --- | --- | --- |
| Create appointment | Own appointment only | No | Support workflows only when explicitly implemented |
| View appointment | Own appointments | Assigned appointments | Any appointment |
| Join video consultation | Own `VIDEO` appointment only | Assigned `VIDEO` appointment only | Any non-cancelled `VIDEO` appointment |
| Manage availability | No | Own schedule | Administrative oversight |
| Read medical documents | Own documents | Assigned-patient documents | Any document for support/compliance |
| Access admin routes | No | No | Yes |
| Validate practitioners | No | No | Yes |

## Protected pages

- `/dashboard/admin/catalog` — admin only.
- `/dashboard/admin/practitioners` — admin only.
- `/dashboard/patient` — patient only.
- `/dashboard/patient/appointments` — patient only.
- `/dashboard/practitioner` — practitioner or admin.
- `/dashboard/practitioner/appointments` — practitioner or admin.
- `/dashboard/practitioner/availability` — practitioner or admin.
- `/booking/new` — patient only.
- `/booking/success/[appointmentId]` — owning patient, assigned practitioner, or admin.
- `/consultation/[appointmentId]` — owning patient, assigned practitioner, or admin; video-only and not cancelled.
- `/admin/service-config` — admin only.

## Protected APIs

- `POST /api/appointments` — patient only, same-origin browser request, rate limited; the authenticated patient ID is used server-side and cannot be supplied by the request body.
- `GET /api/medical-documents` — authenticated patient, practitioner, or admin; optional `patientId` access checks are enforced before the current placeholder response.
- `POST /api/payments/checkout` — patient only, same-origin browser request; not implemented until verified Stripe checkout exists.
- `GET/POST/PATCH /api/admin/service-config` — admin only; mutations log the verified admin actor and enforce same-origin browser requests.
- `POST /api/stripe/webhook` — Stripe signature required; future implementation must verify signature before reading trusted event data.

Public APIs remain validated and rate limited where appropriate:

- `GET /api/practitioners/search`
- `GET /api/practitioners/[id]/available-slots`
- `GET /api/reviews` placeholder

## Ownership rules

Use the central helpers instead of ad hoc comparisons:

- `canAccessAppointment(currentUser, appointment)`
- `assertCanAccessAppointment(currentUser, appointment)`
- `canAccessVideoConsultation(currentUser, appointment)`
- `assertCanAccessVideoConsultation(currentUser, appointment)`
- `canAccessMedicalDocument(currentUser, document)`
- `assertCanAccessMedicalDocument(currentUser, document)`

Appointment, consultation, medical-document, and admin service-configuration access must always be re-checked server-side. Patient information should be visible only to the concerned patient, an authorized practitioner, or an admin.

## Known limitations

- There is not yet a complete user-facing login UI in this codebase; the production adapter is ready for a server-side issuer.
- The signed session payload includes the role for the current architecture. A database-backed user resolver should become the source of truth when the login provider is connected.
- In-memory rate limiting is not multi-instance safe.
- Video rooms need signed or expiring provider room tokens before production.
- Medical documents and payment APIs intentionally return safe `501` responses until proper storage/provider integrations are implemented.
