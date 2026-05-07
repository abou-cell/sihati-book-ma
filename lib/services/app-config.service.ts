import { prisma } from "@/lib/db/prisma";
import { encryptSecret, fingerprintSecret, maskSecretLabel, type EncryptedValue } from "@/lib/security/encryption";
import { AppError } from "@/lib/security/errors";
import {
  SERVICE_CONFIG_LABELS,
  SERVICE_CONFIG_PROVIDERS,
  serviceConfigUpsertSchema,
  type ServiceConfigProvider,
  type ServiceConfigUpsertInput,
} from "@/lib/validators/service-config";

export type MaskedServiceConfiguration = {
  id: string | null;
  provider: ServiceConfigProvider;
  displayName: string;
  isEnabled: boolean;
  metadata: Record<string, unknown>;
  secrets: Record<string, { configured: boolean; maskedValue: string | null }>;
  createdAt: string | null;
  updatedAt: string | null;
};

type StoredEncryptedSecrets = Record<string, EncryptedValue>;
type StoredFingerprints = Record<string, string>;

type ServiceConfigRecord = {
  id: string;
  provider: string;
  displayName: string;
  isEnabled: boolean;
  metadata: JsonValue | null;
  encryptedSecrets: JsonValue | null;
  secretFingerprints: JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
};

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function asRecord(value: JsonValue | null): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asFingerprints(value: JsonValue | null): StoredFingerprints {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as StoredFingerprints;
}

function maskConfiguration(record: ServiceConfigRecord): MaskedServiceConfiguration {
  const fingerprints = asFingerprints(record.secretFingerprints);
  const secretKeys = Object.keys(fingerprints).sort();

  return {
    id: record.id,
    provider: record.provider as ServiceConfigProvider,
    displayName: record.displayName,
    isEnabled: record.isEnabled,
    metadata: asRecord(record.metadata),
    secrets: Object.fromEntries(
      secretKeys.map((key) => [
        key,
        {
          configured: true,
          maskedValue: maskSecretLabel(fingerprints[key]),
        },
      ]),
    ),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function emptyConfiguration(provider: ServiceConfigProvider): MaskedServiceConfiguration {
  return {
    id: null,
    provider,
    displayName: SERVICE_CONFIG_LABELS[provider],
    isEnabled: false,
    metadata: {},
    secrets: {},
    createdAt: null,
    updatedAt: null,
  };
}

function logConfigurationAttempt(input: {
  action: "list" | "upsert";
  provider?: ServiceConfigProvider;
  actorUserId?: string;
  success: boolean;
  errorCode?: string;
}) {
  console.info(
    JSON.stringify({
      level: "info",
      event: "service_configuration_attempt",
      action: input.action,
      provider: input.provider,
      actorUserId: input.actorUserId,
      success: input.success,
      errorCode: input.errorCode,
      timestamp: new Date().toISOString(),
    }),
  );
}

export class AppConfigService {
  async listServiceConfigurations(actorUserId?: string): Promise<MaskedServiceConfiguration[]> {
    try {
      const records = (await prisma.serviceConfiguration.findMany({ orderBy: { provider: "asc" } })) as ServiceConfigRecord[];
      const recordByProvider = new Map(records.map((record) => [record.provider, record]));

      logConfigurationAttempt({ action: "list", actorUserId, success: true });

      return SERVICE_CONFIG_PROVIDERS.map((provider) => {
        const record = recordByProvider.get(provider);
        return record ? maskConfiguration(record) : emptyConfiguration(provider);
      });
    } catch (error) {
      logConfigurationAttempt({ action: "list", actorUserId, success: false, errorCode: "SERVICE_CONFIG_LIST_FAILED" });
      throw error;
    }
  }

  async upsertServiceConfiguration(
    rawInput: unknown,
    actorUserId?: string,
  ): Promise<MaskedServiceConfiguration> {
    const parsed = serviceConfigUpsertSchema.safeParse(rawInput);
    const provider = typeof rawInput === "object" && rawInput && "provider" in rawInput
      ? (rawInput.provider as ServiceConfigProvider)
      : undefined;

    if (!parsed.success) {
      logConfigurationAttempt({ action: "upsert", provider, actorUserId, success: false, errorCode: "VALIDATION_ERROR" });
      throw new AppError("VALIDATION_ERROR", 400, "Invalid service configuration", parsed.error.flatten(), false);
    }

    try {
      const result = await prisma.$transaction(async (tx: typeof prisma) => {
        const existing = await tx.serviceConfiguration.findUnique({ where: { provider: parsed.data.provider } });
        const encryptedSecrets = buildEncryptedSecrets(parsed.data, existing?.encryptedSecrets ?? null);
        const secretFingerprints = buildSecretFingerprints(parsed.data, existing?.secretFingerprints ?? null);

        if (parsed.data.isEnabled && Object.keys(secretFingerprints).length === 0) {
          throw new AppError("SERVICE_CONFIG_SECRETS_REQUIRED", 400, "At least one secret is required before enabling this service");
        }

        const record = await tx.serviceConfiguration.upsert({
          where: { provider: parsed.data.provider },
          create: {
            provider: parsed.data.provider,
            displayName: parsed.data.displayName ?? SERVICE_CONFIG_LABELS[parsed.data.provider],
            isEnabled: parsed.data.isEnabled,
            metadata: parsed.data.metadata,
            encryptedSecrets: encryptedSecrets,
            secretFingerprints: secretFingerprints,
            createdBy: actorUserId,
            updatedBy: actorUserId,
          },
          update: {
            displayName: parsed.data.displayName ?? SERVICE_CONFIG_LABELS[parsed.data.provider],
            isEnabled: parsed.data.isEnabled,
            metadata: parsed.data.metadata,
            encryptedSecrets: encryptedSecrets,
            secretFingerprints: secretFingerprints,
            updatedBy: actorUserId,
          },
        });

        await tx.serviceConfigurationAudit.create({
          data: {
            serviceConfigurationId: record.id,
            provider: parsed.data.provider,
            action: "UPSERT",
            actorUserId,
            success: true,
          },
        });

        return record;
      });

      logConfigurationAttempt({ action: "upsert", provider: parsed.data.provider, actorUserId, success: true });
      return maskConfiguration(result);
    } catch (error) {
      logConfigurationAttempt({
        action: "upsert",
        provider: parsed.data.provider,
        actorUserId,
        success: false,
        errorCode: error instanceof Error ? error.name : "SERVICE_CONFIG_UPSERT_FAILED",
      });
      throw error;
    }
  }
}

function buildEncryptedSecrets(input: ServiceConfigUpsertInput, existing: JsonValue | null): StoredEncryptedSecrets {
  const current = asRecord(existing) as StoredEncryptedSecrets;

  return {
    ...current,
    ...Object.fromEntries(Object.entries(input.secrets).map(([key, value]) => [key, encryptSecret(value)])),
  };
}

function buildSecretFingerprints(input: ServiceConfigUpsertInput, existing: JsonValue | null): StoredFingerprints {
  const current = asFingerprints(existing);

  return {
    ...current,
    ...Object.fromEntries(Object.entries(input.secrets).map(([key, value]) => [key, fingerprintSecret(value)])),
  };
}
