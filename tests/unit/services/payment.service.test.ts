import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PaymentRecord, PaymentRepository } from "@/lib/repositories/payment.repository";
import { DuplicateProviderEventError } from "@/lib/repositories/payment.repository";
import { PaymentService } from "@/lib/services/payment.service";

type Repository = PaymentRepository;

const futureAppointment = {
  id: "apt_1",
  patientId: "patient_1",
  practitionerId: "prac_1",
  consultationType: "VIDEO" as const,
  startTime: new Date("2026-05-12T10:00:00.000Z"),
  status: "PENDING" as const,
  reason: { label: "Video consultation", inPersonPrice: 300, videoPrice: 250 },
  practitioner: { name: "Dr. Sara" },
};

const basePayment: PaymentRecord = {
  id: "pay_1",
  provider: "STRIPE",
  providerSessionId: "cs_test_1",
  providerPaymentIntentId: "pi_test_1",
  appointmentId: "apt_1",
  userId: "patient_1",
  amount: 250,
  currency: "mad",
  status: "CHECKOUT_CREATED",
  idempotencyKey: "stripe_checkout:apt_1:patient_1:250:mad",
  rawProviderEventId: null,
};

function createRepository(overrides: Partial<Repository> = {}): Repository {
  return {
    getCheckoutAppointment: vi.fn(async () => futureAppointment),
    findPaymentByIdempotencyKey: vi.fn(async () => null),
    findPaymentByProviderSessionId: vi.fn(async () => basePayment),
    findPaymentByProviderPaymentIntentId: vi.fn(async () => basePayment),
    findPaymentById: vi.fn(async () => basePayment),
    createPayment: vi.fn(async (input) => ({
      providerSessionId: input.providerSessionId ?? null,
      providerPaymentIntentId: input.providerPaymentIntentId ?? null,
      rawProviderEventId: input.rawProviderEventId ?? null,
      ...input,
    })),
    updatePayment: vi.fn(async (paymentId, input) => ({ ...basePayment, id: paymentId, ...input })),
    recordProviderEvent: vi.fn(async () => undefined),
    updatePaymentAndAppointment: vi.fn(async (paymentId, input) => ({ ...basePayment, id: paymentId, ...input })),
    ...overrides,
  };
}

function stripeEvent(type: string, object: Record<string, unknown>) {
  return {
    id: `evt_${type.replaceAll(".", "_")}`,
    type,
    data: { object },
  } as never;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-09T00:00:00.000Z"));
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://sihati.test");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("PaymentService", () => {
  it("rejects checkout creation when Stripe is not configured", async () => {
    const service = new PaymentService(createRepository());

    await expect(service.createCheckoutSession({ appointmentId: "apt_1", userId: "patient_1" })).rejects.toMatchObject({
      code: "STRIPE_NOT_CONFIGURED",
      status: 503,
    });
  });

  it("rejects checkout creation for invalid appointment ownership", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    const service = new PaymentService(createRepository());

    await expect(service.createCheckoutSession({ appointmentId: "apt_1", userId: "patient_2" })).rejects.toMatchObject({
      code: "APPOINTMENT_ACCESS_DENIED",
      status: 403,
    });
  });

  it("creates a Stripe checkout session and stores provider identifiers", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    const repository = createRepository();
    const createCheckoutSession = vi.fn(async () => ({ id: "cs_test_new", url: "https://checkout.stripe.test/session", paymentIntentId: "pi_test_new" }));
    const service = new PaymentService(repository, () => ({ createCheckoutSession }));

    await expect(service.createCheckoutSession({ appointmentId: "apt_1", userId: "patient_1" })).resolves.toMatchObject({
      paymentId: expect.any(String),
      appointmentId: "apt_1",
      provider: "STRIPE",
      sessionId: "cs_test_new",
      checkoutUrl: "https://checkout.stripe.test/session",
      amount: 250,
      currency: "mad",
      status: "CHECKOUT_CREATED",
    });

    expect(repository.createPayment).toHaveBeenCalledWith(expect.objectContaining({
      provider: "STRIPE",
      appointmentId: "apt_1",
      userId: "patient_1",
      amount: 250,
      currency: "mad",
      status: "PENDING",
      idempotencyKey: "stripe_checkout:apt_1:patient_1:250:mad",
    }));
    expect(createCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({
      amount: 250,
      appointmentId: "apt_1",
      userId: "patient_1",
      idempotencyKey: "stripe_checkout:apt_1:patient_1:250:mad",
    }));
    expect(repository.updatePayment).toHaveBeenCalledWith(expect.any(String), {
      providerSessionId: "cs_test_new",
      providerPaymentIntentId: "pi_test_new",
      status: "CHECKOUT_CREATED",
    });
  });

  it("does not process duplicate webhook events twice", async () => {
    const repository = createRepository({
      recordProviderEvent: vi.fn(async () => {
        throw new DuplicateProviderEventError("evt_duplicate");
      }),
    });
    const service = new PaymentService(repository);

    await expect(service.processStripeEvent(stripeEvent("checkout.session.completed", {
      object: "checkout.session",
      id: "cs_test_1",
      payment_intent: "pi_test_1",
      metadata: { paymentId: "pay_1" },
    }))).resolves.toEqual({ processed: true, duplicate: true, paymentId: "pay_1" });

    expect(repository.updatePaymentAndAppointment).not.toHaveBeenCalled();
  });

  it("transitions successful Stripe events to a succeeded payment and confirmed appointment", async () => {
    const repository = createRepository();
    const service = new PaymentService(repository);

    await expect(service.processStripeEvent(stripeEvent("checkout.session.completed", {
      object: "checkout.session",
      id: "cs_test_1",
      payment_intent: "pi_test_1",
      metadata: { paymentId: "pay_1" },
    }))).resolves.toEqual({ processed: true, duplicate: false, paymentId: "pay_1" });

    expect(repository.recordProviderEvent).toHaveBeenCalledWith({
      providerEventId: "evt_checkout_session_completed",
      eventType: "checkout.session.completed",
      paymentId: "pay_1",
    });
    expect(repository.updatePaymentAndAppointment).toHaveBeenCalledWith("pay_1", {
      status: "SUCCEEDED",
      providerSessionId: "cs_test_1",
      providerPaymentIntentId: "pi_test_1",
      rawProviderEventId: "evt_checkout_session_completed",
    });
  });

  it("transitions failed Stripe payment intents to a failed payment without trusting client state", async () => {
    const repository = createRepository();
    const service = new PaymentService(repository);

    await expect(service.processStripeEvent(stripeEvent("payment_intent.payment_failed", {
      object: "payment_intent",
      id: "pi_test_1",
      metadata: { paymentId: "pay_1" },
    }))).resolves.toEqual({ processed: true, duplicate: false, paymentId: "pay_1" });

    expect(repository.updatePaymentAndAppointment).toHaveBeenCalledWith("pay_1", {
      status: "FAILED",
      providerSessionId: "cs_test_1",
      providerPaymentIntentId: "pi_test_1",
      rawProviderEventId: "evt_payment_intent_payment_failed",
    });
  });
});
