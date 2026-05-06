# Sihati Final Technical Audit Report

Audit date: 2026-05-06

## Executive summary

Sihati has a recognizable Next.js App Router application structure with public search, practitioner profile placeholders, booking confirmation, patient/practitioner/admin dashboard placeholders, availability validation, appointment creation, Prisma models, environment validation, and foundational API error handling. The codebase is suitable for continued stabilization, but it is **not production-ready**.

The dominant blockers are operational and security-related rather than visual: authentication is a demo header-based mechanism, many flows still use mock or in-memory data, the build currently fails because `autoprefixer` is referenced but not installed, database migration/seed/CI/Docker/AWS assets are missing, and several production flows are placeholders. There is also a dependency audit finding in the installed Next.js dependency tree and no automated test suite beyond lint/typecheck wiring.

**Production readiness score: 38 / 100**

Rationale: the project has a solid skeleton and typed validation patterns, but production release would expose unacceptable risks around authentication, authorization, persistence completeness, video room security, notification delivery, testing, deployment reproducibility, and build reliability.

## Current project status

- Framework: Next.js App Router with React and TypeScript.
- Styling: Tailwind CSS with shared UI primitives.
- Persistence: Prisma schema exists for users, practitioners, availability, appointments, and notifications, with repository classes for several modules.
- Runtime configuration: Zod-based environment validation exists.
- Quality scripts: `lint`, `typecheck`, `check`, and `test` are defined, with `test` currently aliasing `check`.
- Release state: final stabilization candidate, but still dependent on demo sessions, mock data, placeholder endpoints, and missing deployment assets.

## Audit scope and commands executed

- Inspected repository files, app routes, API handlers, Prisma schema, auth/session utilities, validators, services, repositories, docs, and configuration files.
- Ran `npm run check` before the production build: completed with no errors, but reported one ESLint warning for an unused disable directive in `lib/db/prisma.ts`.
- Ran `npm run check` again after `npm run build` generated `.next/types`: failed with typed-route errors for dynamic URL construction in `app/(public)/search/page.tsx` and links to missing practitioner/patient appointment routes.
- Ran `npm audit --audit-level=moderate`: failed with 2 moderate vulnerabilities in the Next.js dependency tree through `postcss <8.5.10` under `node_modules/next/node_modules/postcss`.
- Ran `npm run build`: failed because `postcss.config.mjs` references `autoprefixer`, but `autoprefixer` is not listed in dependencies/devDependencies.
- Checked installed dependency versions from `package-lock.json`: installed `next` is `16.2.4`; top-level `postcss` is `8.5.13`; nested Next PostCSS is `8.4.31`.

## 1. Project architecture

### Strengths

- Clear App Router structure under `app/`.
- Reusable UI components under `components/`.
- Business-ish service classes under `lib/services/`.
- Persistence adapters under `lib/repositories/` and `lib/repositories/mock/`.
- Shared validation under `lib/validators/`.
- Security/auth helpers are grouped under `lib/security/` and `lib/auth/`.
- Prisma schema is centralized under `prisma/schema.prisma`.

### Risks

- Production and demo concerns are mixed. Some modules select Prisma when `DATABASE_URL` exists and mock repositories otherwise, while other pages hard-code in-memory data.
- There is no consistent application boundary for server-only modules, repositories, and route handlers.
- There is no CI, no deployment manifest, no migration workflow, no Dockerfile, and no AWS infrastructure definition.
- Several dashboard routes are placeholders, but their labels imply production capabilities.

## 2. Frontend structure

### Implemented

- Home page shell.
- Public practitioner search page with URL-synchronized filters.
- Practitioner profile placeholder with booking CTAs.
- Booking confirmation page.
- Patient dashboard demo UI.
- Practitioner dashboard and availability demo UI.
- Admin catalog and practitioner validation placeholder pages.
- Video consultation page with waiting-room logic.

### Risks

- Several pages rely on seeded client-side arrays instead of API/database data.
- The home page search form does not submit to the search page.
- Practitioner profile booking CTAs generate query parameters that do not match the booking page's required schema.
- Availability management validates locally but does not persist.
- Patient cancellation updates local component state only.
- Dashboard links include routes that do not exist, such as `/dashboard/practitioner/appointments`.

## 3. Backend/API routes

### Implemented endpoints

- `GET /api/practitioners/search`
- `GET /api/practitioners/[id]/available-slots`
- `POST /api/appointments`
- `GET /api/medical-documents`
- `GET /api/reviews`
- `POST /api/payments/checkout`
- `POST /api/stripe/webhook`

