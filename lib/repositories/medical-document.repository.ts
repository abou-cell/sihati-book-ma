import { prisma } from "@/lib/db/prisma";

export type MedicalDocumentRecord = {
  id: string;
  patientId: string;
  practitionerId: string | null;
  appointmentId: string | null;
  storageProvider: "S3_PRIVATE" | "LOCAL_PRIVATE";
  objectKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  status: "PENDING_UPLOAD" | "AVAILABLE" | "DELETED";
  createdAt: Date;
  updatedAt?: Date;
  deletedAt: Date | null;
  appointment?: { patientId: string; practitionerId: string } | null;
};

export type CreateMedicalDocumentInput = Omit<MedicalDocumentRecord, "id" | "createdAt" | "updatedAt" | "deletedAt" | "appointment">;

export async function findAppointmentForMedicalDocument(id: string): Promise<{ id: string; patientId: string; practitionerId: string } | null> {
  return prisma.appointment.findUnique({ where: { id }, select: { id: true, patientId: true, practitionerId: true } });
}

export async function findMedicalDocumentById(id: string): Promise<MedicalDocumentRecord | null> {
  return prisma.medicalDocument.findUnique({
    where: { id },
    include: { appointment: { select: { patientId: true, practitionerId: true } } },
  });
}

export async function listMedicalDocuments(input: {
  patientId?: string;
  practitionerId?: string;
  includeDeleted?: boolean;
}): Promise<MedicalDocumentRecord[]> {
  return prisma.medicalDocument.findMany({
    where: {
      ...(input.patientId ? { patientId: input.patientId } : {}),
      ...(input.practitionerId
        ? {
            OR: [{ practitionerId: input.practitionerId }, { appointment: { practitionerId: input.practitionerId } }],
          }
        : {}),
      ...(input.includeDeleted ? {} : { deletedAt: null, status: { not: "DELETED" } }),
    },
    include: { appointment: { select: { patientId: true, practitionerId: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createMedicalDocument(input: CreateMedicalDocumentInput): Promise<MedicalDocumentRecord> {
  return prisma.medicalDocument.create({ data: input });
}

export async function softDeleteMedicalDocument(id: string): Promise<MedicalDocumentRecord> {
  return prisma.medicalDocument.update({
    where: { id },
    data: { status: "DELETED", deletedAt: new Date() },
    include: { appointment: { select: { patientId: true, practitionerId: true } } },
  });
}
