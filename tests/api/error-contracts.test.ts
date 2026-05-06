import { describe, expect, it, vi } from "vitest";

import { GET as searchPractitioners } from "@/app/api/practitioners/search/route";

describe("API error response contracts", () => {
  it("returns structured validation errors for invalid practitioner search queries", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await searchPractitioners(new Request("https://sihati.test/api/practitioners/search?limit=100"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("x-request-id")).toEqual(expect.any(String));
    expect(body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
    });
    expect(body.error.details.fieldErrors.limit).toEqual(["Too big: expected number to be <=50"]);
  });

  it("returns the shared data envelope for valid practitioner search queries without a production provider", async () => {
    const response = await searchPractitioners(new Request("https://sihati.test/api/practitioners/search?q=sara&limit=1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body.data.data)).toBe(true);
    expect(body.data.pagination).toMatchObject({ page: 1, limit: 1 });
  });
});
