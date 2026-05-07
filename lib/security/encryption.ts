import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { serverEnv } from "@/lib/env";
import { AppError } from "@/lib/security/errors";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

export type EncryptedPayload = {
  algorithm: typeof ALGORITHM;
  iv: string;
  authTag: string;
  ciphertext: string;
};

function getEncryptionKey(): Buffer {
  if (!serverEnv.APP_ENCRYPTION_KEY) {
    throw new AppError(
      "ENCRYPTION_KEY_MISSING",
      500,
      "Application encryption is not configured",
      undefined,
      false,
    );
  }

  const key = Buffer.from(serverEnv.APP_ENCRYPTION_KEY, "base64");
  if (key.length < 32) {
    throw new AppError("ENCRYPTION_KEY_INVALID", 500, "Application encryption is invalid", undefined, false);
  }

  return key.subarray(0, 32);
}

export function encryptString(plaintext: string): EncryptedPayload {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    algorithm: ALGORITHM,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptString(payload: EncryptedPayload): string {
  if (payload.algorithm !== ALGORITHM) {
    throw new AppError("ENCRYPTION_ALGORITHM_UNSUPPORTED", 500, "Encrypted payload is unsupported", undefined, false);
  }

  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}

export function encryptJson(value: Record<string, string>): EncryptedPayload {
  return encryptString(JSON.stringify(value));
}

export function decryptJson(payload: EncryptedPayload): Record<string, string> {
  const parsed = JSON.parse(decryptString(payload)) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

  return Object.fromEntries(
    Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

export function maskSecret(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}
