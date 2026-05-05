# Sihati Completion Roadmap

_Last updated: May 5, 2026_

This roadmap is based on the current repository code and docs state. It is intentionally implementation-free and focused on planning, sequencing, risk control, and production readiness for a medical appointment platform.

---

## 1) Current implemented modules

### App routes (UI)
- Public discovery: home (`/`), search (`/search`), specialty listing (`/specialties/[specialty]`), practitioner profile (`/practitioners/[slug]`).
- Booking flow: booking confirmation (`/booking/new`), booking success (`/booking/success/[appointmentId]`).
- Consultation: video consultation room (`/consultation/[appointmentId]`).
- Dashboards: patient dashboard (`/dashboard/patient`), practitioner dashboard (`/dashboard/practitioner`), practitioner availability (`/dashboard/practitioner/availability`), admin catalog (`/dashboard/admin/catalog`), admin practitioners (`/dashboard/admin/practitioners`).
- Access page: `/access-denied`.

### API routes
- `GET /api/practitioners/search`
- `GET /api/practitioners/[id]/available-slots`
- `POST /api/appointments`
- `GET /api/medical-documents` (placeholder)
- `GET /api/reviews` (placeholder)
- `POST /api/payments/checkout` (placeholder)
- `POST /api/stripe/webhook` (placeholder)

### Components
- Search UI: filters + results components.
- Practitioner and booking UI: practitioner card + booking pages.
- Practitioner scheduling UI: availability rule form + practitioner availability client.
- Patient dashboard client component.
- Shared UI primitives: button/input.
- Layout components: header/footer.

### Services
- `PractitionerSearchService` (search + pagination response shaping).
- `AvailabilityService` (slot generation with blocked dates, breaks, and booking conflict filtering).
- `AppointmentService` (booking business rules, status assignment, notification creation).
- `NotificationService` (template-driven notification persistence + email sender abstraction).

### Validators
- Practitioner search query validation.
- Availability rule/date/slot query validation.
- Available-slots API query constraints (including date range guardrails).
- Appointment creation payload validation.

### Data layer and schema
- Prisma schema exists with models for users, practitioners, consultation reasons, availability rules, blocked dates, appointments, and notifications.
- Prisma repositories exist for practitioners/search, availability, appointments, notifications, users.
- Mock fallback repositories still exist for selected read paths when DB is unavailable.

### Existing docs and README
- Docs cover authentication, configuration, database integration, deployment, and an integration audit.
- README includes setup, scripts, API contracts, and module notes.

---

## 2) Missing modules

1. **Production authentication module**
   - Current auth model is still demo-header-based and needs real session/token verification.
2. **Payments execution module**
   - Checkout and webhook endpoints exist but are placeholders.
3. **Medical documents domain module**
   - Route exists but appears placeholder (no full upload lifecycle, storage, ACL, malware scanning pipeline).
4. **Reviews domain module**
   - Route exists but appears placeholder (no moderation, persistence flow, anti-abuse).
5. **Admin API domain**
   - Admin pages exist but need full role-scoped CRUD backends and audit trails.
6. **Observability module**
   - Missing cohesive logging/tracing/metrics dashboards and SLO definition.
7. **Test suite module**
   - No complete unit/integration/e2e coverage structure is visible yet.

---

## 3) Broken or partially implemented modules

1. **Placeholder API endpoints**
   - Payments checkout, Stripe webhook, medical documents, and reviews endpoints are currently scaffold-level.
2. **Hybrid persistence behavior**
   - Search and availability route flows can still use mock repositories based on environment, creating behavior drift between local and production-like environments.
3. **Documentation drift**
   - Existing integration-audit doc contains stale findings relative to current repository (e.g., Prisma presence), indicating governance/documentation freshness risk.
4. **Auth hardening gap**
   - Centralized auth wrappers are good structurally, but production trust boundary is incomplete until real auth/session middleware is integrated.
5. **Ops readiness gap**
   - Deployment doc is concise but lacks full runbook depth (rollbacks, incident response, migration failure handling, backup restore drills).

---

## 4) MVP completion checklist

- [ ] Finalize auth for MVP (secure session verification, route-level enforcement, logout/session expiry).
- [ ] Replace placeholder medical-documents and reviews routes with persistent implementations.
- [ ] Ensure all public booking-critical reads/writes use Prisma repositories consistently.
- [ ] Add request validation + error contract consistency across all API routes.
- [ ] Add minimum tests:
  - [ ] validators unit tests
  - [ ] appointment/availability service unit tests
  - [ ] critical API integration tests (search, slots, appointment create)
- [ ] Add seed data workflow and deterministic local/staging bootstrapping.
- [ ] Update docs to remove contradictions and define single source of truth for architecture.

---

## 5) Production completion checklist

- [ ] Authentication/authorization
  - [ ] Replace demo header auth with signed session/JWT + rotation strategy.
  - [ ] Enforce RBAC at API/page boundaries and repository query boundaries.
  - [ ] Add admin privileged action audit logs.
- [ ] Security hardening
  - [ ] Apply strict HTTP security headers and CSP policy.
  - [ ] Add robust rate-limits per sensitive endpoint/user/IP.
  - [ ] Add webhook signature verification and replay protection.
  - [ ] Add upload malware scanning + content-type verification + object-store ACL controls.
- [ ] Data reliability
  - [ ] Add DB constraints/indexes for booking conflict prevention and integrity.
  - [ ] Introduce idempotency keys for appointment/payment creation.
  - [ ] Define backup, restore, and retention policies.