### Assessment

- Search and slot APIs have meaningful validation and service/repository layers.
- Appointment creation has role enforcement, rate limiting, and conflict checks.
- Medical documents, reviews, payments, and Stripe webhook routes are placeholders.
- There are no API tests, no route contract tests, no OpenAPI/schema documentation, and no consistent auth policy matrix.

## 4. Authentication and session handling

### Current implementation

- API and page auth reads `x-user-id` and `x-user-role` demo headers.
- Page guards redirect to `/access-denied` when headers are missing or roles are not allowed.
- API guards throw structured `401`/`403` errors through shared error handling.

### Critical risk

This is not real authentication. Any client capable of setting headers can impersonate a patient, practitioner, clinic admin, or admin unless a trusted upstream system strips and injects those headers. The app needs real login, password/session or OAuth handling, secure cookies, CSRF strategy, session expiration, rotation, audit logging, and server-side user lookups before production.

## 5. User roles and permissions

### Current implementation

- TypeScript roles include `PATIENT`, `PRACTITIONER`, `ADMIN`, and `CLINIC_ADMIN`.
- Prisma `UserRole` enum only includes `PATIENT`, `PRACTITIONER`, and `ADMIN`.
- Role helpers support simple allow-list checks.

### Risks

- Role mismatch between TypeScript and Prisma can create authorization drift.
- There is no resource-level authorization model for practitioner ownership, clinic ownership, patient-owned data, documents, or admin actions.
- Demo headers bypass user repository validation.

## 6. Database/Prisma usage

### Implemented

- Prisma schema models users, practitioners, consultation reasons, availability rules, blocked dates, appointments, and notifications.
- Repositories exist for appointments, availability, practitioner search, notifications, and users.
- Prisma client singleton pattern is used.

### Risks

- No migration files are present.
- No seed script is present.
- No database indexes beyond appointment practitioner/start time.
- Some needed production entities are absent: medical documents, reviews, payments, audit logs, refresh/session tokens, clinics, practitioner validation documents, password reset tokens, consent records, and video session tokens.
- Appointment transaction uses `any` for the Prisma transaction client.
- Appointment conflict checks are application-level only; there is no database uniqueness/exclusion constraint preventing races across concurrent requests.

## 7. Mock data or in-memory repositories

### Findings

Mock or in-memory data exists in:

- Public practitioner search fallback repository.
- Availability fallback repository.
- Booking confirmation page practitioner/reason arrays.
- Patient dashboard profile and appointment arrays.
- Video consultation appointment array.
- Reviews endpoint demo array.
- Medical documents endpoint demo response.

### Risk

Mock data is useful for development but must not silently activate in production. The app should fail fast in production when required data services are missing, rather than falling back to mock repositories.

## 8. Appointment booking flow

### Implemented

- Booking page validates required booking parameters with Zod.
- Appointment API requires a patient role, rate-limits booking requests per user id, validates payload, checks practitioner verification, validates reason ownership, blocks past slots, checks slot conflicts, computes `endTime`, and creates a notification placeholder.

### Risks

- Practitioner profile CTAs pass `practitionerSlug` and `type`, while the booking page requires `practitionerId`, `reasonId`, `consultationType`, and `startTime`.
- Slot availability is not revalidated against generated availability rules during appointment creation; it checks only practitioner/reason/past/conflict.
- Video appointments are set to `PENDING`, but payment checkout is only a placeholder.
- Booking page uses demo patient headers from the browser.
- Confirmation UI only displays the created id and does not redirect to a durable success state after creation.

## 9. Practitioner availability flow

### Implemented

- Client-side availability rule form and blocked date validation.
- Validation for weekday, time ranges, break windows, consultation type, and date ranges.
- Slot generation service handles active rules, blocked dates, existing appointments, reason duration, breaks, and past slots.
- Public available-slots API limits date range to 30 days.

### Risks

- Availability dashboard does not persist to the database.
- There are no CRUD API routes for availability rules or blocked dates.
- Time calculations are UTC-based and not explicitly aligned with Morocco local time or daylight-saving/holiday behavior.
- Duplicate rule handling exists only in the client page.

## 10. Video consultation flow

### Implemented

- Video consultation page checks current demo user, participant status, appointment type, cancellation status, and access window.
- It uses a Jitsi URL and includes an iframe with camera/microphone permissions.

### Risks

