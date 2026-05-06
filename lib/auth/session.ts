import type { UserRole } from "@/lib/auth/permissions";
import { isUserRole } from "@/lib/auth/permissions";

export type AuthSession = {
  userId: string;
  role: UserRole;
};

const DEMO_USER_ID_HEADER = "x-user-id";
const DEMO_USER_ROLE_HEADER = "x-user-role";

function isDemoHeaderAuthEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

function buildDemoSession(userId: string | null, role: string | null): AuthSession | null {
  if (!isDemoHeaderAuthEnabled() || !userId || !isUserRole(role)) {
    return null;
  }

  return { userId, role };
}

export function readDemoSessionFromRequest(request: Request): AuthSession | null {
  return buildDemoSession(
    request.headers.get(DEMO_USER_ID_HEADER),
    request.headers.get(DEMO_USER_ROLE_HEADER),
  );
}

export async function readDemoSessionFromServerHeaders(): Promise<AuthSession | null> {
  const { headers } = await import("next/headers");
  const requestHeaders = await headers();

  return buildDemoSession(
    requestHeaders.get(DEMO_USER_ID_HEADER),
    requestHeaders.get(DEMO_USER_ROLE_HEADER),
  );
}

export const demoSessionHeaderNames = {
  userId: DEMO_USER_ID_HEADER,
  role: DEMO_USER_ROLE_HEADER,
};
