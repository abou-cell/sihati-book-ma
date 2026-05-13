import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env } as NodeJS.ProcessEnv;
const VALID_APP_ENCRYPTION_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

const EMPTY_OPTIONAL_ENV_OVERRIDES = {
  DATABASE_URL: '',
  AUTH_SECRET: '',
  APP_ENCRYPTION_KEY: '',
  STRIPE_SECRET_KEY: '',
  STRIPE_WEBHOOK_SECRET: '',
  EMAIL_FROM: '',
  RESEND_API_KEY: '',
  RATE_LIMIT_REDIS_REST_URL: '',
  RATE_LIMIT_REDIS_REST_TOKEN: '',
  UPSTASH_REDIS_REST_URL: '',
  UPSTASH_REDIS_REST_TOKEN: '',
  MEDICAL_DOCUMENTS_STORAGE_BASE_URL: '',
  MEDICAL_DOCUMENTS_SIGNING_SECRET: '',
} satisfies Partial<NodeJS.ProcessEnv>;

function resetProcessEnv(overrides: Partial<NodeJS.ProcessEnv> = {}) {
  process.env = { ...ORIGINAL_ENV, ...overrides } as NodeJS.ProcessEnv;
}

async function importEnvModule() {
  vi.resetModules();
  return import('@/lib/env');
}

describe('environment validation', () => {
  afterEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV } as NodeJS.ProcessEnv;
  });

  it('treats empty optional server environment variables as unset outside production runtime', async () => {
    resetProcessEnv({
      NODE_ENV: 'test',
      NEXT_PUBLIC_APP_URL: 'https://sihati.example',
      ...EMPTY_OPTIONAL_ENV_OVERRIDES,
    });

    await expect(importEnvModule()).resolves.toMatchObject({
      serverEnv: expect.objectContaining({
        NODE_ENV: 'test',
        DATABASE_URL: undefined,
        STRIPE_SECRET_KEY: undefined,
        STRIPE_WEBHOOK_SECRET: undefined,
        RATE_LIMIT_REDIS_REST_URL: undefined,
        RATE_LIMIT_REDIS_REST_TOKEN: undefined,
        UPSTASH_REDIS_REST_URL: undefined,
        UPSTASH_REDIS_REST_TOKEN: undefined,
      }),
    });
  });

  it('fails safely when required production runtime variables are missing or empty', async () => {
    resetProcessEnv({
      NODE_ENV: 'production',
      NEXT_PHASE: undefined,
      NEXT_PUBLIC_APP_URL: 'https://sihati.example',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/sihati',
      AUTH_SECRET: 'a'.repeat(32),
      APP_ENCRYPTION_KEY: '',
      STRIPE_SECRET_KEY: 'sk_live_example',
      STRIPE_WEBHOOK_SECRET: 'whsec_example',
      EMAIL_FROM: 'noreply@sihati.example',
      RESEND_API_KEY: 're_example',
      RATE_LIMIT_REDIS_REST_URL: 'https://redis.example.com',
      RATE_LIMIT_REDIS_REST_TOKEN: 'redis-token',
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
      MEDICAL_DOCUMENTS_SIGNING_SECRET: '',
    });

    await expect(importEnvModule()).rejects.toThrow(
      'Missing required production environment variables: APP_ENCRYPTION_KEY, MEDICAL_DOCUMENTS_SIGNING_SECRET',
    );
  });

  it('does not enforce APP_ENCRYPTION_KEY during the Next.js static production build phase', async () => {
    resetProcessEnv({
      NODE_ENV: 'production',
      NEXT_PHASE: 'phase-production-build',
      NEXT_PUBLIC_APP_URL: 'https://sihati.example',
      ...EMPTY_OPTIONAL_ENV_OVERRIDES,
    });

    await expect(importEnvModule()).resolves.toMatchObject({
      serverEnv: expect.objectContaining({ NODE_ENV: 'production' }),
    });
  });

  it('accepts valid production placeholders in production runtime', async () => {
    resetProcessEnv({
      NODE_ENV: 'production',
      NEXT_PHASE: undefined,
      NEXT_PUBLIC_APP_URL: 'https://sihati.example',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/sihati',
      AUTH_SECRET: 'a'.repeat(32),
      APP_ENCRYPTION_KEY: VALID_APP_ENCRYPTION_KEY,
      STRIPE_SECRET_KEY: 'sk_live_example',
      STRIPE_WEBHOOK_SECRET: 'whsec_example',
      EMAIL_FROM: 'noreply@sihati.example',
      RESEND_API_KEY: 're_example',
      RATE_LIMIT_REDIS_REST_URL: 'https://redis.example.com',
      RATE_LIMIT_REDIS_REST_TOKEN: 'redis-token',
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
      MEDICAL_DOCUMENTS_SIGNING_SECRET: 'medical-documents-signing-secret-32',
    });

    await expect(importEnvModule()).resolves.toMatchObject({
      serverEnv: expect.objectContaining({
        APP_ENCRYPTION_KEY: VALID_APP_ENCRYPTION_KEY,
      }),
    });
  });
});
