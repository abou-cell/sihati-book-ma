# Sihati Integration Audit

Date: 2026-05-05
Audited by: Codex
Scope: Full integration audit (architecture, routes, auth, data layer, quality checks, and production-readiness gaps) without feature implementation or UI redesign.

## Current project status

Sihati currently has a strong Next.js + TypeScript MVP foundation with multiple vertical slices implemented as mocked or hybrid modules. Core flows (search, availability exposure, appointment creation, booking success, patient dashboard, and video consultation) exist at code level, with server-side validation patterns and security helper modules in place. However, the data layer is still fully in-memory across core business domains, authentication is placeholder header-based, and several documented routes/modules are missing from actual code.

## Modules detected

Implemented modules detected in repository:

- Next.js app foundation (`app/layout.tsx`, `app/page.tsx`, route groups).
- Environment validation via Zod (`lib/env.ts`) and config module (`lib/config/app.ts`).
- Practitioner search API + UI (`app/api/practitioners/search/route.ts`, `app/(public)/search/page.tsx`, `lib/services/practitioner-search.service.ts`).
- Availability management screen + available-slots API + slot generation service (`app/dashboard/practitioner/availability/page.tsx`, `app/api/practitioners/[id]/available-slots/route.ts`, `lib/services/availability.service.ts`).
- Appointment creation page/API/service (`app/booking/new/page.tsx`, `app/api/appointments/route.ts`, `lib/services/appointment.service.ts`).
- Booking success page (`app/booking/success/[appointmentId]/page.tsx`).
- Patient dashboard page (client-side local state) (`app/dashboard/patient/page.tsx`).
- Video consultation page (`app/consultation/[appointmentId]/page.tsx`).
- Notification service abstraction (`lib/services/notification.service.ts`, `emails/templates/notification.templates.ts`).
- Security helper modules (access control, rate limiting, request-safe errors, upload rules) under `lib/security/*`.

## Modules missing (roadmap gap)

- Prisma schema and real database persistence layer (no `prisma/schema.prisma`, no Prisma client usage).
- Practitioner profile route for `/practitioners/[slug]` (linked from cards but page not present).
- Booking widget embedded on practitioner profile (not present).
- Stripe payment workflow for video consultations (env keys exist; no payment routes/services/webhooks).
- Admin module(s) (no `app/dashboard/admin/*`, no admin APIs).
- Real authentication/session middleware (placeholder header auth only).
- Automated test suite (no unit/integration/e2e test files).

## Findings by requested checklist

### 1) Prisma schema usage

- **Issue:** No Prisma integration found in repository.
- **Impact:** All domain entities are transient and non-persistent.
- **Evidence:** No `prisma` directory or Prisma imports; domain repositories are in-memory arrays in route files/services.

### 2) In-memory repositories

- **Issue:** Practitioner, reason, appointment, and notification repositories are mocked in memory in API routes/pages/services.
- **Impact:** Data resets on restart, no transaction safety, race-condition protections are process-local only.
- **Status:** Acceptable for MVP demo, but must be clearly isolated and replaced behind explicit repository interfaces.

### 3) Authentication inconsistencies

- **Issue:** Auth depends on user-controlled `x-user-id` / `x-user-role` headers in both APIs and server pages.
- **Impact:** Header spoofing risk if upstream proxy/middleware is misconfigured; no session/token verification.
- **Issue:** Some pages simulate identity purely client-side (`currentUser` constants).

### 4) Route inconsistencies

- **Broken/missing route link:** `PractitionerCard` links to `/practitioners/[slug]`, but no matching page exists.
- **Broken/missing route link:** Booking success links to `/dashboard/patient/appointments`, but only `/dashboard/patient` exists.
- **Placeholder route:** Dashboard documents link uses `href="#"`.

### 5) TypeScript errors

- `npm run typecheck` passes.

### 6) ESLint issues

- `npm run lint` passes.

### 7) Broken imports or missing files

- No compile-time missing imports found (typecheck clean).
- Functional missing pages exist for linked routes (see route inconsistencies).

### 8) Duplicate components / setup files

- No obvious duplicate app bootstrap/setup files detected.
- No critical component duplication found during file inventory.

### 9) README inconsistencies

- README describes broad production-readiness practices and some module states that are still placeholders/mocked.
- README documents routing/flows that partly depend on non-existent routes (`/practitioners/[slug]`, `/dashboard/patient/appointments` references via UI links).
- README should explicitly declare integration maturity and link this audit.

### 10) Environment variable inconsistencies

