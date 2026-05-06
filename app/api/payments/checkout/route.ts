import { getUserContext, requireRole } from "@/lib/security/access-control";
import { AppError, withErrorHandling } from "@/lib/security/errors";

export const POST = withErrorHandling(async (request: Request) => {
  const { role } = getUserContext(request);
  requireRole(role, ["PATIENT"]);

  throw new AppError(
    "PAYMENTS_NOT_IMPLEMENTED",
    501,
    "Stripe checkout is intentionally disabled until a verified payment integration is implemented.",
  );
});
