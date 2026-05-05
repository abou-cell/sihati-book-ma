import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AvailabilityService, type Appointment, type ConsultationReason } from "@/lib/services/availability.service";
import type { AvailabilityDateRange, AvailabilityRule, BlockedDate } from "@/lib/validators/availability";
import { availableSlotsQuerySchema } from "@/lib/validators/available-slots";

type PractitionerAccess = {
  id: string;
  isVerified: boolean;
};

const practitioners: PractitionerAccess[] = [
  { id: "p_1", isVerified: true },
  { id: "p_2", isVerified: true },
  { id: "p_3", isVerified: false },
];

const reasons: ConsultationReason[] = [
  { id: "reason_general", slotDurationMinutes: 30 },
  { id: "reason_followup", slotDurationMinutes: 20 },
];

const rules: AvailabilityRule[] = [
  {
    id: "rule_1",
    practitionerId: "p_1",
    weekday: "MONDAY",
    startTime: "09:00",
    endTime: "12:00",
    consultationType: "IN_PERSON",
    isActive: true,
  },
  {
    id: "rule_2",
    practitionerId: "p_1",
    weekday: "MONDAY",
    startTime: "13:00",
    endTime: "17:00",
    breakStart: "15:00",
    breakEnd: "15:20",
    consultationType: "VIDEO",
    isActive: true,
  },
];

const blockedDates: BlockedDate[] = [
  {
    id: "blocked_1",
    practitionerId: "p_1",
    date: "2026-05-18",
    reason: "Clinic closed",
  },
];

const appointments: Appointment[] = [
  {
    id: "apt_1",
    practitionerId: "p_1",
    startsAt: "2026-05-11T09:00:00.000Z",
    endsAt: "2026-05-11T09:30:00.000Z",
    consultationType: "IN_PERSON",
    status: "CONFIRMED",
  },
  {
    id: "apt_2",
    practitionerId: "p_1",
    startsAt: "2026-05-11T13:00:00.000Z",
    endsAt: "2026-05-11T13:20:00.000Z",
    consultationType: "VIDEO",
    status: "PENDING",
  },
];

const availabilityService = new AvailabilityService({
  async getRulesByPractitioner(practitionerId: string): Promise<AvailabilityRule[]> {
    return rules.filter((rule) => rule.practitionerId === practitionerId);
  },
  async getBlockedDatesByPractitioner(practitionerId: string, dateRange: AvailabilityDateRange): Promise<BlockedDate[]> {
    return blockedDates.filter(
      (blockedDate) =>
        blockedDate.practitionerId === practitionerId &&
        blockedDate.date >= dateRange.from &&
        blockedDate.date <= dateRange.to
    );
  },
  async getAppointmentsByPractitioner(practitionerId: string, dateRange: AvailabilityDateRange): Promise<Appointment[]> {
    const from = new Date(`${dateRange.from}T00:00:00.000Z`);
    const to = new Date(`${dateRange.to}T23:59:59.999Z`);

    return appointments.filter((appointment) => {
      if (appointment.practitionerId !== practitionerId) {
        return false;
      }

      const startsAt = new Date(appointment.startsAt);
      return startsAt >= from && startsAt <= to;
    });
  },
  async getReasonById(reasonId: string): Promise<ConsultationReason | null> {
    return reasons.find((reason) => reason.id === reasonId) ?? null;
  },
});

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const rawParams = Object.fromEntries(new URL(request.url).searchParams.entries());
    const query = availableSlotsQuerySchema.parse(rawParams);

    const practitioner = practitioners.find((item) => item.id === id);
    if (!practitioner) {
      return NextResponse.json({ message: "Practitioner not found" }, { status: 404 });
    }

    if (query.isPublic && !practitioner.isVerified) {
      return NextResponse.json({ message: "Practitioner not available for public booking" }, { status: 403 });
    }

    const availableSlots = await availabilityService.getAvailableSlots(
      id,
      query.reasonId,
      { from: query.startDate, to: query.endDate },
      query.consultationType
    );

    const response = Object.values(
      availableSlots.reduce<Record<string, { date: string; slots: Array<{ startTime: string; endTime: string; consultationType: string }> }>>(
        (acc, slot) => {
          const date = slot.startsAt.slice(0, 10);
          if (!acc[date]) {
            acc[date] = { date, slots: [] };
          }

          acc[date].slots.push({
            startTime: slot.startsAt,
            endTime: slot.endsAt,
            consultationType: slot.consultationType,
          });

          return acc;
        },
        {}
      )
    ).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ data: response }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: "Invalid query parameters",
          errors: error.flatten(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "Unexpected server error" }, { status: 500 });
  }
}
