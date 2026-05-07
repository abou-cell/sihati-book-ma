# Firebase Auth Guide

This guide describes when and how Firebase Authentication can be used as the production identity provider for Sihati. The current application has centralized auth helpers but still uses development-only demo headers outside production, so Firebase is a recommended production replacement path.

## 1. When Firebase should be used

Use Firebase Auth when Sihati needs:

- Managed user sign-in and sign-up.
- Email/password, Google, Facebook, phone, or other OAuth providers.
- Server-verifiable ID tokens.
- A quick production-grade replacement for spoofable demo headers.
- A hosted auth console for user support operations.

Do not use Firebase Auth as a substitute for server-side authorization. Sihati must still enforce patient/practitioner/admin permissions on the backend.

## 2. Create a Firebase project

1. Open the Firebase console.
2. Create a project for the target environment, for example `sihati-prod` and `sihati-staging`.
3. Register a web app.
4. Save the web app configuration values.
5. Create or download a server service account only for backend token verification/admin operations.
6. Store service account values in the deployment secret manager, not in Git.

Recommended environment separation:

- One Firebase project for production.
- One Firebase project for staging.
- Optional local emulator project for development.

## 3. Enable providers

In Firebase Authentication, enable only the providers needed for launch.

Recommended initial providers:

- Email/password for direct account creation.
- Google OAuth if needed for patients/practitioners.
- Phone authentication only if SMS verification is part of the launch plan and costs are accepted.

Provider setup checklist:

- Configure authorized domains.
- Configure OAuth redirect domains.
- Use separate OAuth client credentials per environment.
- Add privacy policy and terms URLs when required.
- Disable unused providers.

## 4. Configure frontend

The frontend should use Firebase client SDK only for browser-safe operations:

- Sign in.
- Sign out.
- Read current Firebase user state.
- Send ID token to backend through a secure cookie/session exchange or Authorization header.

Suggested public environment variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
```

Only `NEXT_PUBLIC_*` Firebase web config belongs in browser code. Never expose service account credentials.

## 5. Configure backend

The backend must verify Firebase ID tokens before trusting identity.

Recommended backend flow:

1. Browser signs in with Firebase.
2. Browser sends Firebase ID token to an internal session endpoint or includes it in authenticated API requests.
3. Backend verifies the ID token with Firebase Admin SDK.
4. Backend maps Firebase `uid` to Sihati `User.id` or a linked identity table.
5. Backend resolves Sihati role from the database, not from untrusted client input.
6. Backend returns a signed, HTTP-only session cookie or processes the verified request directly.

Suggested server-only environment variables:

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
AUTH_SECRET=
```

If storing Firebase provider settings through the admin service configuration module, store non-sensitive metadata plainly and secrets in the encrypted secret bag.

## 6. Required code integration points

Production Firebase integration should replace the internals of the current auth adapter while preserving the public helper boundaries:

- Keep `getCurrentUserFromRequest()` as the API entry point.
- Keep `getCurrentUserFromServer()` as the server page entry point.
- Keep role checks in `requireCurrentUserForApi()`, `requireRolesForApi()`, and `requireRolesForPage()`.
- Keep permissions centralized in `lib/auth/permissions.ts`.
- Remove trust in `x-user-id` and `x-user-role` headers for production.

Recommended session type after migration:

```ts
type AuthSession = {
  userId: string;
  role: 'PATIENT' | 'PRACTITIONER' | 'ADMIN';
  source: 'firebase';
};
```

## 7. Environment variables

| Variable | Scope | Required | Description |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Public | Frontend Firebase | Firebase web app API key. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Public | Frontend Firebase | Firebase auth domain. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Public | Frontend Firebase | Firebase project ID. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Public | Frontend Firebase | Firebase web app ID. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Public | Optional | Required for messaging/push. |
| `FIREBASE_PROJECT_ID` | Server | Backend verification | Project ID used by Admin SDK. |
| `FIREBASE_CLIENT_EMAIL` | Server | Backend verification | Service account client email. |
| `FIREBASE_PRIVATE_KEY` | Server | Backend verification | Service account private key with newline handling. |
| `AUTH_SECRET` | Server | Sessions | Signs application sessions if using session cookies. |

## 8. User management

Firebase user accounts should be linked to Sihati user records.

Recommended model:

- Firebase owns authentication credentials.
- Sihati database owns domain profile, role, practitioner approval status, and application permissions.
- Admin role assignment occurs in Sihati admin tooling or controlled database operations, not through client-side claims alone.

Operational user tasks:

- Disable compromised accounts in Firebase.
- Reset passwords through Firebase flows.
- Keep audit logs for role changes in Sihati.
- Require email verification for sensitive actions if email/password is enabled.

## 9. Security rules

If Sihati uses Firestore or Firebase Storage in the future, rules must enforce ownership and roles. Do not rely only on client routing.

Example concepts:

- Patients can read only their own documents.
- Practitioners can read only assigned patient documents needed for care.
- Admins can read operational records required for support/compliance.
- Writes should validate authenticated user ID and allowed paths.

For the current Prisma-backed application, database authorization remains in the Next.js backend and service layer.

## 10. Migration path from current auth model

1. Add Firebase project and environment variables for staging.
2. Implement Firebase client sign-in pages without changing existing UI style.
3. Add backend token verification behind `lib/auth/session.ts`.
4. Map Firebase users to Sihati `User` records.
5. Resolve role from Sihati database.
6. Update protected API/page tests to use verified token/session fixtures.
7. Disable demo headers in all non-local environments.
8. Roll out to staging.
9. Run appointment, dashboard, admin, and consultation smoke tests.
10. Roll out to production.

## 11. Limitations

- Firebase Auth does not replace domain authorization.
- Firebase custom claims can become stale; always confirm sensitive roles server-side or refresh claims carefully.
- Phone authentication introduces SMS cost and abuse considerations.
- Service account keys must be rotated and protected.
- Multi-tenant or clinic-specific auth requirements may require additional application tables.
- Current code does not yet include Firebase SDK integration; this guide is the production migration plan.
