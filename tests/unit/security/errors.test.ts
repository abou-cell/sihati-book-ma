import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { AppError, safeJsonResponse, withErrorHandling } from "@/lib/security/errors";

describe("security error helpers", () => {
  it("wraps successful responses in the shared data envelope and request id header", async () => {
    const handler = withErrorHandling(async () => safeJsonResponse({ ok: true }, 202));
    const response = await handler(new Request("https://sihati.test/api/example", { headers: { "x-request-id": "req_1" } }));

    await expect(response.json()).resolves.toEqual({ data: { ok: true } });
    expect(response.status).toBe(202);
    expect(response.headers.get("x-request-id")).toBe("req_1");
  });

  it("returns the API error contract for application errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const handler = withErrorHandling(async () => {
      throw new AppError("ACCESS_DENIED", 403, "Access denied");
    });

    const response = await handler(new Request("https://sihati.test/api/example", { method: "POST" }));

    await expect(response.json()).resolves.toEqual({ error: { code: "ACCESS_DENIED", message: "Access denied" } });
    expect(response.status).toBe(403);
    expect(response.headers.get("x-request-id")).toEqual(expect.any(String));
  });

  it("returns flattened validation details for Zod errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const handler = withErrorHandling(async () => {
      z.object({ id: z.string().min(1) }).parse({ id: "" });
      return safeJsonResponse({ unreachable: true });
    });

    const response = await handler(new Request("https://sihati.test/api/example"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details.fieldErrors.id).toEqual(["Too small: expected string to have >=1 characters"]);
  });

  it("hides unexpected error details from HTTP responses", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const handler = withErrorHandling(async () => {
      throw new Error("database password leaked in internal message");
    });

    const response = await handler(new Request("https://sihati.test/api/example"));

    await expect(response.json()).resolves.toEqual({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Unexpected server error" },
    });
    expect(response.status).toBe(500);
  });
});
