# Sihati Mobile

Flutter mobile app skeleton for Sihati, a Moroccan healthcare appointment booking platform.

This scaffold intentionally does **not** implement real login, production booking flows, payments, medical document uploads, or video consultations yet. It provides production-ready foldering, configuration seams, theme, routing, a minimal landing screen, secure storage abstraction, and a reusable API client foundation without changing the existing web app.

## Current scope

- Flutter app under `apps/mobile`.
- Material 3 theme with a clean, medical, reassuring Sihati brand style.
- Responsive landing screen for small and larger mobile/tablet widths.
- Environment configuration for local development, staging, and production.
- Reusable HTTP API client with safe timeout handling, JSON parsing, bearer-token injection seams, and standardized error mapping.
- Secure token storage abstraction using `flutter_secure_storage`.
- Widget and configuration test baselines for the initial screen and mobile runtime settings.

## Run locally

Install Flutter from the official Flutter documentation, then run:

```bash
cd apps/mobile
flutter pub get
flutter test
flutter run --dart-define=APP_ENV=development --dart-define=API_BASE_URL=http://localhost:3000
```

Android emulators often need the host loopback alias instead of `localhost`:

```bash
flutter run --dart-define=APP_ENV=development --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

Root-level convenience scripts are also available for CI and monorepo workflows:

```bash
npm run mobile:pub-get
npm run mobile:format
npm run mobile:analyze
npm run mobile:test
npm run mobile:check
```

## Environment configuration

The app reads configuration from Flutter `--dart-define` values in `lib/core/config/app_config.dart`.

| Environment | `APP_ENV` | Default API base URL | HTTPS required |
| --- | --- | --- | --- |
| Local development | `development` | `http://localhost:3000` | No |
| Staging | `staging` | `https://staging-api.sihati.ma` | Yes |
| Production | `production` | `https://api.sihati.ma` | Yes |

Example staging run:

```bash
flutter run \
  --dart-define=APP_ENV=staging \
  --dart-define=API_BASE_URL=https://staging-api.sihati.ma
```

Example production build:

```bash
flutter build appbundle \
  --dart-define=APP_ENV=production \
  --dart-define=API_BASE_URL=https://api.sihati.ma
```

Optional values:

```bash
--dart-define=APP_NAME=Sihati
--dart-define=API_TIMEOUT_SECONDS=20
```

Do not hardcode production secrets in Dart code or pass privileged backend secrets through `--dart-define`. Base URLs are configuration, not secrets; signing keys and deployment credentials belong in CI/CD and native platform secret management.

## API client architecture

The reusable client lives in `lib/core/network/api_client.dart` and is supported by:

- `lib/core/network/api_endpoints.dart` for backend route constants.
- `lib/core/config/app_config.dart` for base URL, environment, HTTPS, localhost, and timeout validation.
- `lib/core/errors/app_exception.dart` for normalized mobile error categories.
- `lib/shared/models/api_response.dart` for response-envelope and JSON parsing helpers.
- `lib/core/storage/secure_storage_service.dart` for future auth and refresh token persistence.

The client currently supports `GET`, `POST`, `PUT`, `PATCH`, and `DELETE`, applies JSON headers, injects a bearer token when a token provider or secure storage is wired, and maps failures into `AppException` categories. Real login and token refresh are intentionally left for a later mobile authentication phase.

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
│   │   ├── errors/          # Shared app exception types
│   │   ├── network/         # Reusable API client and endpoint constants
│   │   ├── routing/         # Route names and route factory
│   │   ├── storage/         # Secure token storage abstraction
│   │   └── theme/           # Material 3 theme and brand tokens
│   ├── features/
│   └── shared/
│       ├── models/          # Shared response models and parsing helpers
│       └── widgets/
└── test/
```

## More documentation

See `docs/mobile/api-integration.md` for the API contract assumptions, environment setup, security limitations, future token handling, and testing/deployment recommendations.
