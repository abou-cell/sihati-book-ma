import { AppError, withErrorHandling } from "@/lib/security/errors";

export const POST = withErrorHandling(async (request: Request) => {
  const signature = request.headers.get("stripe-signature");

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new AppError(
      "STRIPE_WEBHOOK_DISABLED",
      501,
      "Stripe webhook handling is disabled until STRIPE_WEBHOOK_SECRET and signature verification are configured.",
    );
  }

  if (!signature) {
    throw new AppError("STRIPE_SIGNATURE_REQUIRED", 400, "Stripe signature header is required.");
  }

  throw new AppError(
    "STRIPE_WEBHOOK_NOT_IMPLEMENTED",
    501,
    "Stripe webhook signature verification and event handling are not implemented in this MVP build.",
  );
});
