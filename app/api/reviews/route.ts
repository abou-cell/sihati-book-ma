import { AppError, withErrorHandling } from "@/lib/security/errors";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rate-limit";

export const GET = withErrorHandling(async (request: Request) => {
  await enforceRateLimit({ scope: "reviews", request, ...rateLimitPolicies.publicSearch });
  throw new AppError(
    "REVIEWS_NOT_IMPLEMENTED",
    501,
    "Practitioner reviews are not backed by persisted production data in this MVP build.",
  );
});
