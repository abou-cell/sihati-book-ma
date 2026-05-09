import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as createCheckout } from "@/app/api/payments/checkout/route";
import { POST as handleStripeWebhook } from "@/app/api/stripe/webhook/route";
import { createSignedSessionToken } from "@/lib/auth/session";
import { resetRateLimitForTests } from "@/lib/security/rate-limit";

const authSecret = "test-auth-secret-with-at-least-32-characters";

function bearerHeaders(userId: string, role: "PATIENT" | "PRACTITIONER" | "ADMIN") {
  return { authorization: `Bearer ${createSignedSessionToken({ userId, role })}` };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-09T00:00:00.000Z"));
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("AUTH_SECRET", authSecret);
  resetRateLimitForTests();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("payments API guards", () => {
  it("returns 401 for unauthorized checkout requests", async () => {
    const response = await createCheckout(new Request("https://sihati.test/api/payments/checkout", {
      method: "POST",
      body: JSON.stringify({ appointmentId: "apt_1" }),
    }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 503 when checkout is requested without Stripe config", async () => {
    const response = await createCheckout(new Request("https://sihati.test/api/payments/checkout", {
      method: "POST",
      headers: bearerHeaders("patient_1", "PATIENT"),
      body: JSON.stringify({ appointmentId: "apt_1" }),
    }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error.code).toBe("STRIPE_NOT_CONFIGURED");
  });

  it("returns 400 for invalid Stripe webhook signatures", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test_secret");

    const response = await handleStripeWebhook(new Request("https://sihati.test/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=invalid" },
      body: JSON.stringify({ id: "evt_invalid", type: "checkout.session.completed" }),
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("STRIPE_SIGNATURE_INVALID");
  });
});
