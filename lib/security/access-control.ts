import { AppError } from "@/lib/security/errors";

export type UserRole = "PATIENT" | "PRACTITIONER" | "ADMIN";

export function getUserContext(request: Request) {
  const userId = request.headers.get("x-user-id");
  const role = request.headers.get("x-user-role") as UserRole | null;

  if (!userId || !role) {
    throw new AppError("UNAUTHENTICATED", 401, "Authentication required");
  }

  return { userId, role };
}

export function requireRole(currentRole: UserRole, allowed: UserRole[]) {
  if (!allowed.includes(currentRole)) {
    throw new AppError("ACCESS_DENIED", 403, "Access denied");
  }
}
