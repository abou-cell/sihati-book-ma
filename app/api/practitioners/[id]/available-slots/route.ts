import { AvailabilityService } from "@/lib/services/availability.service";
import { PrismaAvailabilityRepository } from "@/lib/repositories/availability.repository";
import { PrismaPractitionerRepository } from "@/lib/repositories/practitioner.repository";
import { mockAvailabilityRepository } from "@/lib/repositories/mock/availability.repository";
import { AppError, safeJsonResponse, withErrorHandling } from "@/lib/security/errors";
import { availableSlotsQuerySchema } from "@/lib/validators/available-slots";

const availabilityService = new AvailabilityService(process.env.DATABASE_URL ? new PrismaAvailabilityRepository() : mockAvailabilityRepository);
const practitionerRepository = new PrismaPractitionerRepository();

export const GET = withErrorHandling(async (request: Request, context?: { params?: Promise<Record<string, string>> }) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;
  if (!id) throw new AppError("INVALID_PRACTITIONER", 400, "Practitioner id is required");

  const rawParams = Object.fromEntries(new URL(request.url).searchParams.entries());
  const query = availableSlotsQuerySchema.parse(rawParams);

  const practitioner = process.env.DATABASE_URL
    ? await practitionerRepository.getPublicById(id)
    : ({ id: "p_1", isVerified: true, name: "", specialty: "", city: "" });

  if (!practitioner) throw new AppError("PRACTITIONER_NOT_FOUND", 404, "Practitioner not found");
  if (query.isPublic && !practitioner.isVerified) throw new AppError("PUBLIC_BOOKING_FORBIDDEN", 403, "Practitioner not available for public booking");

  const availableSlots = await availabilityService.getAvailableSlots(id, query.reasonId, { from: query.startDate, to: query.endDate }, query.consultationType);
  const response = Object.values(availableSlots.reduce<Record<string, { date: string; slots: Array<{ startTime: string; endTime: string; consultationType: string }> }>>((acc, slot) => {
    const date = slot.startsAt.slice(0, 10);
    if (!acc[date]) acc[date] = { date, slots: [] };
    acc[date].slots.push({ startTime: slot.startsAt, endTime: slot.endsAt, consultationType: slot.consultationType });
    return acc;
  }, {})).sort((a, b) => a.date.localeCompare(b.date));

  return safeJsonResponse(response, 200);
});
