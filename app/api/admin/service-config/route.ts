import { AppConfigService } from "@/lib/services/app-config.service";
import { requireCurrentUserForApi } from "@/lib/auth/current-user";
import { assertSameOrigin } from "@/lib/security/access-control";
import { safeJsonResponse, withErrorHandling } from "@/lib/security/errors";
import { buildRateLimitKey, enforceRateLimit } from "@/lib/security/rate-limit";

const service = new AppConfigService();

export const GET = withErrorHandling(async (request: Request) => {
  const currentUser = requireCurrentUserForApi(request, ["ADMIN"]);
  enforceRateLimit({ key: buildRateLimitKey("admin-service-config-read", request, currentUser.userId), limit: 60, windowMs: 60_000 });

  const configurations = await service.listServiceConfigurations(currentUser.userId);
  return safeJsonResponse({ configurations });
});

export const PUT = withErrorHandling(async (request: Request) => {
  assertSameOrigin(request);
  const currentUser = requireCurrentUserForApi(request, ["ADMIN"]);
  enforceRateLimit({ key: buildRateLimitKey("admin-service-config-write", request, currentUser.userId), limit: 20, windowMs: 60_000 });

  const body = await request.json();
  const configuration = await service.upsertServiceConfiguration(body, currentUser.userId);
  return safeJsonResponse({ configuration });
});