- Appointments are hard-coded in memory.
- Room names are predictable (`sihati-apt-video-1`).
- No signed room token, no per-user JWT, no server-side room provisioning, no recording policy, no consent workflow, and no audit log.
- The page displays participant email addresses.
- Authorization still depends on demo headers.

## 11. Notification service

### Implemented

- Notification service supports email-oriented templates for appointment confirmation, cancellation, video link, and reminders.
- Notification repository persists notification records when database is available.
- Template notes explicitly say not to include diagnosis, symptoms, medical records, or payment card data.

### Risks

- Default sender logs notification content to console.
- Resend/API provider integration is not implemented despite environment variables.
- SMS/WhatsApp are placeholders.
- Reminder scheduling/worker queue is not implemented.
- Notification retry/backoff and idempotency are absent.

## 12. Security implementation

### Implemented

- Centralized error handling with request ids.
- Basic in-memory rate limiting utility.
- Upload metadata validation helper for file name, MIME type, extension, and size.
- `poweredByHeader` disabled in Next config.
- API input validation with Zod in key routes.

### Risks

- Demo header auth is the largest security blocker.
- In-memory rate limiting is not distributed and resets on deploy/restart.
- No CSRF protection for mutating routes.
- No security headers policy is defined for CSP, HSTS, frame ancestors, permissions policy, or referrer policy beyond a single iframe attribute.
- Stripe webhook route does not verify signatures.
- No request body size strategy is documented for uploads/webhooks.
- Error logger may log stack traces and operational details.
- No audit logging for sensitive actions.

## 13. Environment variables

### Implemented

