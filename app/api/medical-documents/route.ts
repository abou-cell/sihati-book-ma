import { z } from "zod";

import { requireUserContext } from "@/lib/security/access-control";
import { safeJsonResponse, withErrorHandling } from "@/lib/security/errors";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rate-limit";
import {
  createMedicalDocumentUpload,
  deleteMedicalDocument,
  getMedicalDocumentDownload,
  listAccessibleMedicalDocuments,
} from "@/lib/services/medical-document.service";

const uploadRequestSchema = z.object({
  patientId: z.string().min(1).optional(),
  practitionerId: z.string().min(1).optional(),
  appointmentId: z.string().min(1).optional(),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  checksum: z.string().min(1),
});

export const GET = withErrorHandling(async (request: Request) => {
  const currentUser = requireUserContext(request, ["PATIENT", "PRACTITIONER", "ADMIN"]);
  await enforceRateLimit({ scope: "medical-documents", request, userId: currentUser.userId, ...rateLimitPolicies.strict });

  const url = new URL(request.url);
  const documentId = url.searchParams.get("documentId");
  const patientId = url.searchParams.get("patientId") ?? undefined;
  const requestId = request.headers.get("x-request-id");

  if (documentId) {
    return safeJsonResponse(
      await getMedicalDocumentDownload(currentUser, documentId, requestId, request.headers.get("x-admin-access-reason")),
    );
  }

  return safeJsonResponse({ documents: await listAccessibleMedicalDocuments(currentUser, patientId) });
});

export const POST = withErrorHandling(async (request: Request) => {
  const currentUser = requireUserContext(request, ["PATIENT", "PRACTITIONER", "ADMIN"]);
  await enforceRateLimit({ scope: "medical-documents-upload", request, userId: currentUser.userId, ...rateLimitPolicies.strict });

  const body = uploadRequestSchema.parse(await request.json());
  return safeJsonResponse(await createMedicalDocumentUpload(currentUser, body, request.headers.get("x-request-id")), 201);
});

export const DELETE = withErrorHandling(async (request: Request) => {
  const currentUser = requireUserContext(request, ["PATIENT", "PRACTITIONER", "ADMIN"]);
  await enforceRateLimit({ scope: "medical-documents-delete", request, userId: currentUser.userId, ...rateLimitPolicies.strict });

  const documentId = new URL(request.url).searchParams.get("documentId");
  if (!documentId) {
    throw new z.ZodError([{ code: "custom", path: ["documentId"], message: "documentId is required", input: undefined }]);
  }

  return safeJsonResponse({ document: await deleteMedicalDocument(currentUser, documentId, request.headers.get("x-request-id")) });
});
