import { beforeEach, describe, expect, it, vi } from "vitest";

const documents = new Map<string, any>();

vi.mock("@/lib/repositories/medical-document.repository", () => ({
  findAppointmentForMedicalDocument: vi.fn(async (id: string) => (id === "appointment_1" ? { id, patientId: "patient_1", practitionerId: "practitioner_1" } : null)),
  findMedicalDocumentById: vi.fn(async (id: string) => documents.get(id) ?? null),
  listMedicalDocuments: vi.fn(async (input: { patientId?: string; practitionerId?: string }) =>
    Array.from(documents.values()).filter((document) => {
      if (document.deletedAt || document.status === "DELETED") return false;
      if (input.patientId && document.patientId !== input.patientId) return false;
      if (input.practitionerId && document.practitionerId !== input.practitionerId && document.appointment?.practitionerId !== input.practitionerId) return false;
      return true;
    }),
  ),
  createMedicalDocument: vi.fn(async (input: any) => {
    const document = { id: `doc_${documents.size + 1}`, createdAt: new Date("2026-05-09T00:00:00.000Z"), deletedAt: null, appointment: null, ...input };
    documents.set(document.id, document);
    return document;
  }),
  softDeleteMedicalDocument: vi.fn(async (id: string) => {
    const document = { ...documents.get(id), status: "DELETED", deletedAt: new Date("2026-05-09T00:05:00.000Z") };
    documents.set(id, document);
    return document;
  }),
}));

vi.mock("@/lib/security/audit-log", () => ({ writeAuditLog: vi.fn() }));

import { createMedicalDocumentUpload, deleteMedicalDocument, getMedicalDocumentDownload, listAccessibleMedicalDocuments } from "@/lib/services/medical-document.service";
import { AppError } from "@/lib/security/errors";

const patient = { userId: "patient_1", role: "PATIENT" as const, source: "signed-session-cookie" as const };
const otherPatient = { userId: "patient_2", role: "PATIENT" as const, source: "signed-session-cookie" as const };
const practitioner = { userId: "practitioner_1", role: "PRACTITIONER" as const, source: "signed-session-cookie" as const };

beforeEach(() => {
  documents.clear();
  vi.stubEnv("AUTH_SECRET", "test-auth-secret-with-at-least-32-characters");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://sihati.test");
});

describe("medical document service", () => {
  it("rejects ownership mismatches", async () => {
    await expect(listAccessibleMedicalDocuments(patient, "patient_2")).rejects.toThrow(AppError);
  });

  it("rejects invalid file types and oversized uploads", async () => {
    await expect(
      createMedicalDocumentUpload(patient, { fileName: "script.exe", mimeType: "application/pdf", sizeBytes: 100, checksum: "a".repeat(64) }, null),
    ).rejects.toThrow(AppError);
    await expect(
      createMedicalDocumentUpload(patient, { fileName: "scan.pdf", mimeType: "application/pdf", sizeBytes: 11 * 1024 * 1024, checksum: "a".repeat(64) }, null),
    ).rejects.toThrow(AppError);
  });

  it("creates a private object key and signed upload URL without exposing storage publicly", async () => {
    const result = await createMedicalDocumentUpload(
      patient,
      { fileName: "../Lab Result.pdf", mimeType: "application/pdf", sizeBytes: 1024, checksum: "b".repeat(64) },
      "req_1",
    );

    expect(result.document.fileName).toBe("Lab_Result.pdf");
    expect(result.document.storageProvider).toBe("LOCAL_PRIVATE");
    expect(result.uploadUrl).toContain("op=upload");
    expect(result.uploadUrlExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("generates a short-lived signed download URL for the owner", async () => {
    const created = await createMedicalDocumentUpload(
      patient,
      { fileName: "report.pdf", mimeType: "application/pdf", sizeBytes: 1024, checksum: "c".repeat(64) },
      null,
    );

    const result = await getMedicalDocumentDownload(patient, created.document.id, null);

    expect(result.downloadUrl).toContain("op=download");
    expect(result.downloadUrl).toContain("signature=");
    expect(result.downloadUrlExpiresAt.getTime() - Date.now()).toBeLessThanOrEqual(5 * 60 * 1000);
  });

  it("denies unauthorized download attempts", async () => {
    const created = await createMedicalDocumentUpload(
      patient,
      { fileName: "report.pdf", mimeType: "application/pdf", sizeBytes: 1024, checksum: "d".repeat(64) },
      null,
    );

    await expect(getMedicalDocumentDownload(otherPatient, created.document.id, null)).rejects.toThrow(AppError);
  });

  it("allows explicitly linked practitioners and excludes soft-deleted documents", async () => {
    const created = await createMedicalDocumentUpload(
      patient,
      { practitionerId: practitioner.userId, fileName: "xray.png", mimeType: "image/png", sizeBytes: 1024, checksum: "e".repeat(64) },
      null,
    );

    await expect(getMedicalDocumentDownload(practitioner, created.document.id, null)).resolves.toMatchObject({ document: { id: created.document.id } });
    await deleteMedicalDocument(patient, created.document.id, null);
    await expect(getMedicalDocumentDownload(patient, created.document.id, null)).rejects.toThrow(AppError);
    await expect(listAccessibleMedicalDocuments(patient)).resolves.toEqual([]);
  });
});
