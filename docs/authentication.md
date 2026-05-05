# Authentication & Session Model

## Current MVP model (centralized)

Sihati currently uses a centralized auth/session abstraction for identity and role resolution:

- `lib/auth/session.ts`: isolated demo-header session reader.
- `lib/auth/permissions.ts`: canonical role definitions and role matching helpers.
- `lib/auth/current-user.ts`: high-level helpers for API and server page authorization.
- `lib/security/access-control.ts`: compatibility wrapper using centralized auth helpers.

The only place that reads demo headers (`x-user-id`, `x-user-role`) is `lib/auth/session.ts`.

## Supported roles

- `PATIENT`
- `PRACTITIONER`
- `ADMIN`
- `CLINIC_ADMIN`

All role checks must run server-side using `requireRolesForApi` / `requireRolesForPage` or compatible wrappers.

## Unauthorized behavior

- API routes: throw `AppError` with consistent status and error code (`UNAUTHENTICATED`/`ACCESS_DENIED`).
- Server pages: redirect to `/access-denied`.

## Migration path to production auth

1. Replace demo-header readers in `lib/auth/session.ts` with trusted cookie/session parsing.
2. Add signature/verification (session store, JWT verification, or platform auth middleware).
3. Keep `AuthSession` return contract stable so pages/APIs remain unchanged.
4. Add token/session expiry checks and revocation strategy.
5. Add audit logging hooks for privileged access paths.
6. Introduce integration tests for auth middleware + role authorization scenarios.

## Operational guidance

- Never read auth headers directly in route/page modules.
- Keep role enum centralized to avoid drift.
- Keep authorization at server boundaries (API handlers, server pages, server actions).
