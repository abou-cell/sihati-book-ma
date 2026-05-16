import { redirect } from "next/navigation";

import type { UserRole } from "@/lib/auth/permissions";
import { hasAnyRole } from "@/lib/auth/permissions";
import type { AuthSession } from "@/lib/auth/session";
import { readAuthSessionFromRequest, readAuthSessionFromServerHeaders } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/security/audit-log";
import { AppError } from "@/lib/security/errors";

export type CurrentUser = AuthSession;

export function getCurrentUserFromRequest(request: Request): CurrentUser {
  const requestId = request.headers.get("x-request-id");

  try {
    const session = readAuthSessionFromRequest(request);
    if (!session) {
      writeAuditLog({ eventType: "AUTH_FAILURE", resourceType: "auth_session", action: "auth.authenticate", result: "FAILURE", requestId });
      throw new AppError("UNAUTHENTICATED", 401, "Authentication required");
    }

    writeAuditLog({ eventType: "AUTH_SUCCESS", actor: session, resourceType: "auth_session", action: "auth.authenticate", result: "SUCCESS", requestId });
    return session;
  } catch (error) {
    if (error instanceof AppError && error.code !== "UNAUTHENTICATED") {
      writeAuditLog({ eventType: "AUTH_FAILURE", resourceType: "auth_session", action: error.code, result: "FAILURE", requestId });
    }
    throw error;
  }
}

export async function getCurrentUserFromServer(): Promise<CurrentUser> {
  const session = await readAuthSessionFromServerHeaders();
  if (!session) redirect("/access-denied");
  return session;
}

export function requireRolesForApi(currentRole: UserRole, allowedRoles: readonly UserRole[]) {
  if (!hasAnyRole(currentRole, allowedRoles)) {
    throw new AppError("ACCESS_DENIED", 403, "Access denied");
  }
}

export async function requireRolesForPage(allowedRoles: readonly UserRole[]): Promise<CurrentUser> {
  const session = await getCurrentUserFromServer();
  if (!hasAnyRole(session.role, allowedRoles)) redirect("/access-denied");
  return session;
}

export function requireCurrentUserForApi(request: Request, allowedRoles: readonly UserRole[]): CurrentUser {
  const currentUser = getCurrentUserFromRequest(request);
  try {
    requireRolesForApi(currentUser.role, allowedRoles);
  } catch (error) {
    writeAuditLog({ eventType: "ACCESS_DENIED", actor: currentUser, action: "auth.role_check", result: "DENIED", requestId: request.headers.get("x-request-id") });
    throw error;
  }
  return currentUser;
}
