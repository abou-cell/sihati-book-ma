import { assertSameOrigin, requireUserContext } from "@/lib/security/access-control";
import { AppError, withErrorHandling } from "@/lib/security/errors";

export const POST = withErrorHandling(async (request: Request) => {
  assertSameOrigin(request);
  requireUserContext(request, ["PATIENT"]);

  throw new AppError(
    "PAYMENTS_NOT_IMPLEMENTED",
    501,
    "Stripe checkout is intentionally disabled until a verified payment integration is implemented.",
  );
});
