import { describe, expect, it } from "vitest";

import { availabilityRuleSchema } from "@/lib/validators/availability";
import { createAppointmentSchema } from "@/lib/validators/appointment";
import { availableSlotsQuerySchema } from "@/lib/validators/available-slots";
import { practitionerSearchQuerySchema } from "@/lib/validators/practitioner-search";

describe("availability validators", () => {
  const baseRule = {
    id: "rule_1",
    practitionerId: "prac_1",
    weekday: "MONDAY",
    startTime: "09:00",
    endTime: "17:00",
    consultationType: "IN_PERSON",
  };

  it("accepts a valid availability rule", () => {
    expect(availabilityRuleSchema.parse(baseRule)).toMatchObject({ isActive: true });
  });

  it("rejects reversed working hours and incomplete breaks", () => {
    const result = availabilityRuleSchema.safeParse({
      ...baseRule,
      startTime: "17:00",
      endTime: "09:00",
      breakStart: "12:00",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.endTime).toContain("End time must be after start time");
    expect(result.error?.flatten().fieldErrors.breakStart).toContain("Both break start and break end must be provided together");
  });

  it("rejects break windows outside working hours", () => {
    const result = availabilityRuleSchema.safeParse({
      ...baseRule,
      breakStart: "08:30",
      breakEnd: "09:30",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.breakStart).toContain("Break must be strictly inside working hours");
  });
});

describe("appointment validator", () => {
  it("requires an ISO datetime with an offset", () => {
    expect(() =>
      createAppointmentSchema.parse({
        practitionerId: "prac_1",
        reasonId: "reason_1",
        consultationType: "VIDEO",
        startTime: "2026-05-06T10:00:00.000Z",
      }),
    ).not.toThrow();

    expect(
      createAppointmentSchema.safeParse({
        practitionerId: "prac_1",
        reasonId: "reason_1",
        consultationType: "VIDEO",
        startTime: "2026-05-06 10:00",
      }).success,
    ).toBe(false);
  });
});

describe("available slots query validator", () => {
  it("coerces optional public flag and accepts a bounded range", () => {
    expect(
      availableSlotsQuerySchema.parse({
        reasonId: "reason_1",
        startDate: "2026-05-01",
        endDate: "2026-05-30",
        consultationType: "IN_PERSON",
        isPublic: "false",
      }),
    ).toMatchObject({ isPublic: false });
  });

  it("rejects reversed and overlong date ranges", () => {
    expect(
      availableSlotsQuerySchema.safeParse({
        reasonId: "reason_1",
        startDate: "2026-05-10",
        endDate: "2026-05-09",
        consultationType: "IN_PERSON",
      }).success,
    ).toBe(false);

    expect(
      availableSlotsQuerySchema.safeParse({
        reasonId: "reason_1",
        startDate: "2026-05-01",
        endDate: "2026-05-31",
        consultationType: "IN_PERSON",
      }).success,
    ).toBe(false);
  });
});

describe("practitioner search query validator", () => {
  it("applies safe pagination defaults and trims text filters", () => {
    expect(practitionerSearchQuerySchema.parse({ q: " cardio ", video: "true" })).toMatchObject({
      q: "cardio",
      video: true,
      page: 1,
      limit: 10,
      sort: "nextAvailable",
    });
  });

  it("rejects invalid price ranges and oversized limits", () => {
    expect(practitionerSearchQuerySchema.safeParse({ minPrice: "500", maxPrice: "100" }).success).toBe(false);
    expect(practitionerSearchQuerySchema.safeParse({ limit: "51" }).success).toBe(false);
  });
});
