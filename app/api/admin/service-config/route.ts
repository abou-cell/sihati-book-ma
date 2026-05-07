import { appConfigService } from "@/lib/services/app-config.service";
import { requireCurrentUserForApi } from "@/lib/auth/current-user";
import { assertSameOrigin } from "@/lib/security/access-control";
import { safeJsonResponse, withErrorHandling } from "@/lib/security/errors";
import { toggleServiceConfigSchema, upsertServiceConfigSchema } from "@/lib/validators/service-config";

function logAdminConfigRequest(event: string, payload: { actorUserId: string; provider?: unknown }) {
  console.info(
    JSON.stringify({
      level: "info",
      event,
      actorUserId: payload.actorUserId,
      provider: typeof payload.provider === "string" ? payload.provider : undefined,
      timestamp: new Date().toISOString(),
    }),
  );
}

export const GET = withErrorHandling(async (request: Request) => {
  requireCurrentUserForApi(request, ["ADMIN"]);

  const configs = await appConfigService.listServiceConfigurations();
  return safeJsonResponse({ configs, providers: appConfigService.getSupportedProviders() });
});

export const POST = withErrorHandling(async (request: Request) => {
  assertSameOrigin(request);
  const currentUser = requireCurrentUserForApi(request, ["ADMIN"]);
  const body = await request.json();
  logAdminConfigRequest("service_config.upsert.request", { actorUserId: currentUser.userId, provider: body?.provider });
  const payload = upsertServiceConfigSchema.parse(body);

  const config = await appConfigService.upsertServiceConfiguration(payload, currentUser.userId);
  return safeJsonResponse({ config }, 201);
});

export const PATCH = withErrorHandling(async (request: Request) => {
  assertSameOrigin(request);
  const currentUser = requireCurrentUserForApi(request, ["ADMIN"]);
  const body = await request.json();
  logAdminConfigRequest("service_config.toggle.request", { actorUserId: currentUser.userId, provider: body?.provider });
  const payload = toggleServiceConfigSchema.parse(body);

  const config = await appConfigService.toggleServiceConfiguration(payload, currentUser.userId);
  return safeJsonResponse({ config });
});
