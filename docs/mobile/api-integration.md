# Mobile API Integration

This document describes the first reusable API integration layer for the Flutter app in `apps/mobile`. The layer is intentionally foundational: it prepares configuration, secure token storage, JSON parsing, timeouts, and standardized error handling without implementing real login flows or production screens.

## How the mobile app talks to the Sihati API

The mobile app must call the existing Sihati backend over HTTPS, using the Next.js API as the trust boundary. Flutter clients should never connect directly to the database, payment providers, object storage, email providers, or video providers.

The mobile API path is:

1. A feature repository or service calls `ApiClient` from `lib/core/network/api_client.dart`.
2. `ApiClient` builds the full URL from `AppConfig.apiBaseUrl` and an endpoint in `ApiEndpoints`.
3. The client applies JSON headers, the configured timeout, and an optional bearer token.
4. The backend response is decoded as JSON and mapped into either an `ApiResponse<T>` envelope or an `AppException`.
5. Feature code receives typed data or a normalized error category suitable for UX, telemetry, and support.

## Expected API base URL

`API_BASE_URL` should point to the deployed Sihati API origin, not a browser page route and not a third-party service. Examples:

| Environment | Expected value | Notes |
| --- | --- | --- |
| Local development | `http://localhost:3000` | Allowed only for development. Android emulators may need `http://10.0.2.2:3000` instead. |
| Staging | `https://staging-api.sihati.ma` | Placeholder hostname for staging; replace with the real staging API origin when DNS is provisioned. |
| Production | `https://api.sihati.ma` | Placeholder hostname for production; inject the final production API origin at build time. |

Production secrets must not be compiled into the Flutter app. Base URLs are not secrets, but they should still be provided through environment-specific build configuration so release artifacts are reproducible and auditable.

## Configuring environments

The mobile app reads build-time values through Flutter `--dart-define` flags:

```bash
flutter run \
  --dart-define=APP_ENV=development \
  --dart-define=API_BASE_URL=http://localhost:3000
```

```bash
flutter run \
  --dart-define=APP_ENV=staging \
  --dart-define=API_BASE_URL=https://staging-api.sihati.ma
```

```bash
flutter build appbundle \
  --dart-define=APP_ENV=production \
  --dart-define=API_BASE_URL=https://api.sihati.ma
```

Optional configuration:

```bash
--dart-define=APP_NAME=Sihati
--dart-define=API_TIMEOUT_SECONDS=20
```

Configuration safeguards:

- Development defaults to `http://localhost:3000`.
- Staging defaults to `https://staging-api.sihati.ma`.
- Production defaults to `https://api.sihati.ma`.
- Staging and production reject non-HTTPS API URLs.
- Production rejects localhost URLs.
- Timeouts are clamped to 5–60 seconds when read from `--dart-define` and directly constructed configs outside that range are rejected.

## API response format

The Flutter client is prepared for a standard response envelope:

```json
{
  "data": {},
  "meta": {}
}
```

For failures, the client expects the backend to return a structured error where possible:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check the submitted information.",
    "details": {}
  }
}
```

If the backend returns a different JSON shape, the API client still maps the HTTP status code to a standard mobile error category.

## Error handling

`AppException` normalizes network and HTTP failures into these categories:

- `unauthorized` for `401`
- `forbidden` for `403`
- `notFound` for `404`
- `validation` for `400` and `422`
- `server` for `5xx`
- `network` for offline, DNS, socket, or client transport failures
- `timeout` for requests exceeding `API_TIMEOUT_SECONDS`
- `parsing` for invalid or unexpected JSON
- `unknown` for unclassified failures

Feature code should render user-safe messages and avoid exposing raw backend details that could include sensitive operational context.

## Security limitations

The mobile app is an untrusted client. Anything shipped in the app bundle can be inspected by a determined user. Therefore:

- Do not hardcode production secrets, service keys, signing keys, database URLs, Stripe secrets, video provider credentials, or privileged API tokens.
- Use the backend for authentication, authorization, audit logging, validation, rate limiting, payments, video session authorization, and signed document access.
- Treat mobile bearer tokens as sensitive but not impossible to extract.
- Avoid logging tokens, PHI, appointment details, document URLs, payment identifiers, or full URLs with sensitive query strings.
- Prefer short-lived access tokens plus refresh flows when mobile auth is implemented.

## Future token handling

`SecureStorageService` wraps `flutter_secure_storage`, enables encrypted shared preferences on Android, uses a device-bound keychain accessibility policy on iOS, and reserves keys for an auth token and refresh token. The API client can inject a bearer token from either:

1. `SecureStorageService.readAuthToken()`, or
2. a custom `TokenProvider` supplied during tests or future dependency injection wiring.

Real login is not implemented yet. A future authentication prompt should add:

- mobile login and logout flows,
- token refresh and rotation,
- secure session clearing on logout,
- unauthorized response handling that routes users back to login,
- integration tests for token injection and refresh behavior,
- backend contract tests for mobile auth endpoints.

## Testing and deployment best practices

- Unit test `AppConfig` validation for every environment.
- Unit test `ApiClient` status-code mapping with mocked HTTP clients, including public requests that disable bearer token injection.
- Unit test JSON parsing helpers against success, empty, list, and malformed responses.
- Run `flutter format`, `flutter analyze`, and `flutter test` in CI.
- Keep staging and production build definitions separate.
- Use CI/CD secrets only for native signing credentials and deployment credentials; do not pass backend secrets as Dart defines.
- Gate releases on backend health checks and mobile-critical API contract tests.
