import { z } from "zod";

import { AppError } from "@/lib/security/errors";

const uploadMetaSchema = z.object({
  fileName: z.string().min(1).max(180),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

const blockedExtensions = new Set(["exe", "js", "sh", "bat", "cmd", "msi", "php"]);
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);
const maxFileSizeBytes = 5 * 1024 * 1024;

export function validateUploadMeta(input: unknown) {
  const parsed = uploadMetaSchema.parse(input);
  const extension = parsed.fileName.split(".").pop()?.toLowerCase() ?? "";

  if (!allowedMimeTypes.has(parsed.mimeType)) {
    throw new AppError("UNSUPPORTED_FILE_TYPE", 400, "Unsupported file type");
  }

  if (blockedExtensions.has(extension)) {
    throw new AppError("BLOCKED_FILE_EXTENSION", 400, "File extension is not allowed");
  }

  if (parsed.sizeBytes > maxFileSizeBytes) {
    throw new AppError("FILE_TOO_LARGE", 400, "File exceeds allowed size", {
      maxFileSizeBytes,
    });
  }

  return parsed;
}
