# Authentication and authorization

Last updated: 2026-05-07

## Summary

Sihati currently uses a centralized MVP auth adapter. The application is prepared for production auth migration, but it does **not** yet implement full Firebase Auth, OAuth, password login, or JWT session issuance.

Current-user access must go through these helpers:

- `lib/auth/session.ts` — session parsing adapter.
- `lib/auth/current-user.ts` — current-user and role helper API.
- `lib/auth/permissions.ts` — role and permission matrix.
- `lib/security/access-control.ts` — ownership, video-consultation, CSRF-origin, and API boundary helpers.

## MVP demo auth

In development and tests only, `lib/auth/session.ts` can parse these headers:

- `x-user-id`
- `x-user-role`

This is intentionally isolated and disabled in production. Demo headers are spoofable and must never be read directly in route handlers, server pages, services, or repositories.

Supported roles are:

- `PATIENT`
- `PRACTITIONER`
- `ADMIN`

## Recommended production auth

The recommended production path is Firebase Auth or signed session/JWT auth:

1. Verify Firebase ID tokens or JWT/session cookies in `lib/auth/session.ts`.
2. Resolve the database user by verified subject/user ID.
3. Use the database role as the source of truth.
4. Return a normalized `CurrentUser` from `lib/auth/current-user.ts`.
5. Remove or keep demo headers only behind a local-test feature flag that cannot be enabled in production.

For cookie sessions, use `HttpOnly`, `Secure`, `SameSite=Lax` or `Strict`, short expiry, refresh rotation, and server-side revocation. For JWTs, verify issuer, audience, expiry, signature, and revocation state.

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

## Protected APIs

- `POST /api/appointments` — patient only, same-origin browser request, rate limited.
- `GET /api/medical-documents` — authenticated patient, practitioner, or admin; not implemented until storage access rules are complete.
- `POST /api/payments/checkout` — patient only, same-origin browser request; not implemented until verified Stripe checkout exists.
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

Patient information should be visible only to the concerned patient, an authorized practitioner, or an admin.

## Known limitations

- Demo headers are development/test only and are not real authentication.
- There is no complete production login/session provider yet.
- In-memory rate limiting is not multi-instance safe.
- Video rooms need signed or expiring room tokens before production.
- Medical documents and payment APIs intentionally return safe `501` responses until proper storage/provider integrations are implemented.
