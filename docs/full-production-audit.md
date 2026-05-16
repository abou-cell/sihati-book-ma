# Full production-readiness audit

Date: **2026-05-16**

Scope: Next.js App Router + TypeScript application code, Prisma schema, repository/service layers, API routes, security helpers, Docker assets, GitHub Actions, and existing production-readiness documentation. This audit is documentation-only and does **not** modify application behavior or UI styling.

## Executive summary

Sihati is meaningfully closer to production than an early MVP: core protected APIs use central session/RBAC helpers, Zod validation is present on request boundaries, Stripe checkout/webhook code exists with signature verification and idempotency primitives, service-provider secrets are encrypted/masked, medical-document metadata is private-by-default, production environment validation fails closed for required secrets, and the required verification commands pass.

However, the repository is **not ready for regulated production medical appointment traffic**. The dominant blockers are operational and security-hardening gaps: no complete login/session issuance flow, no Prisma migrations or seed/runbook artifacts in-repo, no real object-storage transfer endpoint or S3 presign integration for medical documents, no production video-provider integration, demo/sample data remains in protected pages, and E2E/integration coverage is not yet broad enough for PHI/payment workflows.

## Verification command results

| Command | Result | Notes |
| --- | --- | --- |
| `npm run lint` | Pass | ESLint completed with exit code 0. npm printed `Unknown env config "http-proxy"` warning. |
| `npm run typecheck` | Pass | TypeScript completed with exit code 0. npm printed `Unknown env config "http-proxy"` warning. |
| `npm test` | Pass | Vitest completed with **20 test files passed** and **97 tests passed**. npm printed `Unknown env config "http-proxy"` warning. |
| `npm run build` | Pass | Next.js 16.2.6 production build completed; standalone output routes were generated. npm printed `Unknown env config "http-proxy"` warning and Next.js telemetry notice. |
| `npm audit --audit-level=moderate` | Pass | `found 0 vulnerabilities`. npm printed `Unknown env config "http-proxy"` warning. |

## Severity scale

- **Critical**: blocks safe production launch or can directly expose PHI/secrets, bypass auth, corrupt money/clinical data, or break production operations.
- **High**: serious launch blocker or likely security/availability/compliance failure under realistic production use.
- **Medium**: important hardening, operational, or quality gap that should be fixed before broad launch.
- **Low**: cleanup, documentation, or defense-in-depth item that does not independently block a controlled staging pilot.

## Findings

### Critical

#### C-01 — No complete production authentication lifecycle is present

- **Finding**: Protected server and API code can verify signed session tokens/cookies and rejects demo headers in production, but the repository does not include a production login, logout, registration, password reset, MFA, account lockout, session revocation, token rotation, or identity-provider verification flow. The data model has `passwordHash`, but no credential hashing/verification endpoints are present.
- **Risk**: Production operators cannot safely onboard real users or recover accounts. If teams manually mint sessions, there is no auditable lifecycle, revocation mechanism, or credential policy appropriate for a medical platform.
- **Affected files**: `lib/auth/session.ts`, `lib/auth/current-user.ts`, `lib/auth/permissions.ts`, `prisma/schema.prisma`, `docs/authentication.md`, `docs/firebase-auth-guide.md`.
- **Recommended fix**: Select one production auth strategy and implement it end to end: either hardened first-party credentials with Argon2/bcrypt, email verification, password reset, MFA, lockout, session revocation and secure cookie issuance; or Firebase/OIDC/JWT verification with server-side token validation and synchronized app roles. Add login/logout/session-refresh routes and a user provisioning/admin workflow.
- **Suggested tests**: Unit tests for token verification/expiry/revocation; API tests for login/logout/session refresh; negative tests for demo headers in production; E2E tests for patient, practitioner, and admin login flows; security tests for lockout, expired tokens, revoked tokens, and tampered cookies.

#### C-02 — Medical document storage is not production-transfer safe yet

