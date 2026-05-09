import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/medical-document.service", () => ({
  listAccessibleMedicalDocuments: vi.fn(async (currentUser: { role: string; userId: string }, patientId?: string) => {
    if (currentUser.role === "PATIENT" && patientId && patientId !== currentUser.userId) {
      const { AppError } = await import("@/lib/security/errors");
      throw new AppError("MEDICAL_DOCUMENT_ACCESS_DENIED", 403, "Access denied");
    }
    return [];
  }),
  createMedicalDocumentUpload: vi.fn(),
  deleteMedicalDocument: vi.fn(),
  getMedicalDocumentDownload: vi.fn(),
}));

import { GET as getMedicalDocuments } from "@/app/api/medical-documents/route";
import { POST as postCheckout } from "@/app/api/payments/checkout/route";
import { createSignedSessionToken } from "@/lib/auth/session";

const authSecret = "test-auth-secret-with-at-least-32-characters";

function bearerHeaders(userId: string, role: "PATIENT" | "PRACTITIONER" | "ADMIN") {
  return { authorization: `Bearer ${createSignedSessionToken({ userId, role })}` };
}

beforeEach(() => {
  vi.stubEnv("RATE_LIMIT_REDIS_REST_URL", "https://redis.example.com");
  vi.stubEnv("RATE_LIMIT_REDIS_REST_TOKEN", "redis-token");
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify([{ result: 1 }, { result: 1 }, { result: 60 }]), { status: 200 }),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("protected API authentication", () => {
  it("returns 401 for an unauthenticated request", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", authSecret);

    const response = await getMedicalDocuments(new Request("https://sihati.test/api/medical-documents"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 401 for an invalid signed session", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", authSecret);

    const response = await getMedicalDocuments(new Request("https://sihati.test/api/medical-documents", { headers: { authorization: "Bearer invalid" } }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("INVALID_SESSION");
  });

  it.each([
    ["PATIENT", "patient_1"],
    ["PRACTITIONER", "practitioner_1"],
    ["ADMIN", "admin_1"],
  ] as const)("authenticates a valid %s session before route business logic", async (role, userId) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", authSecret);

    const response = await getMedicalDocuments(new Request("https://sihati.test/api/medical-documents", { headers: bearerHeaders(userId, role) }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.documents).toEqual([]);
  });

  it("returns 403 when a valid role is not allowed for a route", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", authSecret);

    const response = await postCheckout(new Request("https://sihati.test/api/payments/checkout", { method: "POST", headers: bearerHeaders("admin_1", "ADMIN") }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("ACCESS_DENIED");
  });

  it("returns 403 for an ownership mismatch", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", authSecret);

    const response = await getMedicalDocuments(
      new Request("https://sihati.test/api/medical-documents?patientId=patient_2", { headers: bearerHeaders("patient_1", "PATIENT") }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("MEDICAL_DOCUMENT_ACCESS_DENIED");
  });

  it("returns 400 for spoofable demo auth headers in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", authSecret);

    const response = await getMedicalDocuments(
      new Request("https://sihati.test/api/medical-documents", { headers: { "x-user-id": "patient_1", "x-user-role": "PATIENT" } }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("DEMO_AUTH_FORBIDDEN");
  });
});
