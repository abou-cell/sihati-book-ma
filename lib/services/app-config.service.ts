import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/security/audit-log";
import { encryptJson, type EncryptedPayload, maskSecret } from "@/lib/security/encryption";
import { AppError } from "@/lib/security/errors";
import type { ServiceProvider, ToggleServiceConfigInput, UpsertServiceConfigInput } from "@/lib/validators/service-config";
import { SERVICE_PROVIDERS, toggleServiceConfigSchema, upsertServiceConfigSchema } from "@/lib/validators/service-config";

type JsonRecord = Record<string, unknown>;

type ServiceConfigurationRecord = {
  id: string;
  provider: ServiceProvider;
  isEnabled: boolean;
  displayName: string;
  metadata: JsonRecord;
  encryptedSecrets: JsonRecord | null;
  secretPreview: JsonRecord;
  createdAt: Date;
  updatedAt: Date;
  updatedByUserId: string | null;
};

type ServiceConfigurationDelegate = {
  findMany(args: { orderBy: { provider: "asc" } }): Promise<ServiceConfigurationRecord[]>;
  findUnique(args: { where: { provider: ServiceProvider } }): Promise<ServiceConfigurationRecord | null>;
  upsert(args: {
    where: { provider: ServiceProvider };
    update: Partial<ServiceConfigurationRecord>;
    create: Omit<ServiceConfigurationRecord, "id" | "createdAt" | "updatedAt">;
  }): Promise<ServiceConfigurationRecord>;
  update(args: {
    where: { provider: ServiceProvider };
    data: Partial<ServiceConfigurationRecord>;
  }): Promise<ServiceConfigurationRecord>;
};

type ServiceConfigPrismaClient = PrismaClient & {
  serviceConfiguration: ServiceConfigurationDelegate;
};

export type SafeServiceConfiguration = {
  id: string;
  provider: ServiceProvider;
  isEnabled: boolean;
  displayName: string;
  metadata: JsonRecord;
  secrets: Record<string, string>;
  hasEncryptedSecrets: boolean;
  updatedAt: string;
  updatedByUserId: string | null;
};

function serviceConfigClient(): ServiceConfigPrismaClient {
  return prisma as ServiceConfigPrismaClient;
}

function normalizeMetadata(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonRecord;
}

function normalizeSecretPreview(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

function buildSecretPreview(secrets: Record<string, string> | undefined): Record<string, string> {
  if (!secrets) return {};

  return Object.fromEntries(
    Object.entries(secrets).map(([key, value]) => [key, maskSecret(value) ?? "••••••••"]),
  );
}

function toSafeConfig(record: ServiceConfigurationRecord): SafeServiceConfiguration {
  return {
    id: record.id,
    provider: record.provider,
    isEnabled: record.isEnabled,
    displayName: record.displayName,
    metadata: normalizeMetadata(record.metadata),
    secrets: normalizeSecretPreview(record.secretPreview),
    hasEncryptedSecrets: !!record.encryptedSecrets,
    updatedAt: record.updatedAt.toISOString(),
    updatedByUserId: record.updatedByUserId,
  };
}

function logConfigAttempt(event: string, payload: { provider?: ServiceProvider; actorUserId: string; success: boolean; reason?: string }) {
  writeAuditLog({
    eventType: "ADMIN_SERVICE_CONFIG_CHANGED",
    actorUserId: payload.actorUserId,
    actorRole: "ADMIN",
    resourceType: "service_configuration",
    resourceId: payload.provider,
    action: payload.reason ? `${event}.${payload.reason}` : event,
    result: payload.success ? "SUCCESS" : "FAILURE",
  });
}

export class AppConfigService {
  constructor(private readonly db = serviceConfigClient()) {}

  async listServiceConfigurations(): Promise<SafeServiceConfiguration[]> {
    const records = await this.db.serviceConfiguration.findMany({ orderBy: { provider: "asc" } });
    return records.map(toSafeConfig);
  }

  async upsertServiceConfiguration(input: UpsertServiceConfigInput, actorUserId: string): Promise<SafeServiceConfiguration> {
    const parsed = upsertServiceConfigSchema.parse(input);

    try {
      const existing = await this.db.serviceConfiguration.findUnique({ where: { provider: parsed.provider } });
      const hasNewSecrets = parsed.secrets && Object.keys(parsed.secrets).length > 0;
      const encryptedSecrets = hasNewSecrets ? encryptJson(parsed.secrets ?? {}) : existing?.encryptedSecrets ?? null;
      const secretPreview = hasNewSecrets ? buildSecretPreview(parsed.secrets) : normalizeSecretPreview(existing?.secretPreview);

      const record = await this.db.serviceConfiguration.upsert({
        where: { provider: parsed.provider },
        update: {
          displayName: parsed.displayName,
          isEnabled: parsed.isEnabled,
          metadata: parsed.metadata,
          encryptedSecrets: encryptedSecrets as EncryptedPayload | null,
          secretPreview,
          updatedByUserId: actorUserId,
        },
        create: {
          provider: parsed.provider,
          displayName: parsed.displayName,
          isEnabled: parsed.isEnabled,
          metadata: parsed.metadata,
          encryptedSecrets: encryptedSecrets as EncryptedPayload | null,
          secretPreview,
          updatedByUserId: actorUserId,
        },
      });

      logConfigAttempt("service_config.upsert", { provider: parsed.provider, actorUserId, success: true });
      return toSafeConfig(record);
    } catch (error) {
      logConfigAttempt("service_config.upsert", {
        provider: parsed.provider,
        actorUserId,
        success: false,
        reason: error instanceof Error ? error.name : "UnknownError",
      });
      throw error;
    }
  }

  async toggleServiceConfiguration(input: ToggleServiceConfigInput, actorUserId: string): Promise<SafeServiceConfiguration> {
    const parsed = toggleServiceConfigSchema.parse(input);

    try {
      const existing = await this.db.serviceConfiguration.findUnique({ where: { provider: parsed.provider } });
      if (!existing) {
        throw new AppError("SERVICE_CONFIG_NOT_FOUND", 404, "Service configuration not found");
      }

      const record = await this.db.serviceConfiguration.update({
        where: { provider: parsed.provider },
        data: { isEnabled: parsed.isEnabled, updatedByUserId: actorUserId },
      });

      logConfigAttempt("service_config.toggle", { provider: parsed.provider, actorUserId, success: true });
      return toSafeConfig(record);
    } catch (error) {
      logConfigAttempt("service_config.toggle", {
        provider: parsed.provider,
        actorUserId,
        success: false,
        reason: error instanceof Error ? error.name : "UnknownError",
      });
      throw error;
    }
  }

  getSupportedProviders(): readonly ServiceProvider[] {
    return SERVICE_PROVIDERS;
  }
}

export const appConfigService = new AppConfigService();
