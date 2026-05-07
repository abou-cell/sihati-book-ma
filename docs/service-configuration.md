# Admin-managed external service configuration

Sihati supports a secure foundation for configuring external services from an admin-only module. This module stores provider metadata separately from sensitive credentials and deliberately does **not** activate full provider integrations yet.

## Supported configuration records

The `ServiceConfiguration` model supports one record per provider:

- Stripe
- Cloudflare Stream / WebRTC
- Firebase
- SMTP
- SMS provider
- Push notifications
- Cloud storage
- Google OAuth
- Facebook OAuth

## Access model

- Only users with the `ADMIN` role may read or update service configuration.
- API access is enforced by `requireCurrentUserForApi(request, ["ADMIN"])`.
- Page access is enforced by `requireRolesForPage(["ADMIN"])`.
- Mutating API requests also run the same-origin check used by other sensitive routes.

## Data model

`prisma/schema.prisma` defines `ServiceConfiguration` with:

- `provider`: unique provider identifier.
- `isEnabled`: operational toggle for later integrations.
- `displayName`: non-sensitive label shown to admins.
- `metadata`: non-sensitive JSON configuration such as hostnames, project IDs, bucket names, redirect URIs, or public client IDs.
- `encryptedSecrets`: encrypted JSON bag for API keys, client secrets, tokens, and passwords.
- `secretPreview`: masked labels for the admin UI, such as `sk_t••••1234`.
- `updatedByUserId`: audit context for the last admin update.

## Encryption

Sensitive values are encrypted through `lib/security/encryption.ts` using AES-256-GCM and the server-only `APP_ENCRYPTION_KEY` environment variable.

Production requirements:

1. Generate a strong key with `openssl rand -base64 32`.
2. Store it only in the production secret manager or deployment environment.
3. Never prefix it with `NEXT_PUBLIC_`.
4. Rotate it with a planned decrypt-and-reencrypt migration if compromise is suspected.

If `APP_ENCRYPTION_KEY` is missing, writes that include secrets fail with a safe server error. The abstraction keeps encryption logic isolated so the backing implementation can later move to KMS, Vault, or another managed key service.

## API contract

### List configurations

```http
GET /api/admin/service-config
```

Returns only safe data:

- provider
- enabled status
- display name
- plain metadata
- masked secret previews
- update metadata

Raw secrets are never returned.

### Create or update a configuration

```http
POST /api/admin/service-config
Content-Type: application/json

{
  "provider": "SMTP",
  "displayName": "Primary SMTP",
  "isEnabled": true,
  "metadata": {
    "host": "smtp.example.com",
    "port": 587,
    "from": "noreply@example.com"
  },
  "secrets": {
    "username": "smtp-user",
    "password": "smtp-password"
  }
}
```

If `secrets` is omitted or empty during an update, existing encrypted secrets are preserved.

### Enable or disable a service

```http
PATCH /api/admin/service-config
Content-Type: application/json

{
  "provider": "SMTP",
  "isEnabled": false
}
```

## Validation and errors

`lib/validators/service-config.ts` validates:

- supported provider names,
- display name length,
- boolean enabled state,
- metadata shape,
- secret key/value structure,
- provider-specific basic metadata such as SMTP port, email sender, OAuth redirect URI, or Stripe mode.

Validation errors are safe for clients and do not echo API key values. Production responses hide detailed internals.

## Logging

Configuration upsert and toggle attempts are logged with:

- event name,
- provider,
- actor user id,
- success state,
- timestamp,
- sanitized failure reason.

Secrets and API keys must not be added to log payloads.

## Integrations not activated by this module

This module stores configuration only. It does not implement or activate:

- Stripe checkout or webhook changes,
- Firebase app initialization,
- Cloudflare Stream/WebRTC session provisioning,
- SMTP delivery,
- SMS sending,
- push delivery,
- cloud-storage reads or writes,
- Google OAuth login,
- Facebook OAuth login.

Future provider adapters should read configuration through `AppConfigService`, decrypt secrets only on the server, and keep provider-specific side effects in dedicated service modules.
