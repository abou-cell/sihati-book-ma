# Video Consultation Security and Provider Integration

## Overview

Sihati protects video consultation joins through a server-side service boundary in `lib/services/video-consultation.service.ts`. The browser entry point is `app/consultation/[appointmentId]/page.tsx`, but the page does not make authorization decisions itself. It resolves the authenticated user and asks the service for room access.

Provider provisioning remains an infrastructure task, but the application now has a production-oriented contract for Cloudflare Stream/WebRTC or an equivalent provider.

## Join decision policy

A room access request must pass all of the following checks:

1. The user is authenticated through the server-side session helpers.
2. The appointment exists.
3. The appointment is a `VIDEO` consultation.
4. The appointment is `CONFIRMED`.
5. The appointment is not `CANCELLED` or `COMPLETED`.
6. The appointment access window has not expired. Sihati allows access until two hours after the appointment end time.
7. The actor is one of:
   - the owning patient,
   - the assigned practitioner,
   - an admin.

Invalid, unauthorized, cancelled, completed, non-video, and expired appointments fail closed and are redirected to the common access-denied page from the consultation entry.

## Room identifiers

Room identifiers are provider-independent and generated server-side with an HMAC. They use the shape:

```text
sihati-v1-<opaque digest>
```

The digest is derived from the internal appointment ID and the server signing secret. The resulting room ID does not contain the raw appointment ID and is safe to pass to a video provider.

## Signed room tokens

Room tokens are created only on the server and are short-lived. The token payload contains the opaque room ID, hashed appointment reference, actor ID and role, provider, issue time, expiry time, and nonce. Tokens are HMAC-signed with the same server-side video signing secret source.

Operational rules:

- Do not log room tokens.
- Do not put token payloads in audit records.
- Keep token TTL short; the current TTL is five minutes.
- Rotate signing secrets with a planned deployment window because existing room tokens become invalid after rotation.

## Provider adapter

`VideoProviderAdapter` is the provider boundary. A provider implementation receives:

- opaque `roomId`,
- signed `roomToken`,
- token expiry timestamp.

It returns provider-specific join and embed URLs. `CloudflareStreamWebRtcAdapter` is the initial adapter for the `CLOUDFLARE_STREAM_WEBRTC` provider enum. Production Cloudflare provisioning should replace placeholder URL metadata with the deployed Cloudflare room/session endpoint and any TURN/STUN configuration required by the provider.

## Audit logging

Every join attempt writes a sanitized audit event with action `video_consultation.join_attempt`.

Audit records may include:

- actor role,
- hashed actor ID,
- hashed appointment ID,
- hashed patient ID,
- hashed practitioner ID,
- reason code such as `allowed`, `VIDEO_ACCESS_DENIED`, or `APPOINTMENT_NOT_JOINABLE`,
- request ID when supplied.

Audit records must not include:

- room tokens,
- token payloads,
- names,
- emails,
- raw patient/practitioner/appointment IDs,
- clinical or health information.

## Admin configuration

The admin service configuration provider enum includes `CLOUDFLARE_STREAM_WEBRTC`. Store non-secret provider metadata, such as account or endpoint identifiers, in service configuration metadata. Store provider secrets in encrypted service configuration secrets. API responses must continue to return masked secret previews only.

## Test coverage

The video consultation service tests cover unauthenticated access, wrong patient, wrong practitioner, admin access, cancelled appointments, non-video appointments, expired room tokens, opaque room ID generation, and sanitized audit logging.
