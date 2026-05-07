import { z } from "zod";

export const SERVICE_PROVIDERS = [
  "STRIPE",
  "CLOUDFLARE_STREAM_WEBRTC",
  "FIREBASE",
  "SMTP",
  "SMS_PROVIDER",
  "PUSH_NOTIFICATIONS",
  "CLOUD_STORAGE",
  "GOOGLE_OAUTH",
  "FACEBOOK_OAUTH",
] as const;

export type ServiceProvider = (typeof SERVICE_PROVIDERS)[number];

export const serviceProviderSchema = z.enum(SERVICE_PROVIDERS);

const jsonPrimitiveSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export const metadataSchema = z.record(z.string().min(1).max(64), jsonPrimitiveSchema).default({});

const secretBagSchema = z
  .record(z.string().min(1).max(64), z.string().min(1).max(10_000))
  .default({});

const providerMetadataRules: Record<ServiceProvider, z.ZodType> = {
  STRIPE: z.object({ mode: z.enum(["test", "live"]).optional(), webhookPath: z.string().max(200).optional() }).passthrough(),
  CLOUDFLARE_STREAM_WEBRTC: z.object({ accountId: z.string().max(200).optional() }).passthrough(),
  FIREBASE: z.object({ projectId: z.string().max(200).optional(), authDomain: z.string().max(200).optional() }).passthrough(),
  SMTP: z.object({ host: z.string().max(200).optional(), port: z.number().int().min(1).max(65535).optional(), from: z.email().optional() }).passthrough(),
  SMS_PROVIDER: z.object({ providerName: z.string().max(100).optional(), senderId: z.string().max(50).optional() }).passthrough(),
  PUSH_NOTIFICATIONS: z.object({ providerName: z.string().max(100).optional(), appId: z.string().max(200).optional() }).passthrough(),
  CLOUD_STORAGE: z.object({ providerName: z.string().max(100).optional(), bucket: z.string().max(200).optional(), region: z.string().max(100).optional() }).passthrough(),
  GOOGLE_OAUTH: z.object({ clientId: z.string().max(300).optional(), redirectUri: z.url().optional() }).passthrough(),
  FACEBOOK_OAUTH: z.object({ appId: z.string().max(300).optional(), redirectUri: z.url().optional() }).passthrough(),
};

export const upsertServiceConfigSchema = z
  .object({
    provider: serviceProviderSchema,
    displayName: z.string().trim().min(2).max(100),
    isEnabled: z.boolean().default(false),
    metadata: metadataSchema,
    secrets: secretBagSchema.optional(),
  })
  .superRefine((value, context) => {
    const result = providerMetadataRules[value.provider].safeParse(value.metadata);
    if (!result.success) {
      for (const issue of result.error.issues) {
        context.addIssue({ ...issue, path: ["metadata", ...issue.path] });
      }
    }
  });

export const toggleServiceConfigSchema = z.object({
  provider: serviceProviderSchema,
  isEnabled: z.boolean(),
});

export type UpsertServiceConfigInput = z.infer<typeof upsertServiceConfigSchema>;
export type ToggleServiceConfigInput = z.infer<typeof toggleServiceConfigSchema>;