- **Finding**: Medical-document metadata and access checks exist, but signed URLs point to a configurable base URL or a local `/api/private-medical-documents` path that is not implemented in the repository. There is no S3 presigned upload/download adapter, no object existence/status finalization route, no malware scanning/quarantine process, and no storage bucket policy artifact.
- **Risk**: PHI upload/download flows cannot be safely operated in production. A caller may receive unusable URLs, objects may remain `PENDING_UPLOAD`, and production teams lack enforceable private storage controls, scanning, retention, and deletion guarantees.
- **Affected files**: `app/api/medical-documents/route.ts`, `lib/services/medical-document.service.ts`, `lib/storage/medical-document-storage.ts`, `lib/repositories/medical-document.repository.ts`, `prisma/schema.prisma`, `docs/privacy.md`.
- **Recommended fix**: Implement a production `S3_PRIVATE` storage adapter using AWS SDK presigned POST/PUT and GET URLs; add a callback/finalization endpoint that validates checksum, MIME, size, object key ownership, and object existence before marking documents `AVAILABLE`; add virus scanning/quarantine, lifecycle policies, encryption-at-rest policy, object lock/retention decisions, and verified soft/hard deletion workflows.
- **Suggested tests**: Storage adapter unit tests with mocked S3; API tests for upload, finalization, download, delete, and unauthorized cross-patient access; integration tests against LocalStack or an AWS test bucket; E2E tests for patient upload and practitioner access; tests that deleted documents cannot be downloaded.

#### C-03 — Prisma migrations, seed, backup, and rollback readiness are missing from the repo

- **Finding**: `prisma/schema.prisma` exists, but there is no `prisma/migrations` directory, no seed script, and Docker Compose uses `prisma db push` for development. The package exposes `prisma:migrate:deploy`, but there are no checked-in migrations to deploy.
- **Risk**: Production database changes cannot be reviewed, replayed, rolled back, or promoted consistently. A schema drift or failed deploy could corrupt appointment/payment/PHI data or block recovery during an incident.
- **Affected files**: `prisma/schema.prisma`, `package.json`, `docker-compose.yml`, `docs/database-production-runbook.md`, `docs/database-integration.md`.
- **Recommended fix**: Generate an initial baseline migration and require all future schema changes via `prisma migrate dev`/reviewed SQL. Add a non-PHI seed script for local/staging only, migration deployment instructions, rollback playbooks, backup/restore drills, PITR documentation, and a CI gate that fails if schema changes lack migrations.
- **Suggested tests**: CI test for `prisma migrate deploy` against disposable PostgreSQL; schema drift check; seed idempotency test; backup/restore rehearsal in staging; rollback drill for at least one migration.

### High

#### H-01 — Demo/sample data remains in protected production-facing flows

- **Finding**: Patient dashboard and booking-success pages still use hard-coded demo appointment/user records. GitHub Pages preview auth can return an admin identity. Public dynamic pages include static sample practitioners/specialties.
- **Risk**: Protected pages can show misleading or incorrect medical/appointment data after authentication. Demo records in patient/practitioner flows undermine authorization confidence and can mask missing database-backed ownership checks.
- **Affected files**: `app/dashboard/patient/PatientDashboardClient.tsx`, `app/booking/success/[appointmentId]/page.tsx`, `app/booking/new/BookingNewClient.tsx`, `lib/auth/session.ts`, `app/practitioners/[slug]/page.tsx`, `app/(public)/specialties/[specialty]/page.tsx`.
- **Recommended fix**: Replace protected dashboard/success pages with server-side, database-backed loaders that require authenticated user context and enforce ownership at query time. Ensure GitHub Pages preview behavior is impossible in production deployment environments and clearly separated from app production builds.
- **Suggested tests**: E2E tests proving patient A cannot view patient B appointment success or dashboard records; page tests with no session, patient session, practitioner session, and admin session; production-build test that preview admin bypass is disabled outside `GITHUB_PAGES=true`.

