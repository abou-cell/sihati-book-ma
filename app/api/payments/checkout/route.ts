import { safeJsonResponse, withErrorHandling } from "@/lib/security/errors";

export const POST = withErrorHandling(async () =>
  safeJsonResponse({
    status: "pending",
    provider: "stripe",
    message: "Checkout session creation endpoint is ready for Stripe SDK wiring.",
  }),
);
