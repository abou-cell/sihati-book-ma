import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/practitioners/[id]/available-slots/route";
import { resetRateLimitForTests } from "@/lib/security/rate-limit";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-01T00:00:00.000Z"));
  vi.stubEnv("DATABASE_URL", "");
  resetRateLimitForTests();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("available slots API", () => {
  it("returns grouped available slots for a valid public request", async () => {
    const response = await GET(
      new Request(
        "https://sihati.test/api/practitioners/p_1/available-slots?reasonId=reason_general&startDate=2026-05-04&endDate=2026-05-04&consultationType=IN_PERSON&isPublic=true",
      ),
      { params: Promise.resolve({ id: "p_1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data[0]).toMatchObject({ date: "2026-05-04" });
    expect(body.data[0].slots[0]).toMatchObject({ consultationType: "IN_PERSON" });
  });

  it("returns validation errors for invalid date ranges", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET(
      new Request(
        "https://sihati.test/api/practitioners/p_1/available-slots?reasonId=reason_general&startDate=2026-05-10&endDate=2026-05-01&consultationType=IN_PERSON",
      ),
      { params: Promise.resolve({ id: "p_1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
