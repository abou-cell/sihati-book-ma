import type { CurrentUser } from "@/lib/auth/current-user";
import { env } from "@/lib/env";
import {
  createMedicalDocument,
  findAppointmentForMedicalDocument,
  findMedicalDocumentById,
  listMedicalDocuments,
  softDeleteMedicalDocument,
  type MedicalDocumentRecord,
} from "@/lib/repositories/medical-document.repository";
import { writeAuditLog } from "@/lib/security/audit-log";
import { assertCanAccessMedicalDocument, canAccessMedicalDocument } from "@/lib/security/access-control";
import { AppError } from "@/lib/security/errors";
import { validateUploadMeta } from "@/lib/security/upload";
import {
  buildMedicalDocumentObjectKey,
  createSignedMedicalDocumentUrl,
  getMedicalDocumentStorageProvider,
} from "@/lib/storage/medical-document-storage";

export type CreateMedicalDocumentRequest = {
  patientId?: string;
  practitionerId?: string;
  appointmentId?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
};

function accessRecord(document: MedicalDocumentRecord) {
  return {
    patientId: document.patientId,
    practitionerId: document.practitionerId,
    appointment: document.appointment ?? null,
    deletedAt: document.deletedAt,
  };
}

function serializeDocument(document: MedicalDocumentRecord) {
  return {
    id: document.id,
    patientId: document.patientId,
    practitionerId: document.practitionerId,
    appointmentId: document.appointmentId,
    storageProvider: document.storageProvider,
    fileName: document.fileName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    checksum: document.checksum,
    status: document.status,
    createdAt: document.createdAt,
    deletedAt: document.deletedAt,
  };
}

function assertAdminDownloadAllowed(currentUser: CurrentUser, reason?: string | null): void {
  if (currentUser.role !== "ADMIN") return;
  if (env.MEDICAL_DOCUMENT_ADMIN_DOWNLOADS_ENABLED === "true" && reason && reason.trim().length >= 8) return;
  throw new AppError("ADMIN_MEDICAL_DOCUMENT_DOWNLOAD_RESTRICTED", 403, "Access denied");
}

function auditDenied(currentUser: CurrentUser, document: MedicalDocumentRecord | null, requestId: string | null, reason: string): never {
  writeAuditLog({
    action: "medical_document.access_denied",
    actor: currentUser,
    documentId: document?.id,
    patientId: document?.patientId,
    practitionerId: document?.practitionerId,
    appointmentId: document?.appointmentId,
    requestId,
    reason,
  });
  throw new AppError("MEDICAL_DOCUMENT_ACCESS_DENIED", 403, "Access denied");
}

export async function listAccessibleMedicalDocuments(currentUser: CurrentUser, patientId?: string) {
  if (currentUser.role === "PATIENT") {
    if (patientId && patientId !== currentUser.userId) {
      writeAuditLog({ action: "medical_document.access_denied", actor: currentUser, patientId, reason: "patient_mismatch" });
      throw new AppError("MEDICAL_DOCUMENT_ACCESS_DENIED", 403, "Access denied");
    }
    return (await listMedicalDocuments({ patientId: currentUser.userId })).map(serializeDocument);
  }

  if (currentUser.role === "PRACTITIONER") {
    const documents = await listMedicalDocuments({ patientId, practitionerId: currentUser.userId });
    return documents.filter((document) => canAccessMedicalDocument(currentUser, accessRecord(document))).map(serializeDocument);
  }

  return (await listMedicalDocuments({ patientId })).map(serializeDocument);
}

