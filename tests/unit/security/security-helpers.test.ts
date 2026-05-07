import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { assertSameOrigin } from "@/lib/security/access-control";
import { AppError } from "@/lib/security/errors";
import { buildRateLimitKey, enforceRateLimit, resetRateLimitForTests } from "@/lib/security/rate-limit";
import { validateUploadMeta } from "@/lib/security/upload";

afterEach(() => {
  vi.useRealTimers();
});

describe("same-origin guard", () => {
  it("allows missing origin headers and rejects cross-site browser requests", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");

    expect(() => assertSameOrigin(new Request("http://localhost:3000/api/appointments"))).not.toThrow();
    expect(() =>
      assertSameOrigin(new Request("http://localhost:3000/api/appointments", { headers: { origin: "https://evil.test" } })),
    ).toThrow(AppError);
  });
});

describe("upload validation helper", () => {
  it("accepts supported document uploads and blocks dangerous files", () => {
    expect(validateUploadMeta({ fileName: "report.pdf", mimeType: "application/pdf", sizeBytes: 1024 })).toMatchObject({
      fileName: "report.pdf",
    });

    expect(() => validateUploadMeta({ fileName: "malware.exe", mimeType: "application/pdf", sizeBytes: 1024 })).toThrow(AppError);
    expect(() => validateUploadMeta({ fileName: "report.svg", mimeType: "image/svg+xml", sizeBytes: 1024 })).toThrow(AppError);
    expect(() => validateUploadMeta({ fileName: "large.pdf", mimeType: "application/pdf", sizeBytes: 6 * 1024 * 1024 })).toThrow(AppError);
  });
});

describe("rate-limit helper", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T00:00:00.000Z"));
    resetRateLimitForTests();
  });

  it("keys requests by scope, user, and forwarded client IP", () => {
    const request = new Request("https://sihati.test/api", { headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" } });
    expect(buildRateLimitKey("booking", request, "patient_1")).toBe("booking:patient_1:203.0.113.10");
  });

  it("throws a safe 429 error after the configured limit", () => {
    enforceRateLimit({ key: "test:patient_1", limit: 2, windowMs: 60_000 });
    enforceRateLimit({ key: "test:patient_1", limit: 2, windowMs: 60_000 });

    expect(() => enforceRateLimit({ key: "test:patient_1", limit: 2, windowMs: 60_000 })).toThrow(AppError);
  });
});
