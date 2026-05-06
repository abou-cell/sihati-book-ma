import { afterEach, describe, expect, it, vi } from "vitest";

import { getCurrentUserFromRequest, requireRolesForApi } from "@/lib/auth/current-user";
import { hasAnyRole, isUserRole } from "@/lib/auth/permissions";
import { demoSessionHeaderNames, readDemoSessionFromRequest } from "@/lib/auth/session";
import { AppError } from "@/lib/security/errors";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("role helpers", () => {
  it("recognizes only supported roles", () => {
    expect(isUserRole("PATIENT")).toBe(true);
    expect(isUserRole("PRACTITIONER")).toBe(true);
    expect(isUserRole("ADMIN")).toBe(true);
    expect(isUserRole("CLINIC_ADMIN")).toBe(false);
    expect(isUserRole(null)).toBe(false);
  });

  it("checks allow-listed roles", () => {
    expect(hasAnyRole("PATIENT", ["PATIENT", "ADMIN"])).toBe(true);
    expect(hasAnyRole("PRACTITIONER", ["PATIENT", "ADMIN"])).toBe(false);
  });
});

describe("demo session helpers", () => {
  it("reads demo identity from local-development request headers", () => {
    vi.stubEnv("NODE_ENV", "test");

    const request = new Request("https://sihati.test/api", {
      headers: {
        [demoSessionHeaderNames.userId]: "user_1",
        [demoSessionHeaderNames.role]: "PATIENT",
      },
    });

    expect(readDemoSessionFromRequest(request)).toEqual({ userId: "user_1", role: "PATIENT" });
  });

  it("rejects demo headers in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    const request = new Request("https://sihati.test/api", {
      headers: {
        [demoSessionHeaderNames.userId]: "user_1",
        [demoSessionHeaderNames.role]: "PATIENT",
      },
    });

    expect(readDemoSessionFromRequest(request)).toBeNull();
  });

  it("throws a safe unauthenticated AppError when a request has no session", () => {
    expect(() => getCurrentUserFromRequest(new Request("https://sihati.test/api"))).toThrow(AppError);
  });

  it("throws access denied for disallowed API roles", () => {
    expect(() => requireRolesForApi("PATIENT", ["ADMIN"])).toThrow(AppError);
    expect(() => requireRolesForApi("ADMIN", ["ADMIN"])).not.toThrow();
  });
});
