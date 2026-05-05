import { searchPractitioners } from '@/lib/services/practitioner-search.service';
import { safeJsonResponse, withErrorHandling } from '@/lib/security/errors';
import { practitionerSearchQuerySchema } from '@/lib/validators/practitioner-search';

export const GET = withErrorHandling(async (request: Request) => {
  const rawParams = Object.fromEntries(new URL(request.url).searchParams.entries());
  const query = practitionerSearchQuerySchema.parse(rawParams);
  const result = await searchPractitioners(query);

  return safeJsonResponse(result, 200);
});