#### H-02 — RBAC is centralized, but route inventory enforcement and resource-query scoping are incomplete

- **Finding**: Central helpers enforce roles and ownership in several APIs/services, but there is no middleware or automated inventory proving every protected route/page uses them. Protected pages such as dashboards can render client/demo data, while future detail APIs may accidentally bypass ownership checks.
- **Risk**: New routes can be added without role checks, and page-level data fetching may accidentally expose appointment or PHI data outside the intended owner/practitioner/admin scope.
- **Affected files**: `lib/security/access-control.ts`, `lib/auth/current-user.ts`, `app/dashboard/**`, `app/api/**`, `lib/repositories/**`.
- **Recommended fix**: Add a route authorization matrix and tests that every protected route/page maps to a required role and ownership strategy. Prefer repository methods that scope by `currentUser`/tenant predicates rather than fetching broad records then filtering in memory.
- **Suggested tests**: API route inventory tests; resource ownership tests for appointment, payment, medical document, video, and admin routes; regression tests for forbidden cross-user IDs in query/body params.

#### H-03 — Payment flow is close but not fully production-hardened

- **Finding**: Stripe checkout creation validates appointment ownership/payability, uses idempotency keys, and webhook signature verification exists. Gaps remain around webhook event sequencing, Stripe API version pinning/observability, reconciliation jobs, explicit currency/amount policy, refund/cancellation paths, and production dashboard configuration.
- **Risk**: Duplicate/out-of-order Stripe events, missed webhooks, or operational disputes could leave appointments and payments inconsistent. Lack of reconciliation can silently miss paid appointments.
- **Affected files**: `app/api/payments/checkout/route.ts`, `app/api/stripe/webhook/route.ts`, `lib/services/payment.service.ts`, `lib/repositories/payment.repository.ts`, `prisma/schema.prisma`, `docs/payments.md`.
- **Recommended fix**: Pin/record Stripe API version expectations, add payment state transition rules that reject invalid downgrades after success, add webhook retry/reconciliation jobs, support refunds/cancellations, persist full safe provider status metadata, and document live-mode Stripe dashboard/webhook setup.
- **Suggested tests**: Unit/API tests for duplicate, out-of-order, missing-payment, expired-session, failed-payment, and succeeded-payment events; integration tests using Stripe CLI fixtures; reconciliation job tests; E2E checkout happy path in Stripe test mode.

#### H-04 — Video consultation uses placeholder provider URL and has token exposure concerns

- **Finding**: Video access is authorized by appointment ownership, status, type, and access window, and a short-lived room token is generated. The default adapter still points to `https://video.sihati.local/rooms`, no real Cloudflare/Daily/Twilio/Jitsi provider API is integrated, tokens are passed in URL query strings, and CSP `frame-src` allows `meet.jit.si` rather than the default provider domain.
- **Risk**: Production video sessions cannot be joined reliably, and URL-based room tokens can leak through browser history, logs, referrers, or analytics. CSP/provider mismatch can break embeds or encourage weakening CSP.
- **Affected files**: `lib/services/video-consultation.service.ts`, `app/consultation/[appointmentId]/page.tsx`, `next.config.ts`, `docs/video-consultation.md`.
- **Recommended fix**: Implement a real video provider adapter that creates provider rooms/tokens server-side with provider TTLs and participant roles. Prefer POST/session exchange or provider SDK tokens over query-string credentials. Align CSP with the selected provider and prevent early token issuance if the business rule is “waiting room only.”
- **Suggested tests**: Provider-adapter contract tests; authorization tests for patient/practitioner/admin/stranger; token expiry/tamper tests; CSP/build tests for provider domains; E2E test for joining only inside the allowed window.

#### H-05 — Logging redaction is partial and generic error logs may still include sensitive messages

