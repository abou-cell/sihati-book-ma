export const USER_ROLES = ["PATIENT", "PRACTITIONER", "ADMIN", "CLINIC_ADMIN"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: string | null | undefined): value is UserRole {
  return !!value && USER_ROLES.includes(value as UserRole);
}

export function hasAnyRole(currentRole: UserRole, allowedRoles: readonly UserRole[]): boolean {
  return allowedRoles.includes(currentRole);
}
