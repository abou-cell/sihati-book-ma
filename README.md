# Sihati

Sihati is a Moroccan medical appointment booking platform built with Next.js and TypeScript.

## Environment configuration

Runtime environment validation is implemented with Zod in `lib/env.ts`, and app configuration is centralized in `lib/config/app.ts`.

### Environment variable table

| Variable | Scope | Required in development | Required in production | Description |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public | Yes | Yes | Public base URL for browser and server usage. |
| `DATABASE_URL` | Server-only | Optional now | Yes | Database connection string for backend modules. |
| `AUTH_SECRET` | Server-only | Optional now | Yes | Secret used for auth signing/encryption (future module). |
| `STRIPE_SECRET_KEY` | Server-only | Optional now | Yes | Stripe secret key (future payment module). |
| `STRIPE_WEBHOOK_SECRET` | Server-only | Optional now | Yes | Stripe webhook verification secret (future payment module). |
| `EMAIL_FROM` | Server-only | Optional now | Yes | Default sender address (future email module). |
| `RESEND_API_KEY` | Server-only | Optional now | Yes | Resend API key (future email module). |

## Local setup

1. Install Node.js 20.11+.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create local env file:
   ```bash
   cp .env.example .env.local
   ```
4. Start development server:
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` — run local development server.
- `npm run build` — create production build.
- `npm run start` — run production server.
- `npm run lint` — run ESLint.
- `npm run typecheck` — run TypeScript checks.
- `npm run check` — run lint and typecheck (recommended pre-commit/pre-deploy).

## Practitioner search API

### Endpoint

`GET /api/practitioners/search`

### Query parameters

- `q`: text search across practitioner name, specialty, clinic, and city.
- `specialty`: exact specialty filter.
- `city`: exact city filter.
- `video`: `true`/`false` to filter practitioners who accept video consultation.
- `availableToday`: `true`/`false` to filter by same-day availability.
- `minPrice`: minimum consultation fee.
- `maxPrice`: maximum consultation fee.
- `sort`: one of `nextAvailable`, `priceAsc`, `priceDesc`.
- `page`: page number (minimum `1`).
- `limit`: page size (minimum `1`, maximum `50`).

### Example requests

- `/api/practitioners/search?q=cardio&city=Rabat`
- `/api/practitioners/search?specialty=Dermatology&video=true&sort=priceAsc&page=1&limit=10`
- `/api/practitioners/search?minPrice=200&maxPrice=500&availableToday=true`

### Response shape

```json
{
  "data": [
    {
      "id": "p_1",
      "slug": "dr-sara-alaoui",
      "name": "Dr. Sara Alaoui",
      "specialty": "Dermatology",
      "city": "Casablanca",
      "address": "Maarif Center, Casablanca",
      "consultationFee": 300,
      "videoConsultationFee": 250,
      "acceptsVideoConsultation": true,
      "isVerified": true,
      "nextAvailableSlot": "2026-05-06T09:00:00.000Z",
      "ratingAverage": 4.8,
      "reviewsCount": 128
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```


## Practitioner available slots API

### Endpoint

`GET /api/practitioners/[id]/available-slots`

### Query parameters

- `reasonId` (required): consultation reason id.
- `startDate` (required): `YYYY-MM-DD`.
- `endDate` (required): `YYYY-MM-DD`.
- `consultationType` (required): `IN_PERSON` or `VIDEO`.
- `isPublic` (optional, default `true`): when `true`, unverified practitioners are blocked.

### Example request

`/api/practitioners/p_1/available-slots?reasonId=reason_general&startDate=2026-05-10&endDate=2026-05-20&consultationType=IN_PERSON`

### Example response

```json
{
  "data": [
    {
      "date": "2026-05-11",
      "slots": [
        {
          "startTime": "2026-05-11T09:30:00.000Z",
          "endTime": "2026-05-11T10:00:00.000Z",
          "consultationType": "IN_PERSON"
        }
      ]
    }
  ]
}
```

### Validation and business rules

- Query validation is enforced with Zod and returns structured `400` errors.
- `endDate` must be on or after `startDate`.
- Requested date range is limited to a maximum of **30 days**.
- `consultationType` must be one of `IN_PERSON` or `VIDEO`.
- Slot generation uses `AvailabilityService` and excludes:
  - blocked dates,
  - confirmed appointments,
  - pending appointments that can block payment flow,
  - past time slots.
- Public access (`isPublic=true`) is denied for unverified practitioners.

## Testing and quality best practices

- Run `npm run check` before every commit.
- Add unit/integration tests for API modules (`validators`, `services`, route handlers) as features are introduced.
- Gate deployments through CI using lint, typecheck, tests, and build.
- Keep API response contracts versioned and covered by automated tests before release.

## Deployment notes

- Configure all production-required variables via your platform secret manager.
- In production mode, startup validation fails when required server secrets are missing.
- Rotate secrets regularly and separate credentials across dev/staging/prod.
- Deploy behind HTTPS, enable structured request logging, and monitor 4xx/5xx rates for API reliability.

## Security notes

- Only `NEXT_PUBLIC_*` values may be exposed to client bundles.
- Keep server secrets out of source control and browser-accessible code.
- Never print raw secrets in logs or error responses.
- Validate all incoming API query input and enforce bounded pagination.

For deeper configuration details, see `docs/configuration.md`.

## Search page notes

- Route: `/search` (`app/(public)/search/page.tsx`).
- The page is client-rendered and keeps filter state synchronized with URL query parameters for shareable links and browser navigation consistency.
- Data source: `GET /api/practitioners/search`.
- Includes loading, empty, and error result states plus previous/next pagination controls.
- The **Book appointment** CTA currently links to `/practitioners/[slug]` profile pages (booking flow is intentionally not implemented yet).

### Filter behavior

- `q`: text search across practitioner name, specialty, clinic, and city.
- `specialty`: exact specialty filter (case-insensitive on backend).
- `city`: exact city filter (case-insensitive on backend).
- `video=true`: shows only practitioners that support video consultation.
- `availableToday=true`: shows only practitioners with a next available slot on current date.
- `minPrice` / `maxPrice`: bounded integer filtering for in-person consultation fee.
- `sort`: supports `nextAvailable`, `priceAsc`, and `priceDesc`.
- `page`: updated when paginating; reset to `1` when filters change.

## Practitioner availability module

### Availability logic

- Route: `/dashboard/practitioner/availability`.
- Practitioners can create and manage multiple availability rules.
- Each rule targets a single weekday and one consultation type (`IN_PERSON` or `VIDEO`).
- Rules can be toggled active/inactive without deletion.
- Practitioners can block specific dates that should not expose any slots.
- Input validation is centralized in `lib/validators/availability.ts`.

### Slot generation rules

Main service function: `getAvailableSlots(practitionerId, reasonId, dateRange, consultationType)`.

Generation pipeline:

1. Validate input payload (`practitionerId`, `reasonId`, date range, consultation type).
2. Load active availability rules for the practitioner and selected consultation type.
3. Load blocked dates for the same practitioner and date range.
4. Load existing appointments in range and exclude cancelled records.
5. Load consultation reason and use its `slotDurationMinutes`.
6. For each day in date range:
   - Skip blocked dates.
   - Match weekday rules.
   - Generate contiguous slots from `startTime` to `endTime`.
   - Remove slots overlapping break window (`breakStart`-`breakEnd`).
   - Remove past slots.
   - Remove already booked slots.
7. Return chronologically sorted available slots.

### Security notes for availability

- Always scope reads/writes by authenticated practitioner id (no cross-practitioner access).
- Never trust client-supplied practitioner ids without server-side ownership verification.
- Validate all rule and blocked-date payloads on the server before persistence.
- Exclude cancelled appointments only; pending/confirmed appointments must block slots.
- Keep slot generation and filtering in server-side service modules to prevent client tampering.

## Setup, testing, and deployment guidance (production)

### Setup

- Use Node.js `>=20.11.0`.
- Install dependencies via `npm install`.
- Configure environment variables in `.env.local` (development) and your secret manager (staging/production).

### Testing strategy

- Minimum local gate before commit: `npm run check`.
- Add unit tests for:
  - availability validators
  - `getAvailableSlots` edge cases (breaks, blocked dates, booked slots, past slots)
- Add integration tests for authenticated practitioner ownership enforcement in availability routes.

### Deployment best practices

- Enforce CI stages: lint -> typecheck -> tests -> build.
- Deploy immutable builds and pin runtime Node version.
- Add structured logs and alerting for scheduling failures and abnormal slot-generation latency.
- Rotate secrets and audit access controls for practitioner scheduling data regularly.

## Appointment creation flow

### Route and files

- Booking confirmation page: `app/booking/new/page.tsx`
- Appointment validator: `lib/validators/appointment.ts`
- Appointment orchestration service: `lib/services/appointment.service.ts`
- API endpoint: `POST /api/appointments` in `app/api/appointments/route.ts`

### URL contract for booking page

`/booking/new?practitionerId=...&reasonId=...&consultationType=IN_PERSON|VIDEO&startTime=ISO_DATE`

The page reads all required parameters from the URL, renders practitioner/reason/date-time/price summaries, and asks user confirmation before creating the appointment.

### Appointment status rules

- `IN_PERSON` => appointment is created directly as `CONFIRMED`.
- `VIDEO` => appointment is created as `PENDING` to support a future payment capture flow.

### API security and business rules

`POST /api/appointments` enforces:

- authenticated user headers present and role = `PATIENT`.
- practitioner must be verified before booking.
- consultation reason must belong to selected practitioner.
- `VIDEO` booking is blocked if reason is not video-enabled.
- start time must be a valid future ISO datetime.
- slot is re-checked for availability before creation.
- a second race-condition check is done right at insert time.
- placeholder notification is created after appointment record.

### Setup, test, and deployment instructions

#### Setup

1. Install dependencies: `npm install`
2. Start local app: `npm run dev`
3. Open booking page with params, for example:
   - `/booking/new?practitionerId=p_1&reasonId=reason_general&consultationType=IN_PERSON&startTime=2026-06-01T09:00:00.000Z`

#### Test and quality

- Run lint and type safety checks:
  - `npm run check`
- Run default test gate:
  - `npm test`
- Add integration tests for concurrent booking attempts and role authorization failures.

#### Deployment notes

- Keep appointment creation server-side (API route + service).
- Enforce real authentication middleware/session validation in production (replace demo headers).
- Add database unique/partial index over `(practitionerId, startTime)` for non-cancelled appointments.
- Emit audit logs for appointment creation and conflict failures.


## Booking success page

### Route and behavior

- Route: `/booking/success/[appointmentId]`.
- Displays appointment confirmation with:
  - practitioner name,
  - specialty,
  - clinic address for in-person appointments,
  - video consultation status for video appointments,
  - appointment date and time,
  - **View my appointments** CTA,
  - **Add to calendar** placeholder button (non-functional by design).
- Payment logic is intentionally excluded from this page.
- Video room creation is intentionally excluded from this page unless provided by a dedicated existing module.

### Access control rules

- Returns `404` when `appointmentId` does not exist.
- Allows access for:
  - the patient who owns the appointment,
  - the practitioner assigned to the same appointment.
- Denies access (`403`) to:
  - unauthenticated users,
  - authenticated users unrelated to the appointment.
- Authorization checks are enforced server-side in the page module and must not rely on client-side gating.

## Patient dashboard module

### Route

- `/dashboard/patient` (`app/dashboard/patient/page.tsx`).

### Patient dashboard features

- Displays upcoming appointments and past appointments in separate sections.
- Shows appointment status, practitioner name, specialty, date/time, and consultation type.
- Supports optional cancellation reason input for future appointments.
- Exposes **Cancel appointment** action for future appointments only.
- Exposes **View details** action for both future and past appointments.
- Shows **Join video** action only for `VIDEO` appointments when join is available.
- Includes a medical documents placeholder section.
- Includes a patient profile summary card.
- Uses responsive layout with stacked mobile sections and multi-column desktop layout.

### Access control rules

- Route is restricted to users with role `PATIENT`.
- Patient can only see appointments where `appointment.patientId === currentUser.id`.
- Patient cannot cancel past appointments.
- Cancellation reason is optional and persisted in local dashboard state for detail view.

### Setup, test, and deployment instructions

#### Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start development server:
   ```bash
   npm run dev
   ```
3. Open patient dashboard route:
   ```
   http://localhost:3000/dashboard/patient
   ```

#### Testing

- Run static quality checks:
  ```bash
  npm run lint
  npm run typecheck
  ```
- Recommended pre-commit gate:
  ```bash
  npm run check
  ```

#### Deployment

- Build production artifact:
  ```bash
  npm run build
  ```
- Run production server:
  ```bash
  npm run start
  ```
- Enforce CI quality gates (`lint`, `typecheck`, tests, build) before release.
- Ensure role and ownership checks remain server-enforced when wiring real auth and data sources.
