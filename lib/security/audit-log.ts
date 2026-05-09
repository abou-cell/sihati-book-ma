import type { CurrentUser } from "@/lib/auth/current-user";

export type AuditAction =
  | "medical_document.upload"
  | "medical_document.download"
  | "medical_document.delete"
  | "medical_document.access_denied";

type AuditContext = {
  action: AuditAction;
  actor?: CurrentUser;
  documentId?: string;
  patientId?: string;
  practitionerId?: string | null;
  appointmentId?: string | null;
  reason?: string;
  requestId?: string | null;
};

function hashIdentifier(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function safeId(value?: string | null) {
  return value ? hashIdentifier(value) : undefined;
}

export function writeAuditLog(context: AuditContext): void {
  const payload = {
    level: "info",
    type: "audit",
    action: context.action,
    actorRole: context.actor?.role,
    actorIdHash: safeId(context.actor?.userId),
    documentIdHash: safeId(context.documentId),
    patientIdHash: safeId(context.patientId),
    practitionerIdHash: safeId(context.practitionerId),
    appointmentIdHash: safeId(context.appointmentId),
    reason: context.reason,
    requestId: context.requestId ?? undefined,
    timestamp: new Date().toISOString(),
  };

  console.info(JSON.stringify(payload));
}
