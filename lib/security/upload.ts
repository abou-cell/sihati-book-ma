import { createHash } from "node:crypto";
import path from "node:path";

import { z } from "zod";

import { AppError } from "@/lib/security/errors";

export const allowedMedicalDocumentMimeTypes = ["application/pdf", "image/jpeg", "image/png"] as const;
export const maxMedicalDocumentFileSizeBytes = 10 * 1024 * 1024;

const allowedExtensionsByMimeType: Record<(typeof allowedMedicalDocumentMimeTypes)[number], readonly string[]> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
};

const blockedExtensions = new Set(["bat", "cmd", "com", "dll", "dmg", "exe", "js", "msi", "php", "ps1", "sh", "svg"]);

const checksumSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/i, "Checksum must be a SHA-256 hex digest")
  .transform((value) => value.toLowerCase());

const uploadMetaSchema = z.object({
  fileName: z.string().min(1).max(180),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  checksum: checksumSchema.optional(),
});

export type ValidatedUploadMeta = z.infer<typeof uploadMetaSchema> & {
  extension: string;
  safeFileName: string;
};

function normalizeFileName(fileName: string): string {
  const baseName = path.basename(fileName).normalize("NFKC");
  return baseName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").slice(0, 180);
}

function getExtension(fileName: string): string {
  const extension = normalizeFileName(fileName).split(".").pop()?.toLowerCase() ?? "";
  if (!extension || extension === normalizeFileName(fileName).toLowerCase()) {
    throw new AppError("MISSING_FILE_EXTENSION", 400, "File extension is required");
  }
  return extension;
}

export function validateUploadMeta(input: unknown): ValidatedUploadMeta {
  const parsed = uploadMetaSchema.parse(input);
  const safeFileName = normalizeFileName(parsed.fileName);
  const extension = getExtension(safeFileName);

  if (blockedExtensions.has(extension)) {
    throw new AppError("BLOCKED_FILE_EXTENSION", 400, "File extension is not allowed");
  }

  if (!allowedMedicalDocumentMimeTypes.includes(parsed.mimeType as (typeof allowedMedicalDocumentMimeTypes)[number])) {
    throw new AppError("UNSUPPORTED_FILE_TYPE", 400, "Unsupported file type");
  }

  const expectedExtensions = allowedExtensionsByMimeType[parsed.mimeType as (typeof allowedMedicalDocumentMimeTypes)[number]];
  if (!expectedExtensions.includes(extension)) {
    throw new AppError("FILE_EXTENSION_MISMATCH", 400, "File extension does not match MIME type");
  }

  if (parsed.sizeBytes > maxMedicalDocumentFileSizeBytes) {
    throw new AppError("FILE_TOO_LARGE", 400, "File exceeds allowed size", { maxFileSizeBytes: maxMedicalDocumentFileSizeBytes });
  }

  return { ...parsed, extension, safeFileName };
}

export async function sha256Hex(file: Blob): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return createHash("sha256").update(buffer).digest("hex");
}
