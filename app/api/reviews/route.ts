import { safeJsonResponse, withErrorHandling } from "@/lib/security/errors";

const demoReviews = [
  { id: "r_1", practitionerId: "p_1", rating: 5, comment: "Excellent doctor" },
];

export const GET = withErrorHandling(async () => safeJsonResponse({ data: demoReviews }));
