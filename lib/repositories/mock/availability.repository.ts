import type { AvailabilityRepository } from "@/lib/repositories/availability.repository";
import type { Appointment, ConsultationReason } from "@/lib/services/availability.service";
import type { AvailabilityDateRange, AvailabilityRule, BlockedDate } from "@/lib/validators/availability";

const reasons: ConsultationReason[] = [{ id: "reason_general", slotDurationMinutes: 30 }, { id: "reason_followup", slotDurationMinutes: 20 }];
const rules: AvailabilityRule[] = [{ id: "rule_1", practitionerId: "p_1", weekday: "MONDAY", startTime: "09:00", endTime: "12:00", consultationType: "IN_PERSON", isActive: true }];
const blockedDates: BlockedDate[] = [{ id: "blocked_1", practitionerId: "p_1", date: "2026-05-18", reason: "Clinic closed" }];
const appointments: Appointment[] = [{ id: "apt_1", practitionerId: "p_1", startsAt: "2026-05-11T09:00:00.000Z", endsAt: "2026-05-11T09:30:00.000Z", consultationType: "IN_PERSON", status: "CONFIRMED" }];

export const mockAvailabilityRepository: AvailabilityRepository = {
  async getRulesByPractitioner(practitionerId: string) { return rules.filter((rule) => rule.practitionerId === practitionerId); },
  async getBlockedDatesByPractitioner(practitionerId: string, dateRange: AvailabilityDateRange) { return blockedDates.filter((b) => b.practitionerId === practitionerId && b.date >= dateRange.from && b.date <= dateRange.to); },
  async getAppointmentsByPractitioner(practitionerId: string, dateRange: AvailabilityDateRange) {
    const from = new Date(`${dateRange.from}T00:00:00.000Z`); const to = new Date(`${dateRange.to}T23:59:59.999Z`);
    return appointments.filter((a) => a.practitionerId === practitionerId && new Date(a.startsAt) >= from && new Date(a.startsAt) <= to);
  },
  async getReasonById(reasonId: string) { return reasons.find((r) => r.id === reasonId) ?? null; },
};
