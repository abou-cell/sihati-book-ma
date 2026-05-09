import Stripe from "stripe";

import { AppError } from "@/lib/security/errors";
import type { PaymentRecord, PaymentRepository, PaymentStatus } from "@/lib/repositories/payment.repository";
import { DuplicateProviderEventError } from "@/lib/repositories/payment.repository";
import { env } from "@/lib/env";

const DEFAULT_CURRENCY = "mad";

export type CheckoutSessionResult = {
  paymentId: string;
  appointmentId: string;
  provider: "STRIPE";
  sessionId: string;
  checkoutUrl: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
};

type StripeCheckoutProvider = {
  createCheckoutSession(input: {
    paymentId: string;
    appointmentId: string;
    userId: string;
    amount: number;
    currency: string;
    appointmentLabel: string;
    idempotencyKey: string;
  }): Promise<{ id: string; url: string | null; paymentIntentId: string | null }>;
};

export class StripeApiCheckoutProvider implements StripeCheckoutProvider {
  private readonly stripe: Stripe;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey);
  }

  async createCheckoutSession(input: {
    paymentId: string;
    appointmentId: string;
    userId: string;
    amount: number;
    currency: string;
    appointmentLabel: string;
    idempotencyKey: string;
  }): Promise<{ id: string; url: string | null; paymentIntentId: string | null }> {
    const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: "payment",
        success_url: `${baseUrl}/booking/success/${input.appointmentId}?checkout_session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/dashboard/patient/appointments?payment=cancelled&appointmentId=${encodeURIComponent(input.appointmentId)}`,
        client_reference_id: input.appointmentId,
        metadata: {
          paymentId: input.paymentId,
          appointmentId: input.appointmentId,
          userId: input.userId,
        },
        payment_intent_data: {
          metadata: {
            paymentId: input.paymentId,
            appointmentId: input.appointmentId,
            userId: input.userId,
          },
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: input.currency,
              unit_amount: input.amount,
              product_data: {
                name: input.appointmentLabel,
              },
            },
          },
        ],
      },
      { idempotencyKey: input.idempotencyKey },
    );

    return {
      id: session.id,
      url: session.url,
      paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
    };
  }
}

function getStripeSecretKey(): string {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new AppError("STRIPE_NOT_CONFIGURED", 503, "Stripe checkout is not configured.");
  }
  return secretKey;
}

function getPaymentAmount(appointment: Awaited<ReturnType<PaymentRepository["getCheckoutAppointment"]>>): number {
  if (!appointment) return 0;
  return appointment.consultationType === "VIDEO"
    ? appointment.reason.videoPrice ?? appointment.reason.inPersonPrice
    : appointment.reason.inPersonPrice;
}

function toPaymentStatusFromEvent(eventType: string): PaymentStatus | null {
  if (eventType === "checkout.session.completed" || eventType === "payment_intent.succeeded") return "SUCCEEDED";
  if (eventType === "payment_intent.payment_failed") return "FAILED";
  if (eventType === "checkout.session.expired") return "EXPIRED";
  return null;
}

export class PaymentService {
  constructor(
    private readonly repository: PaymentRepository,
    private readonly checkoutProviderFactory: (secretKey: string) => StripeCheckoutProvider = (secretKey) => new StripeApiCheckoutProvider(secretKey),
  ) {}

  async createCheckoutSession(input: { appointmentId: string; userId: string }): Promise<CheckoutSessionResult> {
    const secretKey = getStripeSecretKey();
    const appointment = await this.repository.getCheckoutAppointment(input.appointmentId);

    if (!appointment) {
      throw new AppError("APPOINTMENT_NOT_FOUND", 404, "Appointment was not found.");
    }

    if (appointment.patientId !== input.userId) {
      throw new AppError("APPOINTMENT_ACCESS_DENIED", 403, "Access denied");
    }

    if (appointment.status !== "PENDING" || appointment.startTime <= new Date()) {
      throw new AppError("APPOINTMENT_NOT_PAYABLE", 409, "Appointment is not eligible for payment.");
    }

    const amount = getPaymentAmount(appointment);
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new AppError("INVALID_PAYMENT_AMOUNT", 409, "Appointment does not have a payable amount.");
    }

