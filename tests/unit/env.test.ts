import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env } as NodeJS.ProcessEnv;
const VALID_APP_ENCRYPTION_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

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

  it('fails safely when APP_ENCRYPTION_KEY is missing in production runtime', async () => {
    resetProcessEnv({
      NODE_ENV: 'production',
      NEXT_PHASE: undefined,
      NEXT_PUBLIC_APP_URL: 'https://sihati.example',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/sihati',
      AUTH_SECRET: 'a'.repeat(32),
      APP_ENCRYPTION_KEY: undefined,
      STRIPE_SECRET_KEY: 'sk_live_example',
      STRIPE_WEBHOOK_SECRET: 'whsec_example',
      EMAIL_FROM: 'noreply@sihati.example',
      RESEND_API_KEY: 're_example',
      RATE_LIMIT_REDIS_REST_URL: 'https://redis.example.com',
      RATE_LIMIT_REDIS_REST_TOKEN: 'redis-token',
    });

    await expect(importEnvModule()).rejects.toThrow(
      'Missing required production environment variables: APP_ENCRYPTION_KEY',
    );
  });

  it('does not enforce APP_ENCRYPTION_KEY during the Next.js static production build phase', async () => {
    resetProcessEnv({
      NODE_ENV: 'production',
      NEXT_PHASE: 'phase-production-build',
      NEXT_PUBLIC_APP_URL: 'https://sihati.example',
      APP_ENCRYPTION_KEY: undefined,
    });

    await expect(importEnvModule()).resolves.toMatchObject({
      serverEnv: expect.objectContaining({ NODE_ENV: 'production' }),
    });
  });

  it('accepts a base64-encoded 32-byte APP_ENCRYPTION_KEY in production runtime', async () => {
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
    });

    await expect(importEnvModule()).resolves.toMatchObject({
      serverEnv: expect.objectContaining({
        APP_ENCRYPTION_KEY: VALID_APP_ENCRYPTION_KEY,
      }),
    });
  });
});
