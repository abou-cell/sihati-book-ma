import { MockPractitionerSearchRepository } from "@/lib/repositories/mock/practitioner-search.repository";
import { PrismaPractitionerSearchRepository } from "@/lib/repositories/practitioner.repository";
import { safeJsonResponse, withErrorHandling } from "@/lib/security/errors";
import { PractitionerSearchService } from "@/lib/services/practitioner-search.service";
import { practitionerSearchQuerySchema } from "@/lib/validators/practitioner-search";

const repository = process.env.DATABASE_URL
  ? new PrismaPractitionerSearchRepository()
  : new MockPractitionerSearchRepository();

const service = new PractitionerSearchService(repository);

export const GET = withErrorHandling(async (request: Request) => {
  const rawParams = Object.fromEntries(new URL(request.url).searchParams.entries());
  const query = practitionerSearchQuerySchema.parse(rawParams);
  const result = await service.search(query);

  return safeJsonResponse(result, 200);
});
