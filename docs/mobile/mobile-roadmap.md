# Sihati mobile roadmap

## Current audit summary

### Repository structure

The current repository is a root-level Next.js App Router application. The web app lives at the repository root instead of under `apps/web`:

```text
.
├── app/                    # Next.js App Router pages and API routes
├── components/             # Web UI components
├── lib/                    # Auth, security, repositories, services, validators, storage
├── prisma/                 # Prisma schema
├── tests/                  # Vitest route/unit tests
├── docs/                   # Production, deployment, security, auth, testing docs
├── scripts/                # Build helpers
├── package.json            # Root web app scripts and dependencies
└── next.config.ts          # Root Next.js config
```

### Existing Next.js app location

The existing web application is rooted at `/workspace/sihati` with `app/`, `components/`, `lib/`, `prisma/`, `tests/`, `next.config.ts`, `tailwind.config.ts`, `vitest.config.ts`, and `package.json` all assuming root-relative layout and the `@/*` TypeScript alias.

### Existing scripts

The root `package.json` is currently the web application's script surface:

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Run the custom Next build wrapper in `scripts/build-next.mjs`. |
| `npm run start` | Start the production Next.js server. |
| `npm run lint` | Run ESLint across the repository. |
| `npm run typecheck` | Run `tsc --noEmit`. |
| `npm test` / `npm run test:watch` / `npm run test:coverage` | Run Vitest. |
| `npm run check` | Run lint, typecheck, and tests. |
| `npm run prod:check` | Run lint, typecheck, tests, build, and dependency audit. |
| Prisma scripts | Validate schema, deploy migrations, and open Prisma Studio. |

### Existing docs

The repo already has production and operations documentation in `docs/`, including architecture, authentication, Firebase Auth, security, testing, deployment, AWS deployment, Docker, privacy, payments, database, and production checklist guides. Mobile docs should link to these rather than duplicate every operational detail.

### Existing API routes

Current backend API routes are implemented as Next.js route handlers under `app/api`:

| Route | Current status | Mobile relevance |
| --- | --- | --- |
| `GET /api/practitioners/search` | Public search with mock fallback in non-production when `DATABASE_URL` is absent. | Primary discovery endpoint. |
| `GET /api/practitioners/[id]/available-slots` | Public slot lookup with mock fallback in non-production when `DATABASE_URL` is absent. | Required for booking flow. |
| `POST /api/appointments` | Patient-only appointment creation, same-origin guarded, rate-limited. | Needs mobile-safe auth/CSRF strategy before mobile write access. |
| `POST /api/payments/checkout` | Patient-only checkout creation, same-origin guarded. | Mobile should use backend-created checkout/payment sessions only. |
| `POST /api/stripe/webhook` | Provider webhook endpoint with Stripe signature verification. | Server-only, never called by Flutter. |
| `GET/POST/DELETE /api/medical-documents` | Authenticated document listing/upload/download/delete orchestration. | Needs private storage and signed URL flow before mobile release. |
| `GET/POST/PATCH /api/admin/service-config` | Admin-only service configuration. | Not part of the first patient mobile app. |
| `GET /api/reviews` | Returns `501 REVIEWS_NOT_IMPLEMENTED`. | Do not build mobile review UX until backed by data. |

### Existing authentication model

Authentication is centralized in `lib/auth/` and enforced through helpers in `lib/security/access-control.ts`. The current model supports signed session tokens through the `sihati_session` cookie or bearer token, plus development-only demo headers (`x-user-id`, `x-user-role`) outside production. Production rejects demo headers. Roles are `PATIENT`, `PRACTITIONER`, and `ADMIN`, with role permissions centralized in `lib/auth/permissions.ts`.

### Existing mock/MVP limitations

The mobile plan must account for these known limitations before implementing Flutter screens:

- Demo-header auth exists for local development only and must not be used by a released mobile app.
- Practitioner search and availability can use mock repositories in non-production when `DATABASE_URL` is missing.
- Reviews currently return a `501` response.
- Payment checkout and webhook flows require verified provider configuration before real payments.
- Medical documents need production private object storage, strict access controls, audit logging, and signed URL flows.
- Some dashboard and consultation experiences remain sample/demo-oriented according to the production-readiness docs.
- Shared rate limiting must be backed by Redis/Upstash for horizontally scaled production deployments.

## Recommended temporary monorepo structure

Moving the existing Next.js app into `apps/web` is not recommended in this preparation step because the current root app has many path, tooling, deployment, Docker, CI, Prisma, and Next.js assumptions tied to root-level files.

Use this temporary structure now:

```text
.
├── app/                         # Existing Next.js app remains at root for safety
├── components/                  # Existing web components remain at root
├── lib/                         # Existing web/backend implementation remains at root
├── prisma/                      # Existing Prisma schema remains at root
├── tests/                       # Existing web/API tests remain at root
├── apps/
│   └── mobile/                  # Flutter skeleton; platform folders generated later
├── packages/
│   └── shared/                  # Reserved shared contracts/docs location; no package build yet
└── docs/
    └── mobile/
        ├── mobile-architecture.md
        └── mobile-roadmap.md
```

