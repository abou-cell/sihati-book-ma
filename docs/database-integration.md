# Database integration status

## Checks completed (May 5, 2026)
- `prisma/schema.prisma` exists and defines core booking models.
- Prisma Client is configured in `lib/db/prisma.ts` with singleton protection.
- Seed script is **not** implemented yet (`prisma/seed.ts` missing).
- In-memory data usage was audited and isolated behind repository interfaces.

## Repository layer overview
- `lib/repositories/practitioner.repository.ts`
  - `PrismaPractitionerRepository` for practitioner public reads.
  - `PrismaPractitionerSearchRepository` for searchable practitioner listing.
- `lib/repositories/availability.repository.ts` for rules/blocked dates/appointments/reasons.
- `lib/repositories/appointment.repository.ts` for transactional appointment creation + slot conflict recheck.
- `lib/repositories/notification.repository.ts` for notification persistence.
- `lib/repositories/user.repository.ts` for safe user reads (never exposes `passwordHash`).

## Route integration status
- `POST /api/appointments` uses Prisma-backed repository + service.
- `GET /api/practitioners/[id]/available-slots` uses Prisma when `DATABASE_URL` is set, otherwise mock fallback.
- `GET /api/practitioners/search` now uses repository abstraction and switches between Prisma and mock repository.

## Remaining mock areas
- `lib/repositories/mock/availability.repository.ts` (fallback for non-DB environments).
- `lib/repositories/mock/practitioner-search.repository.ts` (fallback for non-DB environments).

## Security and reliability notes
- Safe DTO selection is used for users; `passwordHash` is never returned.
- Appointment creation uses a transaction to reduce booking race-condition risks.

## TODO
- Add executable seed support (`prisma/seed.ts` and package scripts).
- Add DB-level unique protection for active practitioner slot conflicts.
