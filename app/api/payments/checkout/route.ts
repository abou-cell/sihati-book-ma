import { assertSameOrigin, requireUserContext } from "@/lib/security/access-control";
import { AppError, withErrorHandling } from "@/lib/security/errors";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rate-limit";

export const POST = withErrorHandling(async (request: Request) => {
  assertSameOrigin(request);
  const currentUser = requireUserContext(request, ["PATIENT"]);
  await enforceRateLimit({ scope: "payment-checkout", request, userId: currentUser.userId, ...rateLimitPolicies.providerCheckout });

  throw new AppError(
    "PAYMENTS_NOT_IMPLEMENTED",
    501,
    "Stripe checkout is intentionally disabled until a verified payment integration is implemented.",
  );
});
