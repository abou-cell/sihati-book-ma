import { assertCanAccessMedicalDocument, requireUserContext } from "@/lib/security/access-control";
import { AppError, withErrorHandling } from "@/lib/security/errors";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rate-limit";

export const GET = withErrorHandling(async (request: Request) => {
  const currentUser = requireUserContext(request, ["PATIENT", "PRACTITIONER", "ADMIN"]);
  await enforceRateLimit({ scope: "medical-documents", request, userId: currentUser.userId, ...rateLimitPolicies.strict });
  const patientId = new URL(request.url).searchParams.get("patientId");

  if (patientId) {
    assertCanAccessMedicalDocument(currentUser, { patientId, practitionerIds: [] });
  }

  throw new AppError(
    "MEDICAL_DOCUMENTS_NOT_IMPLEMENTED",
    501,
    "Medical document storage is not enabled in this MVP build.",
  );
});
