import { createHash, createHmac, randomUUID } from "node:crypto";

import { env } from "@/lib/env";
import { AppError } from "@/lib/security/errors";

export type MedicalDocumentStorageProvider = "S3_PRIVATE" | "LOCAL_PRIVATE";

const downloadTtlSeconds = 5 * 60;
const uploadTtlSeconds = 10 * 60;

function getSigningSecret(): string {
  const secret = process.env.MEDICAL_DOCUMENTS_SIGNING_SECRET ?? process.env.AUTH_SECRET ?? env.MEDICAL_DOCUMENTS_SIGNING_SECRET ?? env.AUTH_SECRET;
  if (!secret) {
    throw new AppError("MEDICAL_DOCUMENT_STORAGE_NOT_CONFIGURED", 503, "Medical document storage is not configured");
  }
  return secret;
}

function configuredProvider(): MedicalDocumentStorageProvider {
  return (process.env.MEDICAL_DOCUMENTS_STORAGE_PROVIDER as MedicalDocumentStorageProvider | undefined) ?? env.MEDICAL_DOCUMENTS_STORAGE_PROVIDER ?? "LOCAL_PRIVATE";
}

function storageBaseUrl(): string {
  return process.env.MEDICAL_DOCUMENTS_STORAGE_BASE_URL ?? env.MEDICAL_DOCUMENTS_STORAGE_BASE_URL ?? `${process.env.NEXT_PUBLIC_APP_URL ?? env.NEXT_PUBLIC_APP_URL}/api/private-medical-documents`;
}

function sign(parts: readonly string[]): string {
  return createHmac("sha256", getSigningSecret()).update(parts.join("\n")).digest("hex");
}

export function buildMedicalDocumentObjectKey(input: { patientId: string; extension: string }): string {
  const patientKey = createHash("sha256").update(input.patientId).digest("hex").slice(0, 24);
  return `medical-documents/patients/${patientKey}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${input.extension}`;
}

export function createSignedMedicalDocumentUrl(input: {
  objectKey: string;
  operation: "upload" | "download";
  expiresInSeconds?: number;
}): { url: string; expiresAt: Date } {
  const ttl = input.expiresInSeconds ?? (input.operation === "download" ? downloadTtlSeconds : uploadTtlSeconds);
  const expiresAt = new Date(Date.now() + ttl * 1000);
  const expires = Math.floor(expiresAt.getTime() / 1000).toString();
  const signature = sign([input.operation, input.objectKey, expires]);
  const url = new URL(storageBaseUrl());
  url.searchParams.set("key", input.objectKey);
  url.searchParams.set("op", input.operation);
  url.searchParams.set("expires", expires);
  url.searchParams.set("signature", signature);

  return { url: url.toString(), expiresAt };
}

export function getMedicalDocumentStorageProvider(): MedicalDocumentStorageProvider {
  return configuredProvider();
}
