import { z } from 'zod';

const NODE_ENV_VALUES = ['development', 'test', 'production'] as const;

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default('http://localhost:3000'),
});

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(NODE_ENV_VALUES).default('development'),
  DATABASE_URL: z.url().optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  EMAIL_FROM: z.email().optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
});

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

function assertRequiredInProduction(env: z.infer<typeof serverEnvSchema>): void {
  if (env.NODE_ENV !== 'production') {
    return;
  }

  const requiredInProduction: Array<keyof Omit<typeof env, 'NODE_ENV'>> = [
    'DATABASE_URL',
    'AUTH_SECRET',
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
