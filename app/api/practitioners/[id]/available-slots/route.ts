import { AvailabilityService, type Appointment, type ConsultationReason } from "@/lib/services/availability.service";
import { AppError, safeJsonResponse, withErrorHandling } from "@/lib/security/errors";
import type { AvailabilityDateRange, AvailabilityRule, BlockedDate } from "@/lib/validators/availability";
import { availableSlotsQuerySchema } from "@/lib/validators/available-slots";

const practitioners = [
  { id: "p_1", isVerified: true },
  { id: "p_2", isVerified: true },
  { id: "p_3", isVerified: false },
];

const reasons: ConsultationReason[] = [
  { id: "reason_general", slotDurationMinutes: 30 },
  { id: "reason_followup", slotDurationMinutes: 20 },
];
const rules: AvailabilityRule[] = [{ id: "rule_1", practitionerId: "p_1", weekday: "MONDAY", startTime: "09:00", endTime: "12:00", consultationType: "IN_PERSON", isActive: true }];
const blockedDates: BlockedDate[] = [{ id: "blocked_1", practitionerId: "p_1", date: "2026-05-18", reason: "Clinic closed" }];
const appointments: Appointment[] = [{ id: "apt_1", practitionerId: "p_1", startsAt: "2026-05-11T09:00:00.000Z", endsAt: "2026-05-11T09:30:00.000Z", consultationType: "IN_PERSON", status: "CONFIRMED" }];

const availabilityService = new AvailabilityService({
  async getRulesByPractitioner(practitionerId: string): Promise<AvailabilityRule[]> { return rules.filter((rule) => rule.practitionerId === practitionerId); },
  async getBlockedDatesByPractitioner(practitionerId: string, dateRange: AvailabilityDateRange): Promise<BlockedDate[]> { return blockedDates.filter((blockedDate) => blockedDate.practitionerId === practitionerId && blockedDate.date >= dateRange.from && blockedDate.date <= dateRange.to); },
  async getAppointmentsByPractitioner(practitionerId: string, dateRange: AvailabilityDateRange): Promise<Appointment[]> {
    const from = new Date(`${dateRange.from}T00:00:00.000Z`); const to = new Date(`${dateRange.to}T23:59:59.999Z`);
    return appointments.filter((appointment) => appointment.practitionerId === practitionerId && new Date(appointment.startsAt) >= from && new Date(appointment.startsAt) <= to);
  },
  async getReasonById(reasonId: string): Promise<ConsultationReason | null> { return reasons.find((reason) => reason.id === reasonId) ?? null; },
});

export const GET = withErrorHandling(async (request: Request, context?: { params?: Promise<Record<string, string>> }) => {
  const params = context?.params ? await context.params : {};
  const id = params.id;

  if (!id) {
    throw new AppError("INVALID_PRACTITIONER", 400, "Practitioner id is required");
  }

  const rawParams = Object.fromEntries(new URL(request.url).searchParams.entries());
  const query = availableSlotsQuerySchema.parse(rawParams);
  const practitioner = practitioners.find((item) => item.id === id);

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