- **Finding**: Audit logs redact common sensitive fields and avoid PHI-heavy payloads, but `logError` serializes arbitrary `Error.message` values in production. Zod and application errors currently use mostly safe messages, but future thrown errors from providers/ORMs may include emails, object keys, URLs, or SQL details.
- **Risk**: PHI, signed URLs, webhook payload fragments, or secrets can enter centralized logs through unexpected provider/ORM error messages, creating a compliance and incident-response risk.
- **Affected files**: `lib/security/errors.ts`, `lib/security/audit-log.ts`, `app/api/**`, `lib/services/**`.
- **Recommended fix**: Reuse `redactForAudit` or a dedicated redactor inside `logError`; log stable error codes/classes in production; include sensitive-data logging tests for emails, phones, signed URLs, authorization headers, file names, and provider secrets.
- **Suggested tests**: Unit tests for production error serialization; API tests that failed requests do not log request bodies or sensitive query params; snapshot tests for redacted audit/error payloads.

#### H-06 — Production secrets exist as placeholders in Docker Compose production profile

- **Finding**: `docker-compose.yml` includes an `app-prod` profile with placeholder production values such as `change_me_to_a_real_32_character_secret`, `sk_test_placeholder`, `whsec_placeholder`, and a static encryption key.
- **Risk**: A rushed deployment could run with known placeholder credentials, weak encryption material, or test Stripe keys. Even if environment validation passes length checks, secrets may not be strong or unique.
- **Affected files**: `docker-compose.yml`, `lib/env.ts`, `docs/docker.md`, `docs/configuration.md`.
- **Recommended fix**: Remove production secrets from Compose or require `.env.production.local`/secret manager injection. Add explicit placeholder-value denylist validation for known sample values and static keys. Document `openssl rand -base64 32` and secret rotation steps.
- **Suggested tests**: Environment validation tests rejecting known placeholder strings; Docker Compose config test with missing secrets; deployment smoke test proving real secret injection from the target secret manager.

#### H-07 — CI/CD has quality gates but deploy workflow is not production-grade

- **Finding**: CI runs lint, typecheck, tests, Prisma validate, build, and npm audit. The deploy workflow targets GitHub Pages static export with Node 20 and `npm install`; it is not suitable for the server/API/PostgreSQL/Stripe/PHI production app and does not run migrations or deployment smoke tests.
- **Risk**: Teams may mistake the Pages deployment for production readiness. Production deploys could skip migrations, smoke tests, environment validation, rollback automation, image scanning, and AWS infrastructure checks.
- **Affected files**: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `scripts/build-next.mjs`, `docs/aws-deployment.md`, `docs/deployment.md`.
- **Recommended fix**: Separate preview/static demo deployment from production deployment. Add a production workflow that builds an immutable image, scans it, deploys to staging, runs migrations with approvals, executes smoke/E2E tests, promotes to production, and supports rollback.
- **Suggested tests**: Workflow tests/dry-runs; staging smoke test job; migration job against staging DB; container vulnerability scan gate; Playwright E2E gate before production promotion.

### Medium

#### M-01 — Environment validation fails closed but static build bypass and placeholder strength checks need tightening

- **Finding**: Production runtime requires database/auth/encryption/Stripe/email/rate-limit/medical-document secrets, but `NEXT_PHASE=phase-production-build` bypasses required-production checks to allow builds. Placeholder-looking values can still satisfy minimum length/URL schemas.
- **Risk**: A built image can be produced without a deploy-time env proof, and weak placeholder secrets can be accepted if they meet length/shape requirements.
- **Affected files**: `lib/env.ts`, `tests/unit/env.test.ts`, `.github/workflows/ci.yml`, `Dockerfile`, `docker-compose.yml`.
- **Recommended fix**: Keep build-time flexibility, but add an explicit `npm run env:check:prod` runtime/deploy step and denylist placeholder values. Validate `NEXT_PUBLIC_APP_URL` is HTTPS outside local/test, and require `MEDICAL_DOCUMENTS_STORAGE_PROVIDER=S3_PRIVATE` for production unless a documented exception is set.
- **Suggested tests**: Unit tests for placeholder denylist and HTTPS URL policy; CI production-env validation job; container startup smoke test with missing/placeholder secrets.

