import type { UserRole } from "@/lib/auth/permissions";
import { isUserRole } from "@/lib/auth/permissions";

export type AuthSession = {
  userId: string;
  role: UserRole;
};

const DEMO_USER_ID_HEADER = "x-user-id";
const DEMO_USER_ROLE_HEADER = "x-user-role";

export function readDemoSessionFromRequest(request: Request): AuthSession | null {
  const userId = request.headers.get(DEMO_USER_ID_HEADER);
  const role = request.headers.get(DEMO_USER_ROLE_HEADER);

  if (!userId || !isUserRole(role)) {
    return null;
  }

  return { userId, role };
}

export async function readDemoSessionFromServerHeaders(): Promise<AuthSession | null> {
  const { headers } = await import("next/headers");
  const requestHeaders = await headers();
  const userId = requestHeaders.get(DEMO_USER_ID_HEADER);
  const role = requestHeaders.get(DEMO_USER_ROLE_HEADER);

  if (!userId || !isUserRole(role)) {
    return null;
  }

  return { userId, role };
}

export const demoSessionHeaderNames = {
  userId: DEMO_USER_ID_HEADER,
  role: DEMO_USER_ROLE_HEADER,
};