export async function createMedicalDocumentUpload(currentUser: CurrentUser, input: CreateMedicalDocumentRequest, requestId: string | null) {
  const upload = validateUploadMeta(input);
  const appointment = input.appointmentId ? await findAppointmentForMedicalDocument(input.appointmentId) : null;
  if (input.appointmentId && !appointment) {
    throw new AppError("APPOINTMENT_NOT_FOUND", 404, "Appointment not found");
  }

  const patientId = appointment?.patientId ?? input.patientId ?? currentUser.userId;
  const linkedPractitionerId = appointment?.practitionerId ?? input.practitionerId ?? null;

  if (input.patientId && input.patientId !== patientId) {
    writeAuditLog({ action: "medical_document.access_denied", actor: currentUser, patientId: input.patientId, requestId, reason: "appointment_patient_mismatch" });
    throw new AppError("MEDICAL_DOCUMENT_ACCESS_DENIED", 403, "Access denied");
  }

  if (currentUser.role === "PATIENT" && patientId !== currentUser.userId) {
    writeAuditLog({ action: "medical_document.access_denied", actor: currentUser, patientId, requestId, reason: "upload_patient_mismatch" });
    throw new AppError("MEDICAL_DOCUMENT_ACCESS_DENIED", 403, "Access denied");
  }

  if (currentUser.role === "PRACTITIONER" && linkedPractitionerId !== currentUser.userId) {
    writeAuditLog({ action: "medical_document.access_denied", actor: currentUser, patientId, requestId, reason: "upload_not_linked" });
    throw new AppError("MEDICAL_DOCUMENT_ACCESS_DENIED", 403, "Access denied");
  }

  const objectKey = buildMedicalDocumentObjectKey({ patientId, extension: upload.extension });
  const document = await createMedicalDocument({
    patientId,
    practitionerId: linkedPractitionerId ?? (currentUser.role === "PRACTITIONER" ? currentUser.userId : null),
    appointmentId: input.appointmentId ?? null,
    storageProvider: getMedicalDocumentStorageProvider(),
    objectKey,
    fileName: upload.safeFileName,
    mimeType: upload.mimeType,
    sizeBytes: upload.sizeBytes,
    checksum: upload.checksum ?? input.checksum,
    status: "PENDING_UPLOAD",
  });
  const signedUpload = createSignedMedicalDocumentUrl({ objectKey, operation: "upload" });

  writeAuditLog({ action: "medical_document.upload", actor: currentUser, documentId: document.id, patientId, practitionerId: document.practitionerId, appointmentId: document.appointmentId, requestId });

  return { document: serializeDocument(document), uploadUrl: signedUpload.url, uploadUrlExpiresAt: signedUpload.expiresAt };
}

export async function getMedicalDocumentDownload(currentUser: CurrentUser, id: string, requestId: string | null, adminReason?: string | null) {
  const document = await findMedicalDocumentById(id);
  if (!document) throw new AppError("MEDICAL_DOCUMENT_NOT_FOUND", 404, "Medical document not found");
  if (!canAccessMedicalDocument(currentUser, accessRecord(document))) auditDenied(currentUser, document, requestId, "download_access_denied");
  assertAdminDownloadAllowed(currentUser, adminReason);

  const signedDownload = createSignedMedicalDocumentUrl({ objectKey: document.objectKey, operation: "download" });
  writeAuditLog({ action: "medical_document.download", actor: currentUser, documentId: document.id, patientId: document.patientId, practitionerId: document.practitionerId, appointmentId: document.appointmentId, requestId });

  return { document: serializeDocument(document), downloadUrl: signedDownload.url, downloadUrlExpiresAt: signedDownload.expiresAt };
}

export async function deleteMedicalDocument(currentUser: CurrentUser, id: string, requestId: string | null) {
  const document = await findMedicalDocumentById(id);
  if (!document) throw new AppError("MEDICAL_DOCUMENT_NOT_FOUND", 404, "Medical document not found");
  assertCanAccessMedicalDocument(currentUser, accessRecord(document));
  const deleted = await softDeleteMedicalDocument(id);
  writeAuditLog({ action: "medical_document.delete", actor: currentUser, documentId: deleted.id, patientId: deleted.patientId, practitionerId: deleted.practitionerId, appointmentId: deleted.appointmentId, requestId });
  return serializeDocument(deleted);
}