- Env schema includes future Stripe/email/auth/database variables as optional in non-production and required in production mode.
- `.env.example` is referenced in README but does not exist in repo.

### 11) Security issues from placeholder auth

- Header-based identity is the highest-risk gap; roles are not cryptographically bound to user sessions.
- No central auth middleware; checks are distributed and inconsistent across modules.
- In-memory rate-limit store is single-instance only.

### 12) Pages depending on fake data

- Patient dashboard uses local seed data and local state mutations.
- Booking success and consultation pages load from local in-file appointment datasets.
- Availability dashboard uses local rule/blocked-date arrays.
- These pages should be explicitly tagged as MVP placeholders in docs and in-code comments.

### 13) Missing roadmap modules

- Admin modules absent.
- Real practitioner profile + booking widget absent.
- Payment, webhook, and invoicing flows absent.
- Testing and CI enforcement absent.

### 14) Stripe payment for video consultation

- **Not implemented.** Only env variable placeholders exist.

### 15) Practitioner profile and booking widget

- **Not implemented** as routes/components; only links point toward anticipated profile routes.

### 16) Admin modules

- **Not implemented.**

### 17) Tests

- No automated test files detected.
- `npm test` currently aliases lint+typecheck, not functional tests.

## Critical issues

1. Header-spoofable auth model (`x-user-id`/`x-user-role`) used as trust source.
2. No persistent database layer (no Prisma schema/client), causing transient core medical booking data.
3. Route-level broken navigation to non-existent pages (`/practitioners/[slug]`, `/dashboard/patient/appointments`).
4. No automated tests for booking/availability/auth flows.

## Medium-priority issues

1. In-memory repositories mixed directly in route handlers (weak separation).
2. Missing `.env.example` despite setup instructions.
3. Distributed/instance-safe rate limiting not yet implemented.
4. Placeholder data pages are not consistently labeled in code.

## Low-priority issues

1. README verbosity vs implementation maturity can confuse contributors.
2. Some placeholder links (`#`) should be clearly marked non-functional.

## Recommended fix order

1. **Auth hardening first:** Introduce real session/token middleware; remove direct trust in user headers.
2. **Data layer integration:** Add Prisma schema, migrations, repository adapters, and transaction-safe booking writes.
3. **Routing integrity pass:** Fix broken links and add missing route stubs (or remove links until implemented).
4. **Testing baseline:** Add unit tests (validators/services) + integration tests (authz, booking conflicts).
5. **Operational hardening:** CI gates (lint/typecheck/tests/build), structured logging, production rate-limiter backend.
6. **Documentation alignment:** Keep README and audit synchronized with actual implementation status.

## Files that need refactoring (priority)

- `lib/security/access-control.ts` (replace header trust with verified auth context).
- `app/api/appointments/route.ts` (swap in-memory repository wiring for injected persistent adapter).
- `lib/services/appointment.service.ts` (repository abstraction is good; needs DB-backed implementation usage).
- `app/booking/success/[appointmentId]/page.tsx` (replace local seed dataset + fix dashboard link target).
- `app/consultation/[appointmentId]/page.tsx` (replace local dataset and bind to secure auth source).
- `app/dashboard/patient/page.tsx` (migrate from local state seed to server-backed data fetching/actions).
- `components/cards/PractitionerCard.tsx` (avoid linking to missing profile route until implemented).
- `README.md` (status transparency and real-vs-planned separation).

## Proposed next Codex prompts

1. "Implement secure server-side auth context using signed sessions/JWT middleware, replacing all direct `x-user-id`/`x-user-role` trust in API routes and server pages."
2. "Add Prisma baseline (`schema.prisma`, client setup, initial migration) for practitioners, reasons, appointments, notifications, and users; wire repository adapters without changing UI."
3. "Refactor appointment and availability APIs to use DB repositories and transaction-safe conflict handling; keep existing response contracts."
4. "Add route integrity fixes: either implement minimal `/practitioners/[slug]` and `/dashboard/patient/appointments` pages or update links to existing routes."
5. "Create initial test suite (Vitest/Jest + integration tests) covering validators, services, authz, and booking race scenarios."
6. "Add `.env.example`, CI workflow, and deployment hardening checks aligned with existing env schema."

## Production readiness score (0-100)

**Score: 46 / 100**

Rationale:
- + Strong modular TypeScript structure, validation patterns, and multiple end-to-end MVP flows.
- + Lint/typecheck clean.
- - No persistent DB integration (major).
- - Placeholder auth mechanism (major security risk).
- - No automated test coverage.
- - Some broken routes and placeholder modules still wired in user-visible flows.

