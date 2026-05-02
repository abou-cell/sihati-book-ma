# Sihati

Sihati is a Moroccan medical appointment booking platform (initial setup) inspired by modern healthcare booking workflows. This repository currently contains a production-ready foundation for future modules such as practitioner search, patient booking, practitioner/admin dashboards, video consultations, and online payment.

## Tech stack

- Next.js (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- ESLint
- Modular component architecture

## Folder structure

```text
app/
  (public)/
  (auth)/
  admin/
  dashboard/
    patient/
    practitioner/
  globals.css
  layout.tsx
  page.tsx
components/
  booking/
  calendar/
  cards/
  forms/
  layout/
  search/
  ui/
docs/
emails/
lib/
  auth/
  config/
  db/
  security/
  services/
  validators/
  utils.ts
prisma/
tests/
types/
```

## Available scripts

- `npm run dev` — start development server
- `npm run build` — create production build
- `npm run start` — run production server
- `npm run lint` — run ESLint checks
- `npm run typecheck` — run TypeScript checks

## Local development instructions

1. Install Node.js 20.11+.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```
4. Start development server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000`.

## Testing placeholder

Testing is intentionally minimal at this stage. Recommended next steps:

- Add unit tests for reusable UI and utility modules (e.g., with Vitest + React Testing Library).
- Add integration/e2e tests for key flows (e.g., Playwright).
- Add CI checks for `lint`, `typecheck`, tests, and build.

## Deployment placeholder

Recommended production deployment baseline:

- Platform: Vercel (or containerized deployment with Node.js 20+).
- Required checks before deploy: `npm run lint`, `npm run typecheck`, `npm run build`.
- Configure environment variables securely via platform secrets manager.
- Add security headers, observability, uptime monitoring, and rollback strategy in the next iteration.

## Next recommended module

Implement **practitioner search domain modeling and API layer** next (without booking flow yet), including:

- Search filters (specialty, city, language)
- Typed DTOs/validators
- Service abstraction and mocked data source
- Initial tests for search behavior
