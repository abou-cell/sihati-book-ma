import { getUserContext, requireRole } from "@/lib/security/access-control";
import { AppError, withErrorHandling } from "@/lib/security/errors";

export const GET = withErrorHandling(async (request: Request) => {
  const { role } = getUserContext(request);
  requireRole(role, ["PATIENT", "PRACTITIONER", "ADMIN"]);

  throw new AppError(
    "MEDICAL_DOCUMENTS_NOT_IMPLEMENTED",
    501,
    "Medical document storage is not enabled in this MVP build.",
  );
});
