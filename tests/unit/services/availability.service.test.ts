import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AvailabilityService, type Appointment, type ConsultationReason } from "@/lib/services/availability.service";
import type { AvailabilityDateRange, AvailabilityRule, BlockedDate } from "@/lib/validators/availability";

type AvailabilityRepositoryMock = {
  getRulesByPractitioner(practitionerId: string): Promise<AvailabilityRule[]>;
  getBlockedDatesByPractitioner(practitionerId: string, dateRange: AvailabilityDateRange): Promise<BlockedDate[]>;
  getAppointmentsByPractitioner(practitionerId: string, dateRange: AvailabilityDateRange): Promise<Appointment[]>;
  getReasonById(reasonId: string): Promise<ConsultationReason | null>;
};

function createRepository(overrides: Partial<AvailabilityRepositoryMock> = {}): AvailabilityRepositoryMock {
  return {
    getRulesByPractitioner: vi.fn(async () => [
      {
        id: "rule_monday",
        practitionerId: "prac_1",
        weekday: "MONDAY" as const,
        startTime: "09:00",
        endTime: "11:00",
        breakStart: "10:00",
        breakEnd: "10:30",
        consultationType: "IN_PERSON" as const,
        isActive: true,
      },
    ]),
    getBlockedDatesByPractitioner: vi.fn(async () => []),
    getAppointmentsByPractitioner: vi.fn(async () => []),
    getReasonById: vi.fn(async () => ({ id: "reason_1", slotDurationMinutes: 30 })),
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-01T00:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AvailabilityService", () => {
  it("generates future slots while excluding break overlap", async () => {
    const service = new AvailabilityService(createRepository());

    const slots = await service.getAvailableSlots(
      "prac_1",
      "reason_1",
      { from: "2026-05-04", to: "2026-05-04" },
      "IN_PERSON",
    );

    expect(slots.map((slot) => slot.startsAt)).toEqual([
      "2026-05-04T09:00:00.000Z",
      "2026-05-04T09:30:00.000Z",
      "2026-05-04T10:30:00.000Z",
    ]);
  });

  it("excludes blocked dates and booked non-cancelled appointments", async () => {
    const repository = createRepository({
      getBlockedDatesByPractitioner: vi.fn(async () => [
        { id: "blocked_1", practitionerId: "prac_1", date: "2026-05-11", reason: "Holiday" },
      ]),
      getAppointmentsByPractitioner: vi.fn(async () => [
        {
          id: "apt_1",
          practitionerId: "prac_1",
          startsAt: "2026-05-04T09:30:00.000Z",
          endsAt: "2026-05-04T10:00:00.000Z",
          consultationType: "IN_PERSON" as const,
          status: "CONFIRMED" as const,
        },
        {
          id: "apt_2",
          practitionerId: "prac_1",
          startsAt: "2026-05-04T10:30:00.000Z",
          endsAt: "2026-05-04T11:00:00.000Z",
          consultationType: "IN_PERSON" as const,
          status: "CANCELLED" as const,
        },
      ]),
    });
    const service = new AvailabilityService(repository);

    const slots = await service.getAvailableSlots(
      "prac_1",
      "reason_1",
      { from: "2026-05-04", to: "2026-05-11" },
      "IN_PERSON",
    );

    expect(slots.map((slot) => slot.startsAt)).toEqual([
      "2026-05-04T09:00:00.000Z",
      "2026-05-04T10:30:00.000Z",
    ]);
  });

  it("returns no slots when the consultation reason is unavailable", async () => {
    const service = new AvailabilityService(createRepository({ getReasonById: vi.fn(async () => null) }));

    await expect(
      service.getAvailableSlots("prac_1", "missing_reason", { from: "2026-05-04", to: "2026-05-04" }, "IN_PERSON"),
    ).resolves.toEqual([]);
  });
});
