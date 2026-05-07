import { z } from "zod";

export const SERVICE_CONFIG_PROVIDERS = [
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

export type ServiceConfigProvider = (typeof SERVICE_CONFIG_PROVIDERS)[number];

export const SERVICE_CONFIG_LABELS: Record<ServiceConfigProvider, string> = {
  STRIPE: "Stripe",
  CLOUDFLARE_STREAM_WEBRTC: "Cloudflare Stream / WebRTC",
  FIREBASE: "Firebase",
  SMTP: "SMTP",
  SMS_PROVIDER: "SMS provider",
  PUSH_NOTIFICATIONS: "Push notifications",
  CLOUD_STORAGE: "Cloud storage",
  GOOGLE_OAUTH: "Google OAuth",
  FACEBOOK_OAUTH: "Facebook OAuth",
};

const jsonPrimitiveSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
type JsonValue = z.infer<typeof jsonPrimitiveSchema> | { [key: string]: JsonValue } | JsonValue[];
const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([jsonPrimitiveSchema, z.array(jsonValueSchema), z.record(z.string(), jsonValueSchema)]),
);

const metadataSchema = z.record(z.string().min(1).max(80), jsonValueSchema).default({});
const secretsSchema = z.record(z.string().min(1).max(80), z.string().trim().min(1).max(20_000)).default({});

export const serviceConfigProviderSchema = z.enum(SERVICE_CONFIG_PROVIDERS);

export const serviceConfigUpsertSchema = z
  .object({
    provider: serviceConfigProviderSchema,
    displayName: z.string().trim().min(1).max(120).optional(),
    isEnabled: z.boolean().default(false),
    metadata: metadataSchema,
    secrets: secretsSchema,
  })
  .superRefine((value, context) => {
    validateProviderStructure(value.provider, value.metadata, value.secrets, context);
  });

export type ServiceConfigUpsertInput = z.infer<typeof serviceConfigUpsertSchema>;

function metadataString(metadata: Record<string, JsonValue>, key: string): string | undefined {
  const value = metadata[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function requireMetadataString(
  metadata: Record<string, JsonValue>,
  key: string,
  context: z.RefinementCtx,
  message = `${key} is required`,
) {
  if (!metadataString(metadata, key)) {
    context.addIssue({ code: "custom", path: ["metadata", key], message });
  }
}

function validateProviderStructure(
  provider: ServiceConfigProvider,
  metadata: Record<string, JsonValue>,
  secrets: Record<string, string>,
  context: z.RefinementCtx,
) {
  switch (provider) {
    case "STRIPE":
      break;
    case "CLOUDFLARE_STREAM_WEBRTC":
      requireMetadataString(metadata, "accountId", context);
      break;
    case "FIREBASE":
      requireMetadataString(metadata, "projectId", context);
      break;
    case "SMTP":
      requireMetadataString(metadata, "host", context);
      requireMetadataString(metadata, "from", context);
      break;
    case "SMS_PROVIDER":
      requireMetadataString(metadata, "providerName", context);
      break;
    case "PUSH_NOTIFICATIONS":
      requireMetadataString(metadata, "providerName", context);
      break;
    case "CLOUD_STORAGE":
      requireMetadataString(metadata, "providerName", context);
      requireMetadataString(metadata, "bucket", context);
      break;
    case "GOOGLE_OAUTH":
    case "FACEBOOK_OAUTH":
      requireMetadataString(metadata, "clientId", context);
      break;
  }
}

export function sanitizeValidationError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}
