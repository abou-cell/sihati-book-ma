import Stripe from "stripe";

import { PrismaPaymentRepository } from "@/lib/repositories/payment.repository";
import { AppError, safeJsonResponse, withErrorHandling } from "@/lib/security/errors";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rate-limit";
import { PaymentService } from "@/lib/services/payment.service";

export const runtime = "nodejs";

const service = new PaymentService(new PrismaPaymentRepository());

function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new AppError("STRIPE_WEBHOOK_DISABLED", 503, "Stripe webhook handling is not configured.");
  }
  return secret;
}

export const POST = withErrorHandling(async (request: Request) => {
  await enforceRateLimit({ scope: "stripe-webhook", request, ...rateLimitPolicies.providerWebhook });

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    throw new AppError("STRIPE_SIGNATURE_REQUIRED", 400, "Stripe signature header is required.");
  }

  const rawBody = await request.text();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY?.trim() || "sk_test_webhook_verification_only");
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, getWebhookSecret());
  } catch {
    throw new AppError("STRIPE_SIGNATURE_INVALID", 400, "Stripe signature verification failed.");
  }

  const result = await service.processStripeEvent(event);
  return safeJsonResponse(result);
});
