import { NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildRateLimitKey, enforceRateLimit, resetRateLimitForTests } from "@/lib/security/rate-limit";
import { withErrorHandling } from "@/lib/security/errors";

afterEach(() => {
  resetRateLimitForTests();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("shared rate limiting", () => {
  it("allows requests within the configured local in-memory limit", async () => {
    const request = new Request("https://sihati.test/api/test", { headers: { "x-forwarded-for": "203.0.113.10" } });

    await expect(enforceRateLimit({ scope: "unit-allowed", request, userId: "patient_1", limit: 2, windowMs: 60_000 })).resolves.toBeUndefined();
    await expect(enforceRateLimit({ scope: "unit-allowed", request, userId: "patient_1", limit: 2, windowMs: 60_000 })).resolves.toBeUndefined();
  });

  it("returns a safe 429 JSON response after exceeding a limit", async () => {
    const handler = withErrorHandling(async (request: Request) => {
      await enforceRateLimit({ scope: "unit-exceeded", request, userId: "patient_1", limit: 1, windowMs: 60_000 });
      return NextResponse.json({ data: { ok: true } });
    });
    const request = new Request("https://sihati.test/api/test", { headers: { "x-real-ip": "203.0.113.11" } });

    expect((await handler(request)).status).toBe(200);

    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await handler(request);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toEqual({ error: { code: "RATE_LIMITED", message: "Too many requests. Please retry later." } });
  });

  it("fails fast in production when shared Redis/Upstash rate limiting is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RATE_LIMIT_REDIS_REST_URL", "");
    vi.stubEnv("RATE_LIMIT_REDIS_REST_TOKEN", "");
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const handler = withErrorHandling(async (request: Request) => {
      await enforceRateLimit({ scope: "unit-prod-missing", request, limit: 1, windowMs: 60_000 });
      return NextResponse.json({ data: { ok: true } });
    });

    const response = await handler(new Request("https://sihati.test/api/test"));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: { code: "RATE_LIMIT_NOT_CONFIGURED", message: "Shared rate limiting is required in production but is not configured." } });
  });

  it("uses the configured Redis/Upstash REST adapter in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RATE_LIMIT_REDIS_REST_URL", "https://redis.example.com");
    vi.stubEnv("RATE_LIMIT_REDIS_REST_TOKEN", "redis-token");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([{ result: 1 }, { result: 1 }, { result: 60 }]), { status: 200 }),
    );

    await enforceRateLimit({ scope: "unit-redis", request: new Request("https://sihati.test/api/test"), limit: 2, windowMs: 60_000 });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://redis.example.com/pipeline",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer redis-token" }),
      }),
    );
  });

  it("builds keys from both IP address and authenticated user ID without storing raw identifiers", () => {
    const request = new Request("https://sihati.test/api/test", { headers: { "x-forwarded-for": "198.51.100.20, 10.0.0.1" } });

    const anonymousKey = buildRateLimitKey("scope", request);
    const userKey = buildRateLimitKey("scope", request, "patient_1");

    expect(userKey).not.toBe(anonymousKey);
    expect(userKey).not.toContain("patient_1");
    expect(userKey).not.toContain("198.51.100.20");
    expect(userKey).toMatch(/^rate-limit:scope:user:[a-f0-9]{32}:ip:[a-f0-9]{32}$/);
  });
});
