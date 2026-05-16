# Flutter setup for Sihati Mobile

Sihati Mobile lives in `apps/mobile` and is intentionally isolated from the existing root-level Next.js application. The mobile scaffold is ready for Flutter development while backend, authentication, payment, and video-consultation integrations remain deferred.

## Prerequisites

- Flutter stable SDK with Dart 3.4 or newer.
- Xcode and CocoaPods for iOS builds.
- Android Studio, Android SDK, and an emulator or device for Android builds.
- Access to the Sihati backend environment URL for the target environment.

## First-time setup

```bash
cd apps/mobile
flutter pub get
flutter test
```

Run the skeleton against a local backend URL without making API calls yet:

```bash
flutter run \
  --dart-define=APP_ENV=development \
  --dart-define=API_BASE_URL=http://localhost:3000
```

For root-level monorepo workflows and CI, use:

```bash
npm run mobile:pub-get
npm run mobile:format
npm run mobile:analyze
npm run mobile:test
npm run mobile:check
```

Staging and production builds must use HTTPS API URLs:

```bash
flutter run \
  --dart-define=APP_ENV=staging \
  --dart-define=API_BASE_URL=https://staging.example.com
```

## Platform project generation

The committed scaffold does not include generated `android/` or `ios/` folders. Generate them only when the team is ready to configure bundle IDs, signing, app icons, platform permissions, and CI secrets:

```bash
cd apps/mobile
flutter create --platforms=android,ios .
```

After generation, review and commit the platform folders in a dedicated mobile platform setup change. Do not commit local build output, generated cache folders, or signing credentials.

## Production-readiness guidance

### Security

- Keep the backend as the trust boundary for RBAC, validation, appointment ownership, payments, signed URLs, audit logs, and video access.
- Use bearer tokens only after the mobile authentication provider is selected and backend token verification is implemented.
- Keep local HTTP API URLs restricted to development; staging and production must use HTTPS and must not point at localhost.
- Store future refresh tokens or sensitive session state only in platform secure storage.
- Redact tokens, PHI, medical document URLs, appointment identifiers, payment identifiers, full query strings, and provider secrets from logs.
- Do not use development demo headers in a released mobile app.

### Networking

- Use typed request/response models generated from mobile-facing API contracts once contracts are approved.
- Normalize success and error envelopes from the Sihati API.
- Preserve server error codes for patient-safe messages, support, and telemetry.
- Use timeouts and retries only for idempotent reads.
- Do not blindly retry appointment creation, payment creation, medical-document writes, or video-session creation.

### Testing

- Run `npm run mobile:check` or, at minimum, `flutter analyze` and `flutter test` for every mobile change.
- Add unit tests for configuration, routing, API envelope parsing, and error mapping before real backend integration.
- Add widget tests for every feature screen.
- Add integration tests for login, search, booking, and logout only after production auth and platform projects exist.
- Pair mobile tests with backend contract tests for `/api/practitioners/search`, availability, appointment creation, payments, and documents before enabling those flows.

### Deployment

- Use separate development, staging, and production build definitions.
- Inject `APP_ENV` and `API_BASE_URL` through CI/CD rather than hard-coding environment values, and keep production builds on HTTPS-only endpoints.
- Keep signing keys, upload keys, provisioning profiles, and API secrets outside Git.
- Add release smoke tests for startup, routing, API configuration, and crash-free launch.
- Publish through staged rollouts and monitor crash reporting, API errors, and patient-impacting funnel metrics.

## Deferred integrations

The following are deliberately not implemented in this skeleton:

- Real API integration.
- Authentication and account/session storage.
- Appointment booking writes.
- Payments.
- Medical documents.
- Video consultation provider integration.
