import type { UserRole } from "@/lib/auth/permissions";
import { isUserRole } from "@/lib/auth/permissions";

export type AuthSession = {
  userId: string;
  role: UserRole;
  source: "demo-headers";
};

const DEMO_USER_ID_HEADER = "x-user-id";
const DEMO_USER_ROLE_HEADER = "x-user-role";

export const demoSessionHeaderNames = {
  userId: DEMO_USER_ID_HEADER,
  role: DEMO_USER_ROLE_HEADER,
} as const;

export function isDemoHeaderAuthEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

function normalizeUserId(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.length > 128) return null;
  return trimmed;
}

function buildDemoSession(userId: string | null, role: string | null): AuthSession | null {
  const normalizedUserId = normalizeUserId(userId);

  if (!isDemoHeaderAuthEnabled() || !normalizedUserId || !isUserRole(role)) {
    return null;
  }

  // MVP-only auth boundary: these headers are spoofable and are deliberately
  // accepted only outside production. Replace this function with verified
  // cookie/JWT/Firebase Auth session parsing before a production release.
  return { userId: normalizedUserId, role, source: "demo-headers" };
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

export function buildDemoSessionHeaders(session: Pick<AuthSession, "userId" | "role">): Record<string, string> {
  if (!isDemoHeaderAuthEnabled()) return {};

  return {
    [DEMO_USER_ID_HEADER]: session.userId,
    [DEMO_USER_ROLE_HEADER]: session.role,
  };
}
