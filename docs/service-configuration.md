# External service configuration

Sihati stores external service settings through an admin-only configuration module. The module is intentionally limited to configuration records and does not activate provider integrations by itself.

## Supported configuration records

- Stripe
- Cloudflare Stream / WebRTC
- Firebase
- SMTP
- SMS provider
- Push notifications
- Cloud storage
- Google OAuth
- Facebook OAuth

## Architecture

- Admin UI: `/admin/service-config`
- API: `/api/admin/service-config`
- Validation: `lib/validators/service-config.ts`
- Service layer: `lib/services/app-config.service.ts`
- Encryption boundary: `lib/security/encryption.ts`
- Persistence: `ServiceConfiguration` and `ServiceConfigurationAudit` Prisma models

The UI sends non-sensitive metadata as JSON and sends only replacement secrets when an admin wants to rotate credentials. The API returns metadata, enabled status, timestamps, and masked secret status. It never returns encrypted or decrypted secret values.

## Security model

- Only users with the `ADMIN` role can load or update service configuration.
- Write requests enforce same-origin checks and admin-specific rate limits.
- Secrets are encrypted before storage by the encryption service.
- Secret fingerprints are stored separately so the UI can show stable masked labels without exposing keys.
- Logs and audit records include provider, actor, action, success, and safe error codes only; API keys and secret values must never be logged.
- Validation errors are generic and safe for clients.

## Required environment variable

`APP_ENCRYPTION_KEY` is required before storing secrets. Production deployments must set a strong secret with at least 32 characters, generated from a secure random source and stored in the deployment secret manager.

Example local placeholder in `.env.example`:

```bash
APP_ENCRYPTION_KEY=dev_only_change_me_to_a_32_byte_minimum_secret
```

Do not commit production secrets. Rotating `APP_ENCRYPTION_KEY` requires a planned re-encryption migration for existing provider credentials.

## Provider activation status

This module configures providers only. It does not implement real Stripe payments, Firebase initialization, Cloudflare video setup, SMS sending, OAuth login, push delivery, SMTP delivery, or cloud storage uploads. Existing provider integrations should be updated in later tasks to read from the service configuration layer instead of environment variables.

## Operational checklist

1. Apply the Prisma migration for `ServiceConfiguration` and `ServiceConfigurationAudit`.
2. Set `APP_ENCRYPTION_KEY` in every runtime environment.
3. Confirm `/admin/service-config` is accessible only to admins.
4. Rotate credentials by submitting only changed secret keys in the Secrets JSON field.
5. Monitor structured `service_configuration_attempt` logs and audit table entries.
6. Keep provider integration code separate from this configuration module.

## Testing guidance

- Unit test validation rules with representative metadata and secret key names.
- Unit test encryption round trips and invalid encryption configuration handling.
- API test admin-only access for both read and write paths.
- API test that returned payloads do not include plaintext secrets, encrypted payloads, or API keys.
- Provider integration tests should mock this service until real provider test accounts are provisioned.
