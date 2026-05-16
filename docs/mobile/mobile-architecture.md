# Sihati mobile architecture

## Architecture decision

Sihati should adopt a gradual monorepo strategy. The existing Next.js web/backend application should remain at the repository root until a separate migration branch proves that moving it to `apps/web` does not break builds, Docker, CI, Prisma, imports, or deployment documentation.

The immediate architecture is therefore:

```text
Flutter mobile app  --->  HTTPS  --->  Next.js route handlers  --->  services/repositories/providers
 apps/mobile                         app/api/*                    lib/* / prisma / storage
```

Flutter must not connect directly to the database, Stripe, object storage, email providers, or admin configuration providers. The backend must remain the only trust boundary for RBAC, ownership checks, validation, rate limiting, audit logging, payment session creation, signed document URLs, and provider webhooks.

## Recommended folder structure

### Current safe structure

```text
.
├── app/                         # Existing Next.js pages and API routes
├── components/                  # Existing web UI components
├── lib/                         # Auth, security, validators, services, repositories
├── prisma/                      # Database schema
├── tests/                       # Web/API tests
├── apps/
│   └── mobile/                  # Flutter skeleton with Dart source, tests, and docs
│       ├── lib/
│       ├── test/
│       ├── pubspec.yaml
│       └── README.md
├── packages/
│   └── shared/
│       └── README.md            # Placeholder for API contracts and shared docs
└── docs/
    └── mobile/
        ├── mobile-architecture.md
        └── mobile-roadmap.md
```

### Future validated structure

```text
.
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── prisma/
│   │   └── package.json
│   └── mobile/
│       ├── lib/
│       ├── test/
│       ├── integration_test/
│       ├── android/
│       ├── ios/
│       └── pubspec.yaml
├── packages/
│   └── shared/
│       ├── api/
│       │   └── openapi.yaml
│       ├── fixtures/
│       └── README.md
└── docs/
    └── mobile/
```

Do not migrate to the future structure until CI can run all web checks from the new location and deployment runbooks are updated in the same branch.

## API integration strategy

### Backend ownership

Flutter should consume the existing Next.js API routes through a typed HTTP client. The mobile client should treat the backend as authoritative and should not duplicate server authorization decisions.

### Response envelopes

Current successful API responses are wrapped as:

```json
{ "data": {} }
```

Current error responses are wrapped as:

```json
{ "error": { "code": "ERROR_CODE", "message": "Safe message", "details": {} } }
```

The mobile API client should normalize these into typed success/error results and must preserve server error codes for UX, telemetry, and support.

### Mobile endpoint priority

1. `GET /api/practitioners/search`
2. `GET /api/practitioners/{id}/available-slots`
3. Production auth token/session exchange endpoint once selected or implemented
4. `POST /api/appointments`
5. `POST /api/payments/checkout`
6. `GET/POST/DELETE /api/medical-documents`

Do not build against `GET /api/reviews` until it is backed by persisted production data.

### Contract management

Use `packages/shared` for contracts, not runtime coupling:

- `packages/shared/api/openapi.yaml` for mobile-facing route contracts.
- `packages/shared/fixtures/` for sample JSON responses.
- Generated Dart client code may be created later inside `apps/mobile` or a generated subfolder, but generated code should be reproducible and documented.
- Contract tests should validate response shapes and error codes before mobile screens depend on them.

### Networking practices for Flutter

- Use HTTPS-only base URLs.
- Maintain separate dev/staging/prod API base URLs.
- Add request IDs for traceability where supported.
- Redact tokens, PHI, document URLs, and payment identifiers from logs.
- Implement timeout, retry, and backoff policies only for idempotent reads.
- Do not retry appointment creation or payment creation blindly without idempotency keys.

## Authentication integration strategy

### Current backend auth facts

- Server auth resolution is centralized in `lib/auth/session.ts` and `lib/auth/current-user.ts`.
- Production rejects demo headers.
- Development demo headers are suitable only for local web/API testing.
- Signed sessions can be read from the `sihati_session` cookie or a bearer token.
- Roles are `PATIENT`, `PRACTITIONER`, and `ADMIN`.

### Mobile recommendation

For Flutter, use server-verifiable bearer tokens rather than browser-only assumptions:

1. Select the production identity provider.
2. Mobile signs in with the provider SDK or a backend-mediated flow.
3. Mobile sends `Authorization: Bearer <token>` to the Next API.
4. The backend verifies the token/session server-side and maps it to the Sihati user/role model.
5. The backend performs all role and ownership checks.