- [ ] Testing and quality gates
  - [ ] CI pipeline: lint -> typecheck -> unit -> integration -> e2e -> build.
  - [ ] Contract tests for external dependencies (payments/email).
  - [ ] Migration tests and rollback safety checks.
- [ ] Observability and operations
  - [ ] Structured logs with trace IDs and PII redaction.
  - [ ] Metrics and alerts (error rate, latency, booking success, webhook failures).
  - [ ] On-call runbooks and incident playbooks.
- [ ] Compliance/privacy
  - [ ] Data classification, access policies, retention/deletion workflows.
  - [ ] Consent and legal notice flows aligned with medical-data obligations.

---

## 6) Recommended Codex prompt order from now

1. **“Audit and standardize auth/session boundaries”** (no UI changes).
2. **“Implement production-safe payment webhook verification and idempotency scaffolding.”**
3. **“Unify repositories to Prisma-first behavior and remove runtime mock divergence for non-test envs.”**
4. **“Add API integration tests for search, slots, appointments, and auth failure cases.”**
5. **“Add security headers, rate-limit policy matrix, and centralized security middleware.”**
6. **“Implement medical documents secure upload pipeline with ACL + malware scanning hooks.”**
7. **“Implement review persistence and moderation guardrails.”**
8. **“Add observability stack wiring (structured logs, metrics, alerts, health checks).”**
9. **“Create deployment runbook with rollback and disaster recovery procedures.”**
10. **“Perform final production-readiness audit and doc alignment pass.”**

---

## 7) Risk register

| Risk | Severity | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Demo-header auth in production path | Critical | Medium | Account takeover / unauthorized access | Ship real session auth first; block release on security gate |
| Placeholder payment/webhook logic | High | High | Revenue loss, booking/payment mismatch | Implement verified webhook + idempotent payment state machine |
| Mock-vs-Prisma behavior drift | High | Medium | Bugs appear only in production | Enforce environment policy and integration tests on DB-backed flows |
| Insufficient automated tests | High | High | Regression risk on core booking flows | Add mandatory CI test matrix and branch protections |
| Missing upload security pipeline | Critical | Medium | Malware/PHI leakage risk | Add file scanning, encrypted storage, strict ACL + signed URL strategy |
| Documentation drift | Medium | High | Team misalignment and wrong assumptions | Assign doc ownership + periodic architecture audits |
| Limited operational runbooks | High | Medium | Slower incident response | Create on-call playbooks + rollback drills |

---

## 8) Testing strategy

### Test pyramid
- **Unit tests**: validators, pure service logic (slot generation, appointment status transitions, notification template selection).
- **Integration tests**: API routes with Prisma test DB and seeded fixtures.
- **E2E tests**: search -> booking -> success flow, plus patient/practitioner access controls.

### Priority suites
1. Booking race-condition and slot conflict tests.
2. Authorization matrix tests by role (patient/practitioner/admin/unauthenticated).
3. Payment webhook signature and replay tests.
4. Upload validation/security tests.

### Non-functional tests
- Load tests for practitioner search and available-slots endpoints.
- Failure-injection tests for DB and third-party outages.
- Security tests (OWASP API Top 10 aligned checks).

### Release gates
- Required green checks on every merge to main.
- Nightly integration + e2e runs against staging-like environment.
- Pre-release smoke tests with rollback verification.

---

## 9) Deployment strategy

### Environment model
- Separate **dev**, **staging**, and **production** with isolated secrets and databases.
- Prisma migrations promoted in sequence: dev -> staging -> production.

### CI/CD flow
1. Static checks and tests.
2. Build artifact creation.
3. Staging deploy + smoke tests.
4. Manual approval gate for production.
5. Progressive rollout/canary deployment.
6. Post-deploy health verification and alert watch window.

### Rollback and recovery
- Maintain one-click previous release rollback.
- Use backward-compatible migration strategy when possible.
- Keep frequent backups and quarterly restore exercises.

### Operational guardrails
- Track SLOs for booking success rate, API latency, and webhook processing success.
- Configure alert thresholds and incident escalation paths.

---

## 10) Data/privacy/security notes for a medical appointment app

1. **Minimum necessary data principle**
   - Collect only data needed for booking, reminders, and care coordination.
2. **PII/health data classification**
   - Tag fields by sensitivity and enforce role-based access consistently.
3. **Encryption**
   - TLS in transit; encryption at rest for DB and object storage.
4. **Access controls**
   - Enforce ownership checks at every server boundary (route + repository/service level).
5. **Auditability**
   - Record access to sensitive records and admin actions with immutable logs.
6. **Retention and deletion**
   - Define lifecycle rules for appointments, documents, logs, and backups.
7. **Data residency/compliance alignment**
   - Verify jurisdictional requirements for patient data handling and cross-border transfers.
8. **Third-party risk management**
   - Review payment/email/storage providers for contractual and security obligations.
9. **Incident response**
   - Maintain breach response workflow, notification process, and post-incident review templates.
10. **Secure defaults**
   - Deny-by-default authorization, strict input validation, output encoding, and secret rotation.

---

## Suggested delivery phases

- **Phase A (Stabilize MVP):** auth hardening, API parity, minimum automated tests.
- **Phase B (Production Security + Reliability):** payments/webhooks, upload security, observability, runbooks.
- **Phase C (Scale + Governance):** advanced testing, compliance workflows, cost/performance optimization.
