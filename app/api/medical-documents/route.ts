import { safeJsonResponse, withErrorHandling } from "@/lib/security/errors";

export const GET = withErrorHandling(async () =>
  safeJsonResponse({
    data: [
      { id: "doc_1", appointmentId: "a_1", kind: "PRESCRIPTION", uploadedAt: new Date().toISOString() },
    ],
  }),
);
