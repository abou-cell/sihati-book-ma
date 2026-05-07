import { PrismaAvailabilityRepository } from "@/lib/repositories/availability.repository";
import { mockAvailabilityRepository } from "@/lib/repositories/mock/availability.repository";
import { PrismaPractitionerRepository, type PractitionerPublicRecord } from "@/lib/repositories/practitioner.repository";
import { AppError, safeJsonResponse, withErrorHandling } from "@/lib/security/errors";
import { buildRateLimitKey, enforceRateLimit } from "@/lib/security/rate-limit";
import { AvailabilityService } from "@/lib/services/availability.service";
import { availableSlotsQuerySchema } from "@/lib/validators/available-slots";

function createAvailabilityService(): AvailabilityService {
  if (process.env.DATABASE_URL) {
    return new AvailabilityService(new PrismaAvailabilityRepository());
  }

  if (process.env.NODE_ENV === "production") {
    throw new AppError(
      "DATABASE_NOT_CONFIGURED",
      503,
      "Available slot lookup requires DATABASE_URL in production.",
    );
  }

  return new AvailabilityService(mockAvailabilityRepository);
}

async function getPractitioner(id: string): Promise<PractitionerPublicRecord | null> {
  if (process.env.DATABASE_URL) {
    return new PrismaPractitionerRepository().getPublicById(id);
  }

  if (process.env.NODE_ENV === "production") {
    throw new AppError("DATABASE_NOT_CONFIGURED", 503, "Practitioner lookup requires DATABASE_URL in production.");
  }

  return { id, isVerified: true, name: "MVP mock practitioner", specialty: "MVP placeholder", city: "MVP placeholder" };
}

export const GET = withErrorHandling(async (request: Request, context?: { params?: Promise<Record<string, string>> }) => {
  enforceRateLimit({ key: buildRateLimitKey("available-slots", request), limit: 120, windowMs: 60_000 });

  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) throw new AppError("INVALID_PRACTITIONER", 400, "Practitioner id is required");

  const rawParams = Object.fromEntries(new URL(request.url).searchParams.entries());
  const query = availableSlotsQuerySchema.parse(rawParams);

  const practitioner = await getPractitioner(id);

  if (!practitioner) throw new AppError("PRACTITIONER_NOT_FOUND", 404, "Practitioner not found");
  if (query.isPublic && !practitioner.isVerified) throw new AppError("PUBLIC_BOOKING_FORBIDDEN", 403, "Practitioner not available for public booking");

  const availableSlots = await createAvailabilityService().getAvailableSlots(id, query.reasonId, { from: query.startDate, to: query.endDate }, query.consultationType);
  const response = Object.values(availableSlots.reduce<Record<string, { date: string; slots: Array<{ startTime: string; endTime: string; consultationType: string }> }>>((acc, slot) => {
    const date = slot.startsAt.slice(0, 10);
    if (!acc[date]) acc[date] = { date, slots: [] };
    acc[date].slots.push({ startTime: slot.startsAt, endTime: slot.endsAt, consultationType: slot.consultationType });
    return acc;
  }, {})).sort((a, b) => a.date.localeCompare(b.date));

  return safeJsonResponse(response, 200);
});
