import { redirect } from "next/navigation";

import type { AuthSession } from "@/lib/auth/session";
import { readDemoSessionFromRequest, readDemoSessionFromServerHeaders } from "@/lib/auth/session";
import type { UserRole } from "@/lib/auth/permissions";
import { hasAnyRole } from "@/lib/auth/permissions";
import { AppError } from "@/lib/security/errors";

export function getCurrentUserFromRequest(request: Request): AuthSession {
  const session = readDemoSessionFromRequest(request);
  if (!session) throw new AppError("UNAUTHENTICATED", 401, "Authentication required");
  return session;
}

export async function getCurrentUserFromServer(): Promise<AuthSession> {
  const session = await readDemoSessionFromServerHeaders();
  if (!session) redirect("/access-denied");
  return session;
}

export function requireRolesForApi(currentRole: UserRole, allowedRoles: readonly UserRole[]) {
  if (!hasAnyRole(currentRole, allowedRoles)) {
    throw new AppError("ACCESS_DENIED", 403, "Access denied");
  }
}

export async function requireRolesForPage(allowedRoles: readonly UserRole[]): Promise<AuthSession> {
  const session = await getCurrentUserFromServer();
  if (!hasAnyRole(session.role, allowedRoles)) redirect("/access-denied");
  return session;
}
