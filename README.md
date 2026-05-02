# Sihati

Sihati is a Moroccan medical appointment booking platform (initial setup) inspired by modern healthcare scheduling workflows. This foundation is designed for future modules such as practitioner search, patient booking, practitioner/admin dashboards, in-person appointments, secure video consultations, and online payments for teleconsultations.

## Tech Stack

- Next.js (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- ESLint (Next.js core web vitals)
- Modular component architecture

## Folder Structure

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
lib/
  auth/
  config/
  db/
  security/
  services/
  validators/
  utils.ts
docs/
emails/
prisma/
tests/
types/
```

## Available Scripts

- `npm run dev`: Start local development server
- `npm run build`: Create production build
- `npm run start`: Run production server
- `npm run lint`: Run lint checks
- `npm run typecheck`: Run TypeScript type checks

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```
3. Start development server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000`.

## Testing (Placeholder)

A full testing stack (unit, integration, and e2e) will be added in the next module. Recommended baseline:
- Unit/component: Vitest + React Testing Library
- E2E: Playwright
- CI gates: lint + typecheck + tests + build

## Deployment (Placeholder)

Recommended deployment target: Vercel for first release, with environment-specific configuration and branch preview deployments.

Production readiness checklist (next phase):
- Add CI/CD pipeline (GitHub Actions)
- Add runtime monitoring and error reporting
- Add security headers/CSP hardening per environment
- Add dependency and secret scanning
- Add database migrations and backup strategy

## Next Recommended Module

Implement authentication and authorization foundations (patient, practitioner, admin roles) with secure session management, route protection, and role-based layout guards.