Future target structure after a dedicated migration branch validates CI, Docker, deploys, and aliases:

```text
.
├── apps/
│   ├── web/                     # Existing Next.js app after safe migration
│   └── mobile/                  # Flutter app
├── packages/
│   └── shared/                  # Generated API contracts, OpenAPI specs, fixtures, docs
└── docs/
    └── mobile/                  # Mobile architecture/runbooks
```

## Mobile development phases

### Phase 0 — Repository preparation

- Keep the production web app at the root.
- Reserve `apps/mobile` for the Flutter project.
- Reserve `packages/shared` for API contracts and generated artifacts.
- Document current API/auth limitations and migration risks.
- Avoid backend logic or route changes in mobile preparation branches.

### Phase 1 — API contract stabilization

- Add an OpenAPI document or contract source of truth under `packages/shared/api/`.
- Document request/response envelopes used by Next route handlers: successful responses use `{ data: ... }`; errors use `{ error: { code, message, details? } }`.
- Add route-handler contract tests for mobile-critical endpoints.
- Version mobile-facing endpoints or explicitly commit to backwards-compatible response evolution.

### Phase 2 — Auth provider alignment

- Choose the production auth provider for mobile and web: Firebase Auth, custom signed JWT/session exchange, or another server-verifiable identity provider.
- Ensure mobile obtains a token that the Next API can verify server-side.
- Avoid relying on browser cookies or demo headers for Flutter.
- Define refresh-token storage, biometric unlock policy, logout, account deletion, and session revocation behavior.

### Phase 3 — Flutter scaffold only

- Maintain the Flutter skeleton under `apps/mobile`.
- Add or refine `README.md`, environment configuration, lint rules, test baselines, and CI checks.
- Generate platform folders (`android/`, `ios/`) in a dedicated branch when bundle IDs, signing, app icons, platform permissions, and CI secrets are ready.
- Do not implement backend-connected feature flows until API contracts and auth integration are approved.

### Phase 4 — Read-only patient MVP

- Implement public practitioner search.
- Implement availability lookup.
- Add API client, typed models, error mapping, retry/backoff policy, logging redaction, and offline-safe UX states.

### Phase 5 — Authenticated patient booking MVP

- Add production mobile auth.
- Implement appointment creation only after same-origin/CSRF assumptions are adapted for mobile bearer-token flows.
- Add contract/integration tests for appointment creation and authorization failures.

### Phase 6 — Payments, documents, and consultation hardening

- Integrate payments through backend-created sessions only.
- Add medical document upload/download only after private storage, audit logging, file validation, and signed URL flows are production-ready.
- Add video consultation access only after server-side appointment ownership checks are tested end-to-end.

### Phase 7 — Practitioner/admin mobile decisions

- Decide whether practitioner/admin experiences belong in mobile or stay web-only.
- Avoid exposing admin service configuration in the first mobile release.

## Testing strategy

Before Flutter implementation:

- Keep root web/API gates passing: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run audit:prod`.
- Add API contract tests around mobile-critical responses before generating a mobile client.
- Add security regression tests for bearer token auth, role checks, ownership checks, and same-origin exceptions/alternatives for mobile.

After Flutter scaffold:

- Run `flutter analyze` and `flutter test` in `apps/mobile`.
- Add API client unit tests with mocked HTTP responses.
- Add integration tests against a staging backend using non-production credentials.
- Add end-to-end smoke tests for search, availability, login, booking, payment handoff, logout, and access-denied states.

## Build and release strategy

- Keep web release gates unchanged while the web app remains at root.
- Add mobile CI as a separate job scoped to `apps/mobile` after the Flutter scaffold exists.
- Use build flavors such as `dev`, `staging`, and `prod` with explicit backend base URLs.
- Store mobile secrets in platform stores/CI secret managers; never commit Firebase config secrets, signing keys, keystores, provisioning profiles, or API credentials.
- Require signed Android App Bundle and iOS archive workflows before production release.
- Publish first to internal testing/TestFlight, then staged rollout after monitoring is ready.

## Risks and assumptions

### Risks of moving the web app now

- Next.js App Router expects root-level `app/`, `next.config.ts`, and environment conventions.
- TypeScript path alias `@/*` currently maps to the root source tree.
- Docker, CI, deployment guides, and scripts currently assume root-level web commands.
- Prisma schema and generated client assumptions are rooted at the current project path.
- Tests import root aliases and route files directly.
- A large move could obscure real production-readiness work behind path churn.

### Assumptions

- The first mobile app is patient-first, not admin-first.
- Flutter should consume the existing Next route handlers over HTTPS rather than connecting directly to the database or provider SDKs for privileged operations.
- The backend remains the authority for RBAC, ownership checks, payment session creation, medical document access, and provider webhook handling.
- Root-level web structure is temporary until a dedicated migration branch safely validates `apps/web`.

## Recommended next mobile prompt

Use this next prompt after reviewing these docs:

> Create a Phase 1 mobile API contract plan for Sihati. Do not scaffold Flutter yet. Add an OpenAPI draft under `packages/shared/api/openapi.yaml` for the current mobile-relevant endpoints, document response envelopes and error codes, and add contract-test recommendations without changing backend logic.