#### M-02 — Rate limiting has Redis support but operational hardening is incomplete

- **Finding**: Production requires Redis/Upstash config and Redis REST adapter support exists. The adapter is created per request, has no circuit breaker/timeout, and policies are static rather than tuned per IP, user, role, route, or provider risk.
- **Risk**: A slow Redis endpoint can tie up request processing, and fixed thresholds may be too permissive for auth/payment/admin endpoints or too restrictive for legitimate traffic.
- **Affected files**: `lib/security/rate-limit.ts`, `lib/env.ts`, `app/api/**`.
- **Recommended fix**: Add fetch timeouts, circuit breaker/observability, response headers (`Retry-After`, remaining/reset), provider-specific webhook allowlisting where possible, and tighter policies for admin/payment/document operations.
- **Suggested tests**: Redis timeout tests; 429 header tests; load tests per route; production smoke test against the chosen Redis provider.

#### M-03 — API validation is present but not uniformly strict against unknown input

- **Finding**: API routes generally use Zod schemas, but most schemas do not explicitly call `.strict()`. Unknown body fields may be ignored silently, and query/body ID policy is not centralized.
- **Risk**: Silent acceptance of unexpected fields can hide client bugs, security probing, or future mass-assignment risks if parsed payloads are later passed deeper into data layers.
- **Affected files**: `lib/validators/*.ts`, `app/api/**`.
- **Recommended fix**: Make request body schemas strict unless there is a compatibility reason; centralize ID format validation; reject unknown query params on sensitive endpoints.
- **Suggested tests**: API tests that unknown fields return `VALIDATION_ERROR`; validator tests for ID formats, date ranges, amounts, and enum combinations.

#### M-04 — Appointment booking needs stronger concurrency and availability guarantees

- **Finding**: Appointment creation checks for an existing slot inside a transaction, but the schema does not define a partial unique constraint for active appointments by practitioner/start time. PostgreSQL cannot directly express the current “not cancelled” partial uniqueness through Prisma schema alone without SQL migration.
- **Risk**: Under concurrent requests, duplicate active appointments may still be possible depending on transaction isolation and query timing.
- **Affected files**: `lib/services/appointment.service.ts`, `lib/repositories/appointment.repository.ts`, `prisma/schema.prisma`.
- **Recommended fix**: Add a database-level partial unique index via SQL migration for active appointment slots or use serializable transactions/advisory locks. Re-check availability against rules and blocked dates at booking time, not only client-selected slots.
- **Suggested tests**: Concurrent booking integration test against PostgreSQL; migration test proving duplicate active slot insert fails; tests for blocked-date/rule revalidation during booking.

#### M-05 — AWS deployment documentation exists, but infrastructure artifacts are not executable

- **Finding**: AWS deployment docs cover EC2/RDS/S3/CloudFront/Route53 concepts, but there are no Terraform/CDK/CloudFormation assets, IAM policies, bucket policies, ECS/App Runner configuration, or automated backup alarms in the repo.
- **Risk**: Production AWS setup is manual and hard to reproduce or audit. IAM/S3/RDS mistakes can expose PHI or cause outages.
- **Affected files**: `docs/aws-deployment.md`, `docs/deployment.md`, `docs/database-production-runbook.md`, `Dockerfile`.
- **Recommended fix**: Add infrastructure-as-code for network, compute, RDS, S3 private bucket/KMS, Redis, secret manager, alarms, logging, WAF, and deployment roles. Include least-privilege IAM policies and runbooks.
- **Suggested tests**: IaC validation/plan in CI; policy linting; staging deploy; AWS Config/Security Hub checks; backup/restore drill.

#### M-06 — Docker assets build, but local production parity is limited

