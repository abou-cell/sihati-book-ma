import { safeJsonResponse, withErrorHandling } from "@/lib/security/errors";

export const POST = withErrorHandling(async () => safeJsonResponse({ received: true }));
