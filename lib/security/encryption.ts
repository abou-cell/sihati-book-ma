import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { serverEnv } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const KEY_VERSION = "v1";

export type EncryptedValue = {
  algorithm: typeof ALGORITHM;
  keyVersion: typeof KEY_VERSION;
  iv: string;
  authTag: string;
  ciphertext: string;
};

export class EncryptionConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EncryptionConfigurationError";
  }
}

function getEncryptionSecret(): string {
  const secret = serverEnv.APP_ENCRYPTION_KEY;

  if (!secret) {
    throw new EncryptionConfigurationError(
      "APP_ENCRYPTION_KEY is required before storing external service secrets",
    );
  }

  if (serverEnv.NODE_ENV === "production" && secret.length < 32) {
    throw new EncryptionConfigurationError("APP_ENCRYPTION_KEY must be at least 32 characters in production");
  }

  return secret;
}

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

export function encryptSecret(plaintext: string): EncryptedValue {
  const normalized = plaintext.trim();
  if (!normalized) {
    throw new EncryptionConfigurationError("Cannot encrypt an empty secret value");
  }

  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, deriveKey(getEncryptionSecret()), iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });

  const ciphertext = Buffer.concat([cipher.update(normalized, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    algorithm: ALGORITHM,
    keyVersion: KEY_VERSION,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptSecret(encrypted: EncryptedValue): string {
  if (encrypted.algorithm !== ALGORITHM || encrypted.keyVersion !== KEY_VERSION) {
    throw new EncryptionConfigurationError("Unsupported encrypted secret format");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    deriveKey(getEncryptionSecret()),
    Buffer.from(encrypted.iv, "base64"),
    { authTagLength: AUTH_TAG_LENGTH_BYTES },
  );
  decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function fingerprintSecret(secret: string): string {
  return createHash("sha256").update(secret.trim(), "utf8").digest("hex").slice(0, 12);
}

export function maskSecretLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return `••••${value.slice(-4)}`;
}
