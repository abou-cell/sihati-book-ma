import { prisma } from "@/lib/db/prisma";

export type PaymentStatus = "CHECKOUT_CREATED" | "PENDING" | "SUCCEEDED" | "FAILED" | "EXPIRED";

export type CheckoutAppointment = {
  id: string;
  patientId: string;
  practitionerId: string;
  consultationType: "IN_PERSON" | "VIDEO";
  startTime: Date;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  reason: {
    label: string;
    inPersonPrice: number;
    videoPrice: number | null;
  };
  practitioner: {
    name: string;
  };
};

export type PaymentRecord = {
  id: string;
  provider: "STRIPE";
  providerSessionId: string | null;
  providerPaymentIntentId: string | null;
  appointmentId: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  idempotencyKey: string;
  rawProviderEventId: string | null;
};

type PaymentCreateInput = Omit<PaymentRecord, "providerSessionId" | "providerPaymentIntentId" | "rawProviderEventId"> & {
  providerSessionId?: string | null;
  providerPaymentIntentId?: string | null;
  rawProviderEventId?: string | null;
};

type PaymentTransactionClient = {
  payment: { update(input: { where: { id: string }; data: PaymentUpdateInput }): Promise<PaymentRecord> };
  appointment: { updateMany(input: { where: { id: string; patientId: string; status: "PENDING" }; data: { status: "CONFIRMED" } }): Promise<unknown> };
};

type ProviderEventInput = {
  providerEventId: string;
  eventType: string;
  paymentId?: string | null;
};

type PaymentUpdateInput = {
  providerSessionId?: string | null;
  providerPaymentIntentId?: string | null;
  status?: PaymentStatus;
  rawProviderEventId?: string | null;
};

export class DuplicateProviderEventError extends Error {
  constructor(public readonly providerEventId: string) {
    super(`Provider event ${providerEventId} was already processed`);
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}

function normalizePayment(payment: PaymentRecord): PaymentRecord {
  return payment;
}

export interface PaymentRepository {
  getCheckoutAppointment(appointmentId: string): Promise<CheckoutAppointment | null>;
  findPaymentByIdempotencyKey(idempotencyKey: string): Promise<PaymentRecord | null>;
  findPaymentByProviderSessionId(providerSessionId: string): Promise<PaymentRecord | null>;
  findPaymentByProviderPaymentIntentId(providerPaymentIntentId: string): Promise<PaymentRecord | null>;
  findPaymentById(id: string): Promise<PaymentRecord | null>;
  createPayment(input: PaymentCreateInput): Promise<PaymentRecord>;
  updatePayment(paymentId: string, input: PaymentUpdateInput): Promise<PaymentRecord>;
  recordProviderEvent(input: ProviderEventInput): Promise<void>;
  updatePaymentAndAppointment(paymentId: string, input: PaymentUpdateInput): Promise<PaymentRecord>;
}

export class PrismaPaymentRepository implements PaymentRepository {
  async getCheckoutAppointment(appointmentId: string): Promise<CheckoutAppointment | null> {
    return prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        patientId: true,
        practitionerId: true,
        consultationType: true,
        startTime: true,
        status: true,
        reason: { select: { label: true, inPersonPrice: true, videoPrice: true } },
        practitioner: { select: { name: true } },
      },
    }) as Promise<CheckoutAppointment | null>;
  }

  async findPaymentByIdempotencyKey(idempotencyKey: string): Promise<PaymentRecord | null> {
    const payment = await prisma.payment.findUnique({ where: { idempotencyKey } });
    return payment ? normalizePayment(payment as PaymentRecord) : null;
  }

  async findPaymentByProviderSessionId(providerSessionId: string): Promise<PaymentRecord | null> {
    const payment = await prisma.payment.findUnique({ where: { providerSessionId } });
    return payment ? normalizePayment(payment as PaymentRecord) : null;
  }

  async findPaymentByProviderPaymentIntentId(providerPaymentIntentId: string): Promise<PaymentRecord | null> {
    const payment = await prisma.payment.findUnique({ where: { providerPaymentIntentId } });
    return payment ? normalizePayment(payment as PaymentRecord) : null;
  }

  async findPaymentById(id: string): Promise<PaymentRecord | null> {
    const payment = await prisma.payment.findUnique({ where: { id } });
    return payment ? normalizePayment(payment as PaymentRecord) : null;
  }

  async createPayment(input: PaymentCreateInput): Promise<PaymentRecord> {
    const payment = await prisma.payment.create({
      data: {
        ...input,
        providerSessionId: input.providerSessionId ?? null,
        providerPaymentIntentId: input.providerPaymentIntentId ?? null,
        rawProviderEventId: input.rawProviderEventId ?? null,
      },
    });
    return normalizePayment(payment as PaymentRecord);
  }

  async updatePayment(paymentId: string, input: PaymentUpdateInput): Promise<PaymentRecord> {
    const payment = await prisma.payment.update({ where: { id: paymentId }, data: input });
    return normalizePayment(payment as PaymentRecord);
  }

  async recordProviderEvent(input: ProviderEventInput): Promise<void> {
    try {
      await prisma.paymentWebhookEvent.create({
        data: {
          provider: "STRIPE",
          providerEventId: input.providerEventId,
          eventType: input.eventType,
          paymentId: input.paymentId ?? null,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new DuplicateProviderEventError(input.providerEventId);
      throw error;
    }
  }

  async updatePaymentAndAppointment(paymentId: string, input: PaymentUpdateInput): Promise<PaymentRecord> {
    return prisma.$transaction(async (tx: PaymentTransactionClient) => {
      const payment = await tx.payment.update({ where: { id: paymentId }, data: input });

      if (input.status === "SUCCEEDED") {
        await tx.appointment.updateMany({
          where: { id: payment.appointmentId, patientId: payment.userId, status: "PENDING" },
          data: { status: "CONFIRMED" },
        });
      }

      return normalizePayment(payment as PaymentRecord);
    });
  }
}
