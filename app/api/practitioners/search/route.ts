import { MockPractitionerSearchRepository } from "@/lib/repositories/mock/practitioner-search.repository";
import { PrismaPractitionerSearchRepository } from "@/lib/repositories/practitioner.repository";
import { AppError, safeJsonResponse, withErrorHandling } from "@/lib/security/errors";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/security/rate-limit";
import { PractitionerSearchService } from "@/lib/services/practitioner-search.service";
import { practitionerSearchQuerySchema } from "@/lib/validators/practitioner-search";

function createSearchService(): PractitionerSearchService {
  if (process.env.DATABASE_URL) {
    return new PractitionerSearchService(new PrismaPractitionerSearchRepository());
  }

  if (process.env.NODE_ENV === "production") {
    throw new AppError(
      "DATABASE_NOT_CONFIGURED",
      503,
      "Practitioner search requires DATABASE_URL in production.",
    );
  }

  return new PractitionerSearchService(new MockPractitionerSearchRepository());
}

export const GET = withErrorHandling(async (request: Request) => {
  await enforceRateLimit({ scope: "practitioner-search", request, ...rateLimitPolicies.publicSearch });

  const rawParams = Object.fromEntries(new URL(request.url).searchParams.entries());
  const query = practitionerSearchQuerySchema.parse(rawParams);
  const result = await createSearchService().search(query);

  return safeJsonResponse(result, 200);
});