    const currency = DEFAULT_CURRENCY;
    const idempotencyKey = `stripe_checkout:${appointment.id}:${input.userId}:${amount}:${currency}`;
    const existingPayment = await this.repository.findPaymentByIdempotencyKey(idempotencyKey);

    const payment = existingPayment ?? await this.repository.createPayment({
      id: crypto.randomUUID(),
      provider: "STRIPE",
      appointmentId: appointment.id,
      userId: input.userId,
      amount,
      currency,
      status: "PENDING",
      idempotencyKey,
    });

    const session = await this.checkoutProviderFactory(secretKey).createCheckoutSession({
      paymentId: payment.id,
      appointmentId: appointment.id,
      userId: input.userId,
      amount,
      currency,
      appointmentLabel: `${appointment.reason.label} with ${appointment.practitioner.name}`,
      idempotencyKey,
    });

    if (!session.url) {
      throw new AppError("STRIPE_CHECKOUT_URL_MISSING", 502, "Stripe did not return a checkout URL.");
    }

    const updated = await this.repository.updatePayment(payment.id, {
      providerSessionId: session.id,
      providerPaymentIntentId: session.paymentIntentId,
      status: "CHECKOUT_CREATED",
    });

    return {
      paymentId: updated.id,
      appointmentId: updated.appointmentId,
      provider: "STRIPE",
      sessionId: session.id,
      checkoutUrl: session.url,
      amount: updated.amount,
      currency: updated.currency,
      status: updated.status,
    };
  }

  async processStripeEvent(event: Stripe.Event): Promise<{ processed: boolean; duplicate: boolean; paymentId: string | null }> {
    const eventType = event.type;
    const nextStatus = toPaymentStatusFromEvent(eventType);

    if (!nextStatus) {
      await this.repository.recordProviderEvent({ providerEventId: event.id, eventType });
      return { processed: false, duplicate: false, paymentId: null };
    }

    const object = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent;
    const payment = await this.findPaymentForStripeObject(object);

    if (!payment) {
      throw new AppError("PAYMENT_NOT_FOUND", 404, "Payment record was not found for Stripe event.");
    }

    try {
      await this.repository.recordProviderEvent({ providerEventId: event.id, eventType, paymentId: payment.id });
    } catch (error) {
      if (error instanceof DuplicateProviderEventError) return { processed: true, duplicate: true, paymentId: payment.id };
      throw error;
    }

    const providerPaymentIntentId = this.extractPaymentIntentId(object) ?? payment.providerPaymentIntentId;
    const providerSessionId = object.object === "checkout.session" ? object.id : payment.providerSessionId;

    await this.repository.updatePaymentAndAppointment(payment.id, {
      status: nextStatus,
      providerSessionId,
      providerPaymentIntentId,
      rawProviderEventId: event.id,
    });

    return { processed: true, duplicate: false, paymentId: payment.id };
  }

  private async findPaymentForStripeObject(object: Stripe.Checkout.Session | Stripe.PaymentIntent): Promise<PaymentRecord | null> {
    const metadataPaymentId = typeof object.metadata?.paymentId === "string" ? object.metadata.paymentId : null;
    if (metadataPaymentId) {
      const payment = await this.repository.findPaymentById(metadataPaymentId);
      if (payment) return payment;
    }

    if (object.object === "checkout.session") {
      const payment = await this.repository.findPaymentByProviderSessionId(object.id);
      if (payment) return payment;
      const paymentIntentId = this.extractPaymentIntentId(object);
      return paymentIntentId ? this.repository.findPaymentByProviderPaymentIntentId(paymentIntentId) : null;
    }

    return this.repository.findPaymentByProviderPaymentIntentId(object.id);
  }

  private extractPaymentIntentId(object: Stripe.Checkout.Session | Stripe.PaymentIntent): string | null {
    if (object.object === "payment_intent") return object.id;
    return typeof object.payment_intent === "string" ? object.payment_intent : object.payment_intent?.id ?? null;
  }
}
