import { assertCanAccessMedicalDocument, requireUserContext } from "@/lib/security/access-control";
import { AppError, withErrorHandling } from "@/lib/security/errors";

export const GET = withErrorHandling(async (request: Request) => {
  const currentUser = requireUserContext(request, ["PATIENT", "PRACTITIONER", "ADMIN"]);
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