- Zod validation for `NEXT_PUBLIC_APP_URL`, `DATABASE_URL`, `AUTH_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `EMAIL_FROM`, and `RESEND_API_KEY`.
- Production asserts required server env vars.
- README includes an environment table.

### Risks

- `.env.example` is referenced in README but is not present in the repository.
- `AUTH_SECRET`, Stripe, and email variables are validated but not wired to real production integrations.
- Production variable requirements can make build-time behavior brittle if build and runtime environments differ.
- No AWS parameter/secrets mapping is documented.

## 14. Dependency health

### Findings

- `npm audit --audit-level=moderate` reports 2 moderate vulnerabilities in Next's nested PostCSS dependency tree.
- Installed `next` is `16.2.4` through the lockfile even though `package.json` allows `^16.0.0`.
- `postcss.config.mjs` references `autoprefixer`, but `autoprefixer` is not installed, causing production build failure.
- No dependency update policy, Renovate/Dependabot config, or lockfile maintenance workflow exists.

## 15. TypeScript consistency

### Strengths

- `strict` TypeScript mode is enabled.
- `npm run typecheck` can pass in a clean tree, but fails after `.next/types` are generated by `npm run build` because typed routes detect dynamic route construction and links to missing routes.
- Zod-derived types are used in validators.

### Risks

- Several files use very long single-line JSX and route logic that is hard to review.
- Some repository code uses `any`, especially around Prisma transaction and mapped records.
- There is a custom `lib/types/prisma-client.d.ts`, which may mask generated Prisma client problems.
- Domain types are duplicated across services, repositories, pages, and Prisma enums.

## 16. ESLint consistency

### Strengths

- ESLint 9 flat config with Next core web vitals is configured.
- `npm run lint` completes without errors, but the combined `npm run check` can fail at typecheck time after `.next/types` are generated.

### Risks

- There is one warning for an unused `eslint-disable` directive.
- ESLint is not configured to enforce import consistency, no-floating-promises, testing-library rules, or security-oriented linting.
- Formatting is not standardized through Prettier or an equivalent command.

## 17. Responsive design risks

### Strengths

- Many layouts use responsive Tailwind utilities (`sm`, `md`, `lg`).
- Search results and filters use a mobile-friendly stacked layout.

### Risks

- Large tables/lists and long single-line consultation sections may overflow or be difficult on small screens.
- Video iframe height is fixed and may be poor on mobile.
- No screenshot, visual regression, or accessibility checks are part of CI.
- Form controls need accessibility review for labels and error descriptions.

## 18. Performance risks

- Search page fetches on URL/search param changes and may double-trigger because one effect writes params and another reads params.
- No debouncing for search filters.
- No caching strategy for public search/catalog metadata.
- Database queries lack indexes for common filters like city, specialty, verification, next availability, and consultation fee.
- No observability for slow routes, database timings, or frontend web vitals.

## 19. Data privacy risks

- Demo data includes emails and phone numbers.
- Video consultation page displays participant email addresses.
- Notification console logging includes recipient and message content.
- Medical document endpoint returns demo documents without authentication.
- There is no consent model, retention policy, export/delete workflow, or audit trail.
- There is no documented policy for Moroccan health-data requirements or cross-border processor handling.

## 20. Deployment readiness

### Current readiness

Low. The app cannot currently produce a successful production build in this environment because `autoprefixer` is missing.

### Missing

- CI workflow.
- Build/test/deploy gates.
- Deployment runbook tied to real platform steps.
- Healthcheck endpoint.
- Logging/monitoring/error tracking plan.
- Migration execution plan.
- Rollback plan.
- Secrets management plan.

## 21. Docker readiness

No Dockerfile, `.dockerignore`, or Compose file was found. Docker readiness is currently low.

Minimum required before container deployment:

- Multi-stage Dockerfile for Next.js production output.
- `.dockerignore` for `node_modules`, `.next`, logs, env files, and local artifacts.
- Runtime environment variable strategy.
- Non-root user.
- Healthcheck command or endpoint.
- Optional Compose profile for local Postgres.

## 22. AWS deployment readiness

No AWS-specific infrastructure files were found.

Missing AWS preparation:

- Target architecture decision: ECS/Fargate, App Runner, Elastic Beanstalk, Amplify Hosting, or another platform.
- RDS Postgres plan.
- Secrets Manager/SSM mapping.
- VPC/subnet/security group design.
- Container registry plan if using ECS/App Runner.
- CloudFront/WAF/TLS/domain plan.
- CloudWatch logs, alarms, and dashboards.
- Backup/restore and migration runbook.

## 23. Testing coverage

### Current state

- No dedicated unit, integration, end-to-end, accessibility, or visual tests are present.
- `npm test` aliases `npm run check`, so it does not execute behavioral tests.
- `npm run check` passes, but it only covers lint/typecheck.

### Required stabilization coverage

- Unit tests for validators and services.
- API route tests for authentication, validation, permissions, errors, and success contracts.
- Repository integration tests against a test Postgres database.
- Booking race-condition tests.
- End-to-end tests for search, booking, dashboards, and video access windows.
- Accessibility checks for public and dashboard pages.

## 24. Missing modules or incomplete modules

### Missing

- Real authentication and session management.
- Login/register/password reset flows.
- Persistent patient profile management.
- Practitioner profile CRUD and verification workflow.
- Availability CRUD APIs and persistence from dashboard.
- Appointment cancellation/rescheduling APIs.
- Payment checkout/session/webhook implementation.
- Medical document model/storage/access controls.
- Reviews model/API moderation controls.
- Notification provider integration and worker scheduling.
- Admin operational workflows.
- Docker/CI/AWS deployment infrastructure.
- Comprehensive tests.

### Incomplete

- Search uses Prisma when configured but loses richer mock fields such as ratings and address details.
- Booking page is not connected to profile/availability slot selection.
- Video consultation is demo-data based and unsecured for production.
- Environment configuration exists but lacks `.env.example` and deployment secret mapping.
- Documentation exists in multiple files but needs a production release runbook.

## 25. Documentation gaps

- No final release checklist before this report.
- No `.env.example` despite README instructions.
- No API contract document for all endpoints.
- No role/permission matrix.
- No data model lifecycle document.
- No security threat model.
- No incident response or audit logging policy.
- No Docker/AWS deployment implementation guide.
- No testing strategy with required coverage thresholds.
- No privacy/retention/consent documentation.

## Modules already implemented

- Next.js App Router shell and global layout.
- Public search UI and search API.
- Practitioner search validation/service/repositories.
- Available slots API and slot generation service.
- Appointment creation API and service.
- Prisma schema for core MVP entities.
- Basic page/API role guards through demo session headers.
- Patient dashboard demo page.
- Practitioner dashboard demo page.
- Availability validation UI and validator.
- Admin placeholder pages.
- Video consultation demo page.
- Notification service skeleton and Prisma notification repository.
- Environment validation and app config.
- Shared error handling, request IDs, basic rate limiting, upload metadata validation.

## Modules partially implemented

- Authentication/session handling: demo headers only.
- Authorization: role checks without resource ownership enforcement.
- Booking: API exists, but full slot-selection/profile-to-booking integration is incomplete.
- Availability: local UI validation and slot generation exist, but persistence CRUD is missing.
- Video consultation: page and basic checks exist, but production room security is absent.
- Notifications: templates and persistence exist, but real delivery/scheduling is absent.
- Payments: placeholder endpoint only.
- Reviews: demo endpoint only.
- Medical documents: demo endpoint only.
- Admin: placeholder pages only.
- Deployment docs: high-level notes exist, but no executable deployment assets.

## Missing modules

- Production auth provider/session store.
- CSRF protection.
- Full RBAC/ABAC matrix and resource-level guards.
- Migration files and seed workflow.
- Test framework setup and tests.
- CI workflow.
- Dockerfile and AWS infrastructure.
- Real email/SMS/WhatsApp providers.
- Payment implementation and webhook signature verification.
- Medical document storage and access controls.
- Audit logging and monitoring.
- Privacy/legal operational controls.

## Critical issues

1. **Demo header authentication can be spoofed.** Replace before any production or shared staging environment.
2. **Production build fails.** `autoprefixer` is configured but missing.
3. **Mock/in-memory data still backs major workflows.** Production can show false data or silently operate outside persistence.
4. **Stripe webhook accepts requests without signature verification.** This cannot be used with real payments.
5. **Video rooms are predictable and not token-protected.** This creates unauthorized access risk.

## High-priority issues

1. Add real authentication, secure cookies, session expiry, CSRF strategy, and server-side user lookup.
2. Remove production mock fallbacks and enforce fail-fast behavior for missing required services.
3. Add migrations, seed scripts, and database constraints/indexes.
4. Add availability CRUD APIs and persistence from the practitioner dashboard.
5. Connect practitioner profile, slot selection, booking, and success pages with consistent parameters.
6. Add automated tests for validators, services, APIs, and booking conflicts.
7. Add CI with lint, typecheck, tests, audit, and build.
8. Resolve dependency audit findings and pin/update dependency policy.

## Medium-priority issues

1. Add notification provider integration and background reminder worker.
2. Add real payment checkout and webhook processing.
3. Add medical document model, storage, scanning, and access policy.
4. Add review model and moderation workflow.
5. Add observability, structured logs, and request metrics.
6. Add security headers and CSP.
7. Add healthcheck endpoint.
8. Improve TypeScript domain type centralization.

## Low-priority issues

1. Remove unused ESLint disable comment.
2. Normalize quote/import style across files.
3. Split long JSX lines for maintainability.
4. Add richer docs navigation from README.
5. Add visual/accessibility checks after core production blockers are fixed.

## Security risks

- Spoofable header sessions.
- Missing CSRF controls.
- Placeholder Stripe webhook.
- Placeholder payment checkout.
- Predictable video room names.
- Console logging of notification recipients/messages.
- No distributed rate limiting.
- No production CSP/security header policy.
- No audit logs for admin, booking, document, or video actions.
- Public demo document/review endpoints without authorization.

## Authentication/session risks

- No login flow.
- No password hashing use outside schema field.
- No secure cookie session.
- No session persistence/revocation.
- No refresh token strategy.
- No server-side role lookup.
- Role mismatch: TypeScript includes `CLINIC_ADMIN`; Prisma does not.

## Database risks

- No migrations.
- No seed files.
- No production data bootstrap plan.
- Missing constraints for appointment slot uniqueness.
- Missing indexes for search and filtering.
- Missing core models for documents, reviews, payments, sessions, audit logs, clinics, and consent.
- Mock fallback can hide database configuration errors.

## API risks

- Placeholders return success-like payloads for payments and webhooks.
- Medical documents/reviews lack auth and persistence.
- No API contract tests.
- No idempotency for appointment creation/payment webhooks.
- No CSRF protection for browser-originating mutations.
- Error status mapping maps all appointment domain errors to `409`, even validation-like or not-found-like conditions.

## Frontend risks

- Demo dashboards may misrepresent persisted state.
- Profile-to-booking parameters are inconsistent.
- Home search form does not navigate.
- No loading/error patterns across all pages.
- Video iframe mobile behavior and privacy exposure need review.
- Accessibility labels and error announcements need testing.

## Deployment risks

- Build currently fails due missing `autoprefixer`.
- No Dockerfile.
- No CI workflow.
- Typed-route validation currently surfaces missing/invalid internal routes after build artifacts are generated.
- No migration execution strategy.
- No AWS architecture/infrastructure files.
- No secrets management mapping.
- No healthcheck/rollback/monitoring plan.
- Production env requirements are not backed by working integrations.

## Documentation gaps

- Production release runbook.
- Auth and permission matrix.
- API contract/reference.
- Database migration and backup policy.
- Docker and AWS implementation docs.
- Test plan and coverage expectations.
- Security threat model.
- Privacy, retention, and consent policy.
- Incident response and operational escalation docs.

## Recommended fix order

1. Fix build reproducibility: add missing PostCSS dependency or remove unused plugin reference, then verify `npm run build`.
2. Fix typed-route issues surfaced after build: replace invalid/missing links or add the intended routes, and ensure `npm run check` passes after build artifacts exist.
3. Replace demo header auth with real authentication/session handling and resource-level authorization.
4. Remove production mock fallbacks; make production require database and provider configuration.
5. Add Prisma migrations, seed workflow, missing constraints, and key indexes.
6. Complete booking integration across profile, availability slots, appointment API, and success page.
7. Persist practitioner availability from dashboard through authenticated APIs.
8. Secure video consultation with non-predictable room identifiers, signed access, and audit logs.
9. Implement Stripe checkout/webhook verification before enabling payment paths.
10. Implement notification provider delivery and scheduled reminders with retries.
11. Add test framework, unit/API/integration/E2E tests, and CI gates.
12. Add Dockerfile, healthcheck, and deployment runbooks.
13. Add AWS infrastructure and operational observability.
14. Complete privacy/security documentation and release checklist.

## Production readiness score

**38 / 100**

Score breakdown:

- Architecture: 6 / 10
- Frontend completeness: 5 / 10
- API/backend completeness: 5 / 10
- Authentication/authorization: 1 / 10
- Database readiness: 4 / 10
- Security posture: 3 / 10
- Testing: 1 / 10
- Deployment/Docker/AWS: 1 / 10
- Documentation: 5 / 10
- Operational readiness: 2 / 10

## Clear checklist for the next stabilization task

- [ ] Decide production auth approach and implement it without UI restyling.
- [ ] Remove browser-controlled demo auth headers from production paths.
- [ ] Align `UserRole` between Prisma and TypeScript.
- [ ] Fix `npm run build` by resolving the missing `autoprefixer` dependency/configuration issue.
- [ ] Fix typed-route failures for search URL replacement and missing dashboard appointment links.
- [ ] Address `npm audit` moderate vulnerability findings through safe dependency updates.
- [ ] Add `.env.example` matching `lib/env.ts` and README.
- [ ] Add migration files and a seed workflow.
- [ ] Add appointment slot uniqueness/race-condition protection.
- [ ] Add availability CRUD API routes and persist dashboard changes.
- [ ] Connect practitioner profile links to real slot selection and booking parameters.
- [ ] Replace placeholder payments and webhook behavior with verified Stripe integration or explicitly disable payment routes.
- [ ] Replace video demo data with database-backed appointments and signed room access.
- [ ] Add unit tests for validators/services.
- [ ] Add API route tests for auth, validation, and error handling.
- [ ] Add CI workflow that runs lint, typecheck, tests, audit, and build.
- [ ] Add Dockerfile, `.dockerignore`, and healthcheck.
- [ ] Write AWS deployment plan with RDS, secrets, logs, and rollback.
- [ ] Write privacy/retention/consent documentation for medical data.

## Created files

- `docs/final-audit-report.md`

## Modified files

- `README.md`
- `docs/final-audit-report.md`

## Main risks found

The main risks are spoofable demo authentication, build failure, placeholder payment/webhook endpoints, mock data in production-relevant flows, lack of migration/test/deployment infrastructure, and insufficient privacy/security controls for medical and video-consultation data.

## Recommended next prompt to run

```text
You are working on the Sihati repository. Based on docs/final-audit-report.md, perform the next stabilization task only: fix production build reproducibility and dependency health without changing UI style or business logic. Resolve the missing PostCSS/autoprefixer build issue, address safe dependency audit updates where possible, add or update documentation for the build checks, run lint/typecheck/build/audit, commit changes, and open a PR.
```

## Note on the final mandatory instruction

The request also included a broad instruction to refactor the project for production readiness, improve security and operational structure, add testing/deployment best practices, and optimize maintainability. That instruction conflicts with the explicit constraints for this task: do not implement new features, do not refactor large parts of the application, do not change UI style, create documentation/report files only, and do not modify business logic yet. Therefore, this audit documents the required production-readiness refactors and recommended order, but intentionally does not implement them in this task.
