import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { demoSessionHeaderNames } from "@/lib/auth/session";

const appConfigServiceMock = {
  listServiceConfigurations: vi.fn(async () => [{ provider: "STRIPE", isEnabled: false }]),
  getSupportedProviders: vi.fn(() => ["STRIPE", "SMTP"]),
  upsertServiceConfiguration: vi.fn(async (input, actorUserId) => ({ id: "cfg_1", ...input, updatedByUserId: actorUserId })),
  toggleServiceConfiguration: vi.fn(async (input, actorUserId) => ({ id: "cfg_1", ...input, updatedByUserId: actorUserId })),
};

vi.mock("@/lib/services/app-config.service", () => ({ appConfigService: appConfigServiceMock }));

const { GET, PATCH, POST } = await import("@/app/api/admin/service-config/route");

function trustedAppOrigin() {
  return new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").origin;
}

function adminRequest(method = "GET", body?: unknown) {
  const origin = trustedAppOrigin();

  return new Request(`${origin}/api/admin/service-config`, {
    method,
    headers: {
      [demoSessionHeaderNames.userId]: "admin_1",
      [demoSessionHeaderNames.role]: "ADMIN",
      origin,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  vi.stubEnv("RATE_LIMIT_REDIS_REST_URL", "");
  vi.stubEnv("RATE_LIMIT_REDIS_REST_TOKEN", "");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("admin service configuration API", () => {
  it("requires an admin session", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET(new Request("http://localhost:3000/api/admin/service-config"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns supported providers and safe config summaries", async () => {
    const response = await GET(adminRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.providers).toEqual(["STRIPE", "SMTP"]);
    expect(body.data.configs).toEqual([{ provider: "STRIPE", isEnabled: false }]);
  });

  it("validates POST payloads and passes the admin actor to the service", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const response = await POST(
      adminRequest("POST", {
        provider: "STRIPE",
        displayName: "Stripe",
        isEnabled: false,
        metadata: { mode: "test" },
        secrets: { secretKey: "sk_test_123456" },
      }),
    );

    expect(response.status).toBe(201);
    expect(appConfigServiceMock.upsertServiceConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "STRIPE", metadata: { mode: "test" } }),
      "admin_1",
    );
  });

  it("rejects cross-origin mutations before updating config", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await PATCH(
      new Request("http://localhost:3000/api/admin/service-config", {
        method: "PATCH",
        headers: {
          [demoSessionHeaderNames.userId]: "admin_1",
          [demoSessionHeaderNames.role]: "ADMIN",
          origin: "https://evil.test",
          "content-type": "application/json",
        },
        body: JSON.stringify({ provider: "STRIPE", isEnabled: true }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "INVALID_ORIGIN" } });
  });
});
