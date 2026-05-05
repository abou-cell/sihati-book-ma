# Database integration status

## Checks completed (2026-05-05)
- `prisma/schema.prisma`: added.
- Prisma client configuration: added (`lib/db/prisma.ts`).
- Seed data: not yet implemented as executable seed script.
- In-memory usage detected and isolated.

## Repository layer
- `lib/repositories/practitioner.repository.ts` (Prisma-backed practitioner reads).
- `lib/repositories/availability.repository.ts` (Prisma-backed availability and appointment-slot reads).
- `lib/repositories/appointment.repository.ts` (Prisma-backed booking with transaction conflict check).
- `lib/repositories/notification.repository.ts` (Prisma-backed notification persistence).
- `lib/repositories/user.repository.ts` (safe user reads without `passwordHash`).

## Route integration
- `POST /api/appointments` now uses `PrismaAppointmentRepository` via `AppointmentService`.
- `GET /api/practitioners/[id]/available-slots` uses Prisma repositories when `DATABASE_URL` is defined.

## Remaining mock areas
- Availability route fallback mock repository is isolated in `lib/repositories/mock/availability.repository.ts` for non-DB environments.
- Frontend demo pages still contain local demo arrays (patient dashboard, consultation demo, booking success demo) and are intentionally unchanged to avoid UI/business-flow breakage.

## Security notes
- Public repository DTOs never expose `passwordHash`.
- Booking creation uses transaction-based slot conflict recheck.

## TODO
- Add Prisma seed script (`prisma/seed.ts`) and npm seed command.
- Add database-level partial unique index for non-cancelled appointment slot conflict prevention.
- Migrate remaining route/page mock datasets behind repository interfaces.
