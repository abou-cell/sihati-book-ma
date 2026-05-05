import type { UserRole } from "@/lib/auth/permissions";
import { getCurrentUserFromRequest, requireRolesForApi } from "@/lib/auth/current-user";

export type { UserRole };

export function getUserContext(request: Request) {
  return getCurrentUserFromRequest(request);
}

export function requireRole(currentRole: UserRole, allowed: UserRole[]) {
  requireRolesForApi(currentRole, allowed);
}