If Firebase Auth is selected, Flutter should use Firebase client SDKs only for sign-in/token acquisition; the Next backend should verify ID tokens with Firebase Admin or an equivalent trusted verification path. If custom sessions are selected, add a deliberate login/token exchange endpoint before Flutter implementation.

### CSRF and same-origin considerations

Several write routes currently call same-origin protection because the web app is browser-based. Native mobile requests commonly omit browser `Origin` behavior or use bearer tokens instead of cookies. Before mobile write operations are enabled, define one of these approaches:

- Keep same-origin checks for cookie-authenticated browser requests and allow bearer-token mobile requests through a documented, tested path.
- Require mobile-specific proof such as verified bearer token plus idempotency keys for sensitive mutations.
- Add contract tests ensuring cross-origin browser CSRF remains blocked while legitimate mobile bearer-token requests succeed.

## Security and operational structure

- Keep `lib/auth/` and `lib/security/` as the server-side enforcement layer.
- Require production `AUTH_SECRET`, database configuration, Redis/Upstash-backed rate limiting, provider secrets, and private storage before production release.
- Avoid logging PHI, raw request bodies, tokens, signed URLs, payment data, provider secrets, or medical document keys.
- Require audit logs for appointment creation, document access, payment handoff, auth failures, and admin actions.
- Keep Stripe webhooks server-only.
- Use short-lived signed URLs for document downloads/uploads.
- Treat mobile app binaries as public clients: never embed privileged secrets.

## Testing strategy

### Existing web/API checks

Keep these checks as the web release baseline:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run audit:prod
```

### API contract tests before Flutter

Add tests for:

- Search result response shape.
- Available-slots response shape.
- Appointment creation validation errors.
- Unauthorized, forbidden, validation, rate-limit, and not-configured error envelopes.
- Bearer-token auth behavior after the production provider strategy is chosen.
- Mobile-safe write-route behavior without weakening browser CSRF protections.

### Flutter tests after scaffold

- `flutter analyze` for static analysis.
- `flutter test` for unit/widget tests.
- HTTP client tests using fixtures from `packages/shared`.
- Integration tests against staging using non-production accounts.
- Release smoke tests on physical Android/iOS devices.

## Build and release strategy

### Web

- Keep the root web app deployment unchanged until the `apps/web` migration is validated.
- Continue using current production gates and deployment documentation.

### Mobile

Once Flutter is scaffolded:

- Add separate CI jobs scoped to `apps/mobile`.
- Use Flutter flavors for dev, staging, and production.
- Keep platform signing material in secure CI/mobile platform secret storage.
- Build Android App Bundles and iOS archives from reproducible CI workflows.
- Use internal testing tracks before public release.
- Require staging smoke tests before app-store submission.

## Deployment and maintainability best practices

- Introduce API contract versioning before mobile clients are released, because mobile apps cannot be upgraded instantly.
- Prefer additive API changes and explicit deprecation windows.
- Keep generated clients reproducible from committed contracts.
- Add mobile release notes and rollback procedures under `docs/mobile` after scaffold.
- Track compatibility between mobile app versions and backend releases.
- Monitor mobile-specific API latency, 4xx/5xx rates, auth failures, and payment/document errors.

## Risks and assumptions

| Area | Risk | Mitigation |
| --- | --- | --- |
| Web migration | Moving root Next files to `apps/web` could break imports, builds, Docker, Prisma, tests, and deploys. | Keep web at root now; migrate only in a dedicated branch with full CI/deploy validation. |
| Auth | Demo headers are not production auth and are rejected in production. | Use server-verified bearer tokens for Flutter. |
| CSRF | Current same-origin protections are browser-focused. | Add tested bearer-token mobile path without weakening browser protections. |
| API stability | Current routes were not yet formalized as mobile contracts. | Add OpenAPI/contracts and contract tests before Flutter screens. |
| Mock data | Non-production mocks may hide missing database/provider behavior. | Test mobile flows against staging with real non-production integrations. |
| Payments | Mobile payment handoff can fail if provider flows are not finalized. | Keep Stripe/payment authority on backend and test with Stripe test fixtures. |
| Medical documents | PHI/document flows are high risk. | Delay mobile document features until private storage, audit logs, and signed URLs are validated. |
| Reviews | Reviews endpoint is not implemented. | Exclude reviews from mobile MVP until persisted data exists. |

## Production-readiness guardrails

This preparation intentionally avoids UI changes and backend logic changes. Production readiness should improve through structure and documentation first, then through contract tests, auth hardening, CI gates, deployment runbooks, and observability in later tasks.
