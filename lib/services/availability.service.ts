import {
  AvailabilityDateRange,
  AvailabilityRule,
  BlockedDate,
  ConsultationType,
  SlotQuery,
  slotQuerySchema,
} from "@/lib/validators/availability";

export type Appointment = {
  id: string;
  practitionerId: string;
  startsAt: string;
  endsAt: string;
  consultationType: ConsultationType;
  status: "CONFIRMED" | "PENDING" | "CANCELLED";
};

export type ConsultationReason = {
  id: string;
  slotDurationMinutes: number;
};

type AvailabilityRepository = {
  getRulesByPractitioner(practitionerId: string): Promise<AvailabilityRule[]>;
  getBlockedDatesByPractitioner(practitionerId: string, dateRange: AvailabilityDateRange): Promise<BlockedDate[]>;
  getAppointmentsByPractitioner(practitionerId: string, dateRange: AvailabilityDateRange): Promise<Appointment[]>;
  getReasonById(reasonId: string): Promise<ConsultationReason | null>;
};

export type AvailableSlot = {
  startsAt: string;
  endsAt: string;
  practitionerId: string;
  consultationType: ConsultationType;
};

export class AvailabilityService {
  constructor(private readonly repository: AvailabilityRepository) {}

  async getAvailableSlots(
    practitionerId: string,
    reasonId: string,
    dateRange: AvailabilityDateRange,
    consultationType: ConsultationType
  ): Promise<AvailableSlot[]> {
    const parsedQuery: SlotQuery = slotQuerySchema.parse({
      practitionerId,
      reasonId,
      dateRange,
      consultationType,
    });

    const [rules, blockedDates, appointments, reason] = await Promise.all([
      this.repository.getRulesByPractitioner(parsedQuery.practitionerId),
      this.repository.getBlockedDatesByPractitioner(parsedQuery.practitionerId, parsedQuery.dateRange),
      this.repository.getAppointmentsByPractitioner(parsedQuery.practitionerId, parsedQuery.dateRange),
      this.repository.getReasonById(parsedQuery.reasonId),
    ]);

    if (!reason) {
      return [];
    }

    const activeRules = rules.filter(
      (rule) => rule.isActive && rule.consultationType === parsedQuery.consultationType && rule.practitionerId === parsedQuery.practitionerId
    );
    const blockedSet = new Set(blockedDates.map((blocked) => blocked.date));
    const bookedSlotSet = new Set(
      appointments
        .filter((appointment) => appointment.status !== "CANCELLED" && appointment.consultationType === parsedQuery.consultationType)
        .map((appointment) => appointment.startsAt)
    );

    const generatedSlots: AvailableSlot[] = [];
    const now = new Date();

    for (const date of eachDate(parsedQuery.dateRange.from, parsedQuery.dateRange.to)) {
      const ymdDate = date.toISOString().slice(0, 10);
      if (blockedSet.has(ymdDate)) {
        continue;
      }

      const weekday = weekdayFromDate(date);
      const dayRules = activeRules.filter((rule) => rule.weekday === weekday);

      for (const rule of dayRules) {
        const daySlots = createSlotsForRule(date, rule, reason.slotDurationMinutes);

        for (const slot of daySlots) {
          if (new Date(slot.startsAt) <= now) {
            continue;
          }

          if (bookedSlotSet.has(slot.startsAt)) {
            continue;
          }

          generatedSlots.push(slot);
        }
      }
    }

    return generatedSlots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }
}

function createSlotsForRule(date: Date, rule: AvailabilityRule, slotDurationMinutes: number): AvailableSlot[] {
  const workStart = withTime(date, rule.startTime);
  const workEnd = withTime(date, rule.endTime);

  let breakStart: Date | null = null;
  let breakEnd: Date | null = null;

  if (rule.breakStart && rule.breakEnd) {
    breakStart = withTime(date, rule.breakStart);
    breakEnd = withTime(date, rule.breakEnd);
  }

  const slots: AvailableSlot[] = [];
  let cursor = workStart;

  while (addMinutes(cursor, slotDurationMinutes) <= workEnd) {
    const next = addMinutes(cursor, slotDurationMinutes);

    const overlapsBreak =
      breakStart && breakEnd ? cursor < breakEnd && next > breakStart : false;

    if (!overlapsBreak) {
      slots.push({
        practitionerId: rule.practitionerId,
        consultationType: rule.consultationType,
        startsAt: cursor.toISOString(),
        endsAt: next.toISOString(),
      });
    }

    cursor = next;
  }

  return slots;
}

function eachDate(from: string, to: string): Date[] {
  const dates: Date[] = [];
  let cursor = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);

  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }

  return dates;
}

function weekdayFromDate(date: Date): AvailabilityRule["weekday"] {
  return ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][date.getUTCDay()] as AvailabilityRule["weekday"];
}

function withTime(baseDate: Date, hhmm: string): Date {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const date = new Date(baseDate);
  date.setUTCHours(hours, minutes, 0, 0);
  return date;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60_000);
}
