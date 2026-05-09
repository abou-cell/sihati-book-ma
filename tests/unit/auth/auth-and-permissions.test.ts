import { afterEach, describe, expect, it, vi } from "vitest";

import { getCurrentUserFromRequest, requireRolesForApi } from "@/lib/auth/current-user";
import { canAccessAppointment, canAccessMedicalDocument, canAccessVideoConsultation } from "@/lib/security/access-control";
import { hasAnyRole, isUserRole } from "@/lib/auth/permissions";
import {
  buildSignedSessionCookie,
  createSignedSessionToken,
  demoSessionHeaderNames,
  readAuthSessionFromRequest,
  readDemoSessionFromRequest,
  signedSessionCookieName,
} from "@/lib/auth/session";
import { AppError } from "@/lib/security/errors";

const authSecret = "test-auth-secret-with-at-least-32-characters";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
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

    expect(readDemoSessionFromRequest(request)).toEqual({ userId: "user_1", role: "PATIENT", source: "demo-headers" });
  });

  it("rejects demo headers in production before considering them authenticated", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", authSecret);

    const request = new Request("https://sihati.test/api", {
      headers: {
        [demoSessionHeaderNames.userId]: "user_1",
        [demoSessionHeaderNames.role]: "PATIENT",
      },
    });

    expect(readDemoSessionFromRequest(request)).toBeNull();
    expect(() => readAuthSessionFromRequest(request)).toThrow(AppError);
  });

  it("throws a safe unauthenticated AppError when a request has no session", () => {
    expect(() => getCurrentUserFromRequest(new Request("https://sihati.test/api"))).toThrow(AppError);
  });

  it("throws access denied for disallowed API roles", () => {
    expect(() => requireRolesForApi("PATIENT", ["ADMIN"])).toThrow(AppError);
    expect(() => requireRolesForApi("ADMIN", ["ADMIN"])).not.toThrow();
  });
});

describe("signed production sessions", () => {
  it.each(["PATIENT", "PRACTITIONER", "ADMIN"] as const)("authenticates a valid %s session cookie", (role) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", authSecret);

    const cookie = buildSignedSessionCookie({ userId: `${role.toLowerCase()}_1`, role }, { secure: true });
    const request = new Request("https://sihati.test/api", { headers: { cookie } });

    expect(getCurrentUserFromRequest(request)).toEqual({ userId: `${role.toLowerCase()}_1`, role, source: "signed-session-cookie" });
  });

  it("authenticates a valid bearer session for API clients", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", authSecret);

    const token = createSignedSessionToken({ userId: "patient_1", role: "PATIENT" });
    const request = new Request("https://sihati.test/api", { headers: { authorization: `Bearer ${token}` } });

    expect(getCurrentUserFromRequest(request)).toEqual({ userId: "patient_1", role: "PATIENT", source: "signed-session-cookie" });
  });

  it("fails closed in production when AUTH_SECRET is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "");

    const request = new Request("https://sihati.test/api", { headers: { cookie: `${signedSessionCookieName}=v1.payload.signature` } });

    expect(() => getCurrentUserFromRequest(request)).toThrow(AppError);
  });

  it("rejects invalid, tampered, and expired sessions", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", authSecret);

    const invalidRequest = new Request("https://sihati.test/api", { headers: { cookie: `${signedSessionCookieName}=not-a-valid-token` } });
    expect(() => getCurrentUserFromRequest(invalidRequest)).toThrow(AppError);

    const token = createSignedSessionToken({ userId: "patient_1", role: "PATIENT" });
    const tamperedRequest = new Request("https://sihati.test/api", { headers: { authorization: `Bearer ${token.replace(/.$/, "x")}` } });
    expect(() => getCurrentUserFromRequest(tamperedRequest)).toThrow(AppError);

    const expiredToken = createSignedSessionToken({ userId: "patient_1", role: "PATIENT" }, { now: new Date("2026-01-01T00:00:00.000Z"), ttlSeconds: 1 });
    vi.setSystemTime(new Date("2026-01-01T00:00:02.000Z"));
    const expiredRequest = new Request("https://sihati.test/api", { headers: { authorization: `Bearer ${expiredToken}` } });
    expect(() => getCurrentUserFromRequest(expiredRequest)).toThrow(AppError);
  });
});

describe("resource access helpers", () => {
  const appointment = { patientId: "patient_1", practitionerId: "practitioner_1", consultationType: "VIDEO" as const, status: "CONFIRMED" as const };

  it("limits appointment records to owners, assigned practitioners, and admins", () => {
    expect(canAccessAppointment({ userId: "patient_1", role: "PATIENT", source: "demo-headers" }, appointment)).toBe(true);
    expect(canAccessAppointment({ userId: "patient_2", role: "PATIENT", source: "demo-headers" }, appointment)).toBe(false);
    expect(canAccessAppointment({ userId: "practitioner_1", role: "PRACTITIONER", source: "demo-headers" }, appointment)).toBe(true);
    expect(canAccessAppointment({ userId: "admin_1", role: "ADMIN", source: "demo-headers" }, appointment)).toBe(true);
  });

  it("limits video consultations to eligible appointment participants", () => {
    expect(canAccessVideoConsultation({ userId: "patient_1", role: "PATIENT", source: "demo-headers" }, appointment)).toBe(true);
    expect(canAccessVideoConsultation({ userId: "patient_1", role: "PATIENT", source: "demo-headers" }, { ...appointment, status: "CANCELLED" })).toBe(false);
    expect(canAccessVideoConsultation({ userId: "patient_1", role: "PATIENT", source: "demo-headers" }, { ...appointment, consultationType: "IN_PERSON" })).toBe(false);
  });

  it("limits medical documents to owners, assigned practitioners, and admins", () => {
    const document = { patientId: "patient_1", practitionerIds: ["practitioner_1"] };
    expect(canAccessMedicalDocument({ userId: "patient_1", role: "PATIENT", source: "signed-session-cookie" }, document)).toBe(true);
    expect(canAccessMedicalDocument({ userId: "patient_2", role: "PATIENT", source: "signed-session-cookie" }, document)).toBe(false);
    expect(canAccessMedicalDocument({ userId: "practitioner_1", role: "PRACTITIONER", source: "signed-session-cookie" }, document)).toBe(true);
    expect(canAccessMedicalDocument({ userId: "admin_1", role: "ADMIN", source: "signed-session-cookie" }, document)).toBe(true);
  });
});
