import type { CurrentUser } from "@/lib/auth/current-user";
import { getCurrentUserFromRequest, requireRolesForApi } from "@/lib/auth/current-user";
import type { UserRole } from "@/lib/auth/permissions";
import { writeAuditLog } from "@/lib/security/audit-log";
import { AppError } from "@/lib/security/errors";

export type { UserRole };

export type AppointmentAccessRecord = {
  patientId: string;
  practitionerId: string;
  consultationType?: "IN_PERSON" | "VIDEO";
  status?: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
};

export type MedicalDocumentAccessRecord = {
  patientId: string;
  practitionerId?: string | null;
  practitionerIds?: readonly string[];
  appointment?: { practitionerId: string } | null;
  deletedAt?: Date | string | null;
};

export function getUserContext(request: Request): CurrentUser {
  return getCurrentUserFromRequest(request);
}

export function requireRole(currentRole: UserRole, allowed: readonly UserRole[]) {
  requireRolesForApi(currentRole, allowed);
}

export function requireUserContext(request: Request, allowed: readonly UserRole[]): CurrentUser {
  const currentUser = getUserContext(request);
  try {
    requireRole(currentUser.role, allowed);
  } catch (error) {
    writeAuditLog({ eventType: "ACCESS_DENIED", actor: currentUser, action: "auth.role_check", result: "DENIED", requestId: request.headers.get("x-request-id") });
    throw error;
  }
  return currentUser;
}

export function canAccessAppointment(currentUser: CurrentUser, appointment: AppointmentAccessRecord): boolean {
  if (currentUser.role === "ADMIN") return true;
  if (currentUser.role === "PATIENT") return currentUser.userId === appointment.patientId;
  if (currentUser.role === "PRACTITIONER") return currentUser.userId === appointment.practitionerId;
  return false;
}

export function assertCanAccessAppointment(currentUser: CurrentUser, appointment: AppointmentAccessRecord): void {
  if (!canAccessAppointment(currentUser, appointment)) {
    throw new AppError("APPOINTMENT_ACCESS_DENIED", 403, "Access denied");
  }
}

export function canAccessVideoConsultation(currentUser: CurrentUser, appointment: AppointmentAccessRecord): boolean {
  return (
    appointment.consultationType === "VIDEO" &&
    appointment.status !== "CANCELLED" &&
    canAccessAppointment(currentUser, appointment)
  );
}

export function assertCanAccessVideoConsultation(currentUser: CurrentUser, appointment: AppointmentAccessRecord): void {
  if (!canAccessVideoConsultation(currentUser, appointment)) {
    throw new AppError("VIDEO_ACCESS_DENIED", 403, "Access denied");
  }
}

export function canAccessMedicalDocument(currentUser: CurrentUser, document: MedicalDocumentAccessRecord): boolean {
  if (document.deletedAt) return false;
  if (currentUser.role === "ADMIN") return true;
  if (currentUser.role === "PATIENT") return currentUser.userId === document.patientId;
  if (currentUser.role === "PRACTITIONER") {
    return (
      document.practitionerId === currentUser.userId ||
      document.appointment?.practitionerId === currentUser.userId ||
      document.practitionerIds?.includes(currentUser.userId) === true
    );
  }
  return false;
}

export function assertCanAccessMedicalDocument(currentUser: CurrentUser, document: MedicalDocumentAccessRecord): void {
  if (!canAccessMedicalDocument(currentUser, document)) {
    throw new AppError("MEDICAL_DOCUMENT_ACCESS_DENIED", 403, "Access denied");
  }
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");

  // Non-browser server-to-server requests often omit Origin. Enforce when present
  // so future cookie-based sessions have a central CSRF origin check to reuse.
  if (!origin) return;

  const trustedOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").origin;
  if (origin !== trustedOrigin) {
    throw new AppError("INVALID_ORIGIN", 403, "Access denied");
  }
}
