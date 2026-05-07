import { z } from 'zod';

const NODE_ENV_VALUES = ['development', 'test', 'production'] as const;
const NEXT_PRODUCTION_BUILD_PHASE = 'phase-production-build';
const APP_ENCRYPTION_KEY_BYTES = 32;

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default('http://localhost:3000'),
});

function isBase64EncodedKeyWithMinimumBytes(value: string): boolean {
  try {
    const decoded = Buffer.from(value, 'base64');
    return (
      decoded.length >= APP_ENCRYPTION_KEY_BYTES &&
      decoded.toString('base64') === value
    );
  } catch {
    return false;
  }
}

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(NODE_ENV_VALUES).default('development'),
  DATABASE_URL: z.url().optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  APP_ENCRYPTION_KEY: z
    .string()
    .refine(isBase64EncodedKeyWithMinimumBytes, {
      message: `Must be a base64-encoded key with at least ${APP_ENCRYPTION_KEY_BYTES} random bytes. Generate with: openssl rand -base64 ${APP_ENCRYPTION_KEY_BYTES}`,
    })
    .optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  EMAIL_FROM: z.email().optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
});

type ParsedServerEnv = z.infer<typeof serverEnvSchema>;
type ServerEnvKey = Exclude<keyof ParsedServerEnv, 'NODE_ENV'>;

function formatIssues(issues: z.ZodIssue[]): string {
  return issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'env';
      return `- ${path}: ${issue.message}`;
    })
    .join('\n');
}

function parsePublicEnv(input: NodeJS.ProcessEnv) {
  const parsed = publicEnvSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(
      `Invalid public environment variables:\n${formatIssues(parsed.error.issues)}`,
    );
  }

  return parsed.data;
}

function parseServerEnv(input: NodeJS.ProcessEnv) {
  const parsed = serverEnvSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables:\n${formatIssues(parsed.error.issues)}`,
    );
  }

  return parsed.data;
}

function isStaticBuildStep(input: NodeJS.ProcessEnv): boolean {
  return input.NEXT_PHASE === NEXT_PRODUCTION_BUILD_PHASE;
}

function assertRequiredInProduction(
  env: ParsedServerEnv,
  input: NodeJS.ProcessEnv = process.env,
): void {
  if (env.NODE_ENV !== 'production' || isStaticBuildStep(input)) {
    return;
  }

  const requiredInProduction: ServerEnvKey[] = [
    'DATABASE_URL',
    'AUTH_SECRET',
    'APP_ENCRYPTION_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'EMAIL_FROM',
    'RESEND_API_KEY',
  ];

  const missing = requiredInProduction.filter((key) => {
    const value = env[key];
    return value === undefined || value === '';
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missing.join(', ')}`,
    );
  }
}

const parsedPublicEnv = parsePublicEnv(process.env);
const parsedServerEnv = parseServerEnv(process.env);

assertRequiredInProduction(parsedServerEnv);

export const publicEnv = parsedPublicEnv;

export const serverEnv = parsedServerEnv;

export const env = {
  ...publicEnv,
  ...serverEnv,
} as const;

export type PublicEnv = typeof publicEnv;
export type ServerEnv = typeof serverEnv;
