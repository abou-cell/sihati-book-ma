# Sihati Mobile

Flutter mobile app skeleton for Sihati, a Moroccan healthcare appointment booking platform.

This scaffold intentionally does **not** connect to the backend, implement authentication, process payments, upload medical documents, or launch video consultations yet. It provides the production-ready foldering, configuration seams, theme, routing, first screen, and test baseline needed to start mobile development without changing the existing Next.js web app.

## Current scope

- Flutter app under `apps/mobile`.
- Material 3 theme with a clean, medical, reassuring Sihati brand style.
- Responsive landing screen for small and larger mobile/tablet widths.
- Placeholder network, storage, error, routing, and feature directories.
- Environment validation that allows local HTTP only in development and requires HTTPS for staging/production.
- Widget and configuration test baselines for the initial screen and mobile runtime settings.

## Run locally

Install Flutter from the official Flutter documentation, then run:

```bash
cd apps/mobile
flutter pub get
flutter test
flutter run --dart-define=APP_ENV=development --dart-define=API_BASE_URL=http://localhost:3000
```

Root-level convenience scripts are also available for CI and monorepo workflows:

```bash
npm run mobile:pub-get
npm run mobile:format
npm run mobile:analyze
npm run mobile:test
npm run mobile:check
```

For staging and production, `API_BASE_URL` must be HTTPS:

```bash
flutter run \
  --dart-define=APP_ENV=staging \
  --dart-define=API_BASE_URL=https://staging.example.com
```

## Generated platform files

The repository currently tracks the hand-authored Flutter skeleton only. Platform folders are intentionally ignored until the team chooses the supported targets and runs Flutter generation in a controlled branch:

```bash
cd apps/mobile
flutter create --platforms=android,ios .
```

Expected generated folders include `android/`, `ios/`, `.dart_tool/`, and other Flutter build metadata. Review generated signing, package identifier, minimum SDK, app icon, splash screen, and CI secrets handling before committing platform projects.

## Structure

```text
apps/mobile/
├── lib/
│   ├── main.dart
│   ├── app.dart
│   ├── core/
│   │   ├── config/          # Environment and build-time configuration
│   │   ├── errors/          # Shared app error types
│   │   ├── network/         # Future typed API client boundary
│   │   ├── routing/         # Route names and route factory
│   │   ├── storage/         # Future secure storage boundary
│   │   └── theme/           # Material 3 theme and brand tokens
│   ├── features/
│   │   ├── appointments/
│   │   ├── auth/
│   │   ├── booking/
│   │   ├── home/
│   │   ├── practitioner/
│   │   ├── profile/
│   │   ├── search/
│   │   └── video_consultation/
│   └── shared/
│       ├── models/
│       └── widgets/
└── test/
```

## Future Sihati API integration

Later phases should connect Flutter to the existing Next.js API through a typed HTTP client in `lib/core/network`. The client should:

1. Use `AppConfig.apiBaseUrl` from `--dart-define` values for dev, staging, and production.
2. Require HTTPS for staging and production and keep local HTTP confined to development builds.
3. Log only redacted origins such as `AppConfig.apiOriginForDiagnostics`, never full URLs that may contain query strings.
4. Send bearer tokens only after the production mobile authentication strategy is approved.
5. Normalize Sihati response envelopes: `{ "data": ... }` for success and `{ "error": { "code", "message", "details" } }` for failures.
6. Preserve server error codes for UX, support, and telemetry.
7. Redact tokens, PHI, document URLs, payment identifiers, and appointment details from logs.
8. Add retries only for idempotent read endpoints and never blindly retry appointment or payment creation.

Flutter must not connect directly to the database, Stripe, object storage, email providers, or video providers. The Next.js backend remains the trust boundary for authentication, RBAC, validation, rate limiting, audit logging, idempotency, signed URLs, payments, and video access decisions.

## Testing and deployment best practices

- Keep widget tests close to feature UI and add unit tests for routing, error mapping, configuration, and API clients before adding real integrations.
- Run the root `mobile:check` script in CI once Flutter is installed on the runner.
- Add integration tests only after platform folders are generated and stable.
- Run `flutter analyze`, `flutter test`, and formatting checks in CI for `apps/mobile`.
- Use separate build flavors or `--dart-define` sets for development, staging, and production.
- Keep secrets out of source control; inject environment-specific values through CI/CD and native secret stores.
- Gate mobile releases on backend contract tests for mobile-critical endpoints.
