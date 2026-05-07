export const USER_ROLES = ["PATIENT", "PRACTITIONER", "ADMIN"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_PERMISSIONS = {
  PATIENT: [
    "appointment:create:self",
    "appointment:read:own",
    "consultation:join:own",
    "medical-document:read:own",
  ],
  PRACTITIONER: [
    "appointment:read:assigned",
    "availability:manage:self",
    "consultation:join:assigned",
    "medical-document:read:assigned-patient",
  ],
  ADMIN: [
    "admin:access",
    "appointment:read:any",
    "consultation:join:any",
    "medical-document:read:any",
    "practitioner:validate",
  ],
} as const satisfies Record<UserRole, readonly string[]>;

export type Permission = (typeof ROLE_PERMISSIONS)[UserRole][number];

export function isUserRole(value: string | null | undefined): value is UserRole {
  return !!value && USER_ROLES.includes(value as UserRole);
}

export function hasAnyRole(currentRole: UserRole, allowedRoles: readonly UserRole[]): boolean {
  return allowedRoles.includes(currentRole);
}

export function hasPermission(currentRole: UserRole, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[currentRole] as readonly string[]).includes(permission);
}
