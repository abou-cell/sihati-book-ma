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