- **Finding**: Dockerfile uses a standalone runner and non-root user, but Compose production profile relies on placeholders and does not run migrations before app startup. Development Compose uses `db push` rather than migrations.
- **Risk**: Local production rehearsal can diverge from real production and hide migration/startup failures.
- **Affected files**: `Dockerfile`, `docker-compose.yml`, `package.json`, `docs/docker.md`.
- **Recommended fix**: Add a migration job/service for production-like Compose, use env files instead of embedded placeholders, add healthchecks for app-prod, and document exact local release rehearsal commands.
- **Suggested tests**: `docker compose --profile prod config`; container build in CI; app healthcheck after `prisma migrate deploy`; smoke test against containerized app and DB.

#### M-07 — Test coverage is good for unit/API foundations but lacks E2E and real database/provider integration

- **Finding**: The suite has 20 passing test files and 97 tests, including validators/security/services/API basics. It lacks browser E2E coverage, real PostgreSQL integration tests for repositories/migrations, and provider-contract tests against Stripe/S3/video/email sandboxes.
- **Risk**: Critical user journeys can regress despite unit/API tests passing, especially auth, booking, payment, document upload/download, and admin configuration flows.
- **Affected files**: `tests/**`, `vitest.config.ts`, `package.json`, `.github/workflows/ci.yml`.
- **Recommended fix**: Add Playwright E2E, Testcontainers/ephemeral PostgreSQL integration tests, Stripe CLI fixture tests, S3/LocalStack tests, and coverage thresholds for security-critical modules.
- **Suggested tests**: Patient booking/checkout E2E; practitioner availability E2E; admin service config E2E; repository integration tests; webhook fixture replay tests.

#### M-08 — Admin service configuration encryption is solid but key rotation and enablement validation are missing

- **Finding**: Secrets are AES-256-GCM encrypted and masked in responses, but there is no key ID/version, rotation workflow, or provider-specific validation before enabling services.
- **Risk**: Rotating `APP_ENCRYPTION_KEY` may make existing secrets undecryptable, and admins can enable providers with incomplete or invalid credentials.
- **Affected files**: `lib/security/encryption.ts`, `lib/services/app-config.service.ts`, `app/api/admin/service-config/route.ts`, `lib/validators/service-config.ts`, `prisma/schema.prisma`.
- **Recommended fix**: Add encrypted payload key version/KMS key ID, rotation tooling, provider-specific required secret schemas, validation/ping checks before enabling, and break-glass recovery docs.
- **Suggested tests**: Encryption/decryption compatibility tests; rotation tests; provider config validation tests; tests that list responses never return plaintext secrets.

### Low

#### L-01 — CSP and permissions policy need final provider alignment

- **Finding**: Security headers are present, but CSP keeps `unsafe-inline`, `connect-src` is only self, `frame-src` currently allows `meet.jit.si`, and Permissions-Policy allows camera/microphone broadly.
- **Risk**: Final production providers for Stripe, video, analytics, storage, and monitoring may require CSP changes; broad camera/microphone policy is more permissive than necessary.
- **Affected files**: `next.config.ts`, `docs/security.md`.
- **Recommended fix**: Finalize CSP after provider selection, use nonces/hashes where practical, narrow camera/microphone permissions to video routes/origins if feasible, and add CSP report-only monitoring before enforcement.
- **Suggested tests**: Header snapshot tests; CSP violation monitoring in staging; browser E2E for Stripe/video/document flows under final CSP.

#### L-02 — Secret exposure scan is currently manual/ad hoc

- **Finding**: `npm audit` passes and placeholder values are visible, but no dedicated secret scanner such as Gitleaks/TruffleHog is configured in CI.
- **Risk**: Future commits can accidentally introduce real credentials, signed URLs, private keys, or PHI fixtures without being blocked.
- **Affected files**: `.github/workflows/ci.yml`, `package.json`, repository root.
- **Recommended fix**: Add a CI secret-scan job and pre-commit guidance. Maintain an allowlist for documented placeholders only.
- **Suggested tests**: CI secret scanner with a harmless canary fixture in test mode; policy test that real-looking tokens fail.

