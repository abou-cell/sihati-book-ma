import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppConfigService } from "@/lib/services/app-config.service";
import { AppError } from "@/lib/security/errors";

type StoredConfig = {
  id: string;
  provider: "STRIPE" | "SMTP";
  isEnabled: boolean;
  displayName: string;
  metadata: Record<string, unknown>;
  encryptedSecrets: Record<string, unknown> | null;
  secretPreview: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  updatedByUserId: string | null;
};

function createDb(initial: StoredConfig[] = []) {
  const records = new Map(initial.map((record) => [record.provider, record]));

  return {
    serviceConfiguration: {
      findMany: vi.fn(async () => [...records.values()].sort((a, b) => a.provider.localeCompare(b.provider))),
      findUnique: vi.fn(async ({ where }: { where: { provider: StoredConfig["provider"] } }) => records.get(where.provider) ?? null),
      upsert: vi.fn(async ({ where, update, create }) => {
        const existing = records.get(where.provider);
        const next = {
          ...(existing ?? {
            id: `cfg_${where.provider.toLowerCase()}`,
            createdAt: new Date("2026-05-01T00:00:00.000Z"),
          }),
          ...(existing ? update : create),
          updatedAt: new Date("2026-05-02T00:00:00.000Z"),
        } as StoredConfig;
        records.set(where.provider, next);
        return next;
      }),
      update: vi.fn(async ({ where, data }) => {
        const existing = records.get(where.provider);
        if (!existing) throw new Error("missing fixture");
        const next = { ...existing, ...data, updatedAt: new Date("2026-05-03T00:00:00.000Z") };
        records.set(where.provider, next);
        return next;
      }),
    },
  };
}

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);
});

describe("AppConfigService", () => {
  it("lists safe service configurations without returning encrypted secret payloads", async () => {
    const service = new AppConfigService(
      createDb([
        {
          id: "cfg_1",
          provider: "STRIPE",
          isEnabled: false,
          displayName: "Stripe",
          metadata: { mode: "test" },
          encryptedSecrets: { ciphertext: "hidden" },
          secretPreview: { apiKey: "sk_t••••1234" },
          createdAt: new Date("2026-05-01T00:00:00.000Z"),
          updatedAt: new Date("2026-05-02T00:00:00.000Z"),
          updatedByUserId: "admin_1",
        },
      ]) as never,
    );

    await expect(service.listServiceConfigurations()).resolves.toEqual([
      expect.objectContaining({
        provider: "STRIPE",
        secrets: { apiKey: "sk_t••••1234" },
        hasEncryptedSecrets: true,
        updatedAt: "2026-05-02T00:00:00.000Z",
      }),
    ]);
  });

  it("validates provider-specific metadata before persisting", async () => {
    const service = new AppConfigService(createDb() as never);

    await expect(
      service.upsertServiceConfiguration(
        {
          provider: "SMTP",
          displayName: "SMTP",
          isEnabled: true,
          metadata: { port: 70_000 },
        },
        "admin_1",
      ),
    ).rejects.toThrow(/Too big|expected number/);
  });

  it("returns a safe not-found error when toggling a missing provider", async () => {
    const service = new AppConfigService(createDb() as never);

    await expect(service.toggleServiceConfiguration({ provider: "STRIPE", isEnabled: true }, "admin_1")).rejects.toMatchObject({
      code: "SERVICE_CONFIG_NOT_FOUND",
      status: 404,
    } satisfies Partial<AppError>);
  });
});