#### L-03 — Notification/email provider remains MVP-like

- **Finding**: Notification service has console/MVP placeholder behavior for delivery channels and no production Resend/provider adapter with retry/dead-letter handling.
- **Risk**: Patients and practitioners may miss confirmations, reminders, cancellations, or video links, impacting care operations.
- **Affected files**: `lib/services/notification.service.ts`, `emails/templates/notification.templates.ts`, `prisma/schema.prisma`, `docs/debugging-maintenance.md`.
- **Recommended fix**: Implement a production email provider adapter, durable queue/retry policy, delivery status reconciliation, unsubscribe/notification preferences as required, and operational alerts for failures.
- **Suggested tests**: Provider adapter tests; template rendering tests; retry/dead-letter tests; E2E confirmation email smoke test in staging.

#### L-04 — Review endpoint correctly fails closed but feature readiness is absent

- **Finding**: Reviews route returns explicit `501` rather than fake success. There is no persisted review model or moderation/abuse workflow.
- **Risk**: Not a security blocker if disabled, but product promises around reviews should not be exposed in production navigation until implemented.
- **Affected files**: `app/api/reviews/route.ts`, `docs/security.md`, product UI copy if reviews are shown.
- **Recommended fix**: Keep reviews hidden/disabled until a Prisma model, ownership checks, moderation, abuse reporting, and practitioner response policy exist.
- **Suggested tests**: Endpoint remains `501` while disabled; future create/list tests enforce completed-appointment ownership and moderation status.

## Area-by-area status

| Audit area | Status | Highest severity |
| --- | --- | --- |
| Authentication and session security | Not production-ready | Critical |
| RBAC and resource ownership checks | Partially ready | High |
| API validation and error handling | Partially ready | Medium |
| Stripe checkout and webhook readiness | Partially ready | High |
| Medical document privacy and storage safety | Not production-ready | Critical |
| Video consultation authorization and token strategy | Partially ready | High |
| Admin service configuration encryption and secret masking | Mostly ready with rotation gap | Medium |
| Rate limiting and abuse protection | Partially ready | Medium |
| Prisma schema, migrations, seed, backup, rollback | Not production-ready | Critical |
| Docker and local deployment readiness | Partially ready | Medium |
| AWS deployment readiness | Documentation-only | Medium |
| CI/CD gates and GitHub Actions | Partially ready | High |
| Logging, audit trail, PHI/secret redaction | Partially ready | High |
| Unit, integration, and E2E test coverage | Unit/API baseline ready; E2E/integration gap | Medium |
| Placeholder/demo/sample data in protected production flows | Not production-ready | High |
| Environment variable validation and production fail-fast | Mostly ready with hardening gap | Medium |
| Dependency and secret exposure scan | Dependency audit ready; secret scan gap | Low |

## Recommended production-readiness sequence

1. Implement and test the production authentication lifecycle.
2. Add Prisma migrations, database seed policy, staging migration deployment, and backup/restore drills.
3. Replace protected demo pages with database-backed, ownership-scoped data loaders.
4. Implement production medical-document storage with S3/private URLs, finalization, scanning, and retention/deletion controls.
5. Finish Stripe operational hardening and reconciliation.
6. Replace placeholder video adapter with the chosen provider integration and safer token exchange.
7. Add E2E, PostgreSQL integration, provider sandbox, and security logging tests to CI.
8. Add production deployment workflow/IaC with environment validation, migrations, smoke tests, image/secret scans, and rollback.

## Final audit conclusion

Sihati has a strong code-quality and security foundation, and all requested local verification commands pass. It should be treated as **staging/MVP-ready, not production-ready** for real medical appointment traffic until the Critical and High findings above are resolved and verified in a production-like environment.
