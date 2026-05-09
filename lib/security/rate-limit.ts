import { createHash } from "node:crypto";

import { AppError } from "@/lib/security/errors";

export type RateLimitPolicy = {
  scope: string;
  limit: number;
  windowMs: number;
};

export type RateLimitInput = RateLimitPolicy & {
  request: Request;
  userId?: string;
};

type Bucket = { count: number; resetAt: number };
type RateLimitCheck = { allowed: boolean; remaining: number; resetAt: number; retryAfterSeconds?: number };

type RateLimitAdapter = {
  check(input: { key: string; limit: number; windowMs: number; now: number }): Promise<RateLimitCheck>;
  reset?(): void;
};

const buckets = new Map<string, Bucket>();

const REDIS_URL_ENV_KEYS = ["RATE_LIMIT_REDIS_REST_URL", "UPSTASH_REDIS_REST_URL"] as const;
const REDIS_TOKEN_ENV_KEYS = ["RATE_LIMIT_REDIS_REST_TOKEN", "UPSTASH_REDIS_REST_TOKEN"] as const;

export const rateLimitPolicies = {
  strict: { limit: 10, windowMs: 60_000 },
  appointmentCreate: { limit: 10, windowMs: 60_000 },
  adminMutation: { limit: 20, windowMs: 60_000 },
  publicSearch: { limit: 120, windowMs: 60_000 },
  providerCheckout: { limit: 30, windowMs: 60_000 },
  providerWebhook: { limit: 120, windowMs: 60_000 },
} as const;

function cleanupExpiredBuckets(now: number): void {
  if (buckets.size < 1_000) return;

  for (const [key, bucket] of buckets.entries()) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

function buildInMemoryAdapter(): RateLimitAdapter {
  return {
    async check(input) {
      cleanupExpiredBuckets(input.now);
      const existing = buckets.get(input.key);

      if (!existing || input.now > existing.resetAt) {
        const resetAt = input.now + input.windowMs;
        buckets.set(input.key, { count: 1, resetAt });
        return { allowed: true, remaining: input.limit - 1, resetAt };
      }

      if (existing.count >= input.limit) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: existing.resetAt,
          retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - input.now) / 1000)),
        };
      }

      existing.count += 1;
      buckets.set(input.key, existing);
      return { allowed: true, remaining: input.limit - existing.count, resetAt: existing.resetAt };
    },
    reset() {
      buckets.clear();
    },
  };
}

function getConfiguredValue(keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }

  return undefined;
}

function normalizeRedisRestUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function parseRedisPipelineNumberResponse(payload: unknown, index: number): number | null {
  if (!Array.isArray(payload)) return null;
  const item = payload[index];
  if (!item || typeof item !== "object") return null;
  const result = (item as { result?: unknown }).result;
  if (typeof result === "number") return result;
  if (typeof result === "string" && result.trim()) return Number(result);
  return null;
}

function buildRedisRestAdapter(config: { url: string; token: string }): RateLimitAdapter {
  const pipelineUrl = `${normalizeRedisRestUrl(config.url)}/pipeline`;

  return {
    async check(input) {
      const ttlSeconds = Math.max(1, Math.ceil(input.windowMs / 1000));
      const response = await fetch(pipelineUrl, {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", input.key],
          ["EXPIRE", input.key, ttlSeconds, "NX"],
          ["TTL", input.key],
        ]),
      });

      if (!response.ok) {
        throw new AppError("RATE_LIMIT_UNAVAILABLE", 503, "Rate limiting is temporarily unavailable.", undefined, false);
      }

      const payload: unknown = await response.json();
      const count = parseRedisPipelineNumberResponse(payload, 0);
      const ttl = parseRedisPipelineNumberResponse(payload, 2);

      if (!Number.isFinite(count) || count === null || !Number.isFinite(ttl) || ttl === null) {
        throw new AppError("RATE_LIMIT_UNAVAILABLE", 503, "Rate limiting is temporarily unavailable.", undefined, false);
      }

      const resetAt = input.now + Math.max(1, ttl) * 1000;
      if (count > input.limit) {
        return {
          allowed: false,
          remaining: 0,
          resetAt,
          retryAfterSeconds: Math.max(1, Math.ceil((resetAt - input.now) / 1000)),
        };
      }

      return { allowed: true, remaining: Math.max(0, input.limit - count), resetAt };
    },
  };
}

function createAdapter(): RateLimitAdapter {
  const redisUrl = getConfiguredValue(REDIS_URL_ENV_KEYS);
  const redisToken = getConfiguredValue(REDIS_TOKEN_ENV_KEYS);

  if (redisUrl && redisToken) {
    return buildRedisRestAdapter({ url: redisUrl, token: redisToken });
  }

  if (process.env.NODE_ENV === "production") {
    throw new AppError(
      "RATE_LIMIT_NOT_CONFIGURED",
      503,
      "Shared rate limiting is required in production but is not configured.",
      undefined,
      false,
    );
  }

  return buildInMemoryAdapter();
}

function getAdapter(): RateLimitAdapter {
  return createAdapter();
}

function safeKeyPart(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "unknown";
}

export function buildRateLimitKey(scope: string, request: Request, userId?: string): string {
  const actor = userId?.trim() ? `user:${safeKeyPart(userId)}` : "anonymous";
  return `rate-limit:${scope}:${actor}:ip:${safeKeyPart(getClientIp(request))}`;
}

export async function enforceRateLimit(input: RateLimitInput): Promise<void> {
  const result = await getAdapter().check({
    key: buildRateLimitKey(input.scope, input.request, input.userId),
    limit: input.limit,
    windowMs: input.windowMs,
    now: Date.now(),
  });

  if (!result.allowed) {
    throw new AppError("RATE_LIMITED", 429, "Too many requests. Please retry later.", {
      retryAfterSeconds: result.retryAfterSeconds ?? Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)),
    }, false);
  }
}

export function resetRateLimitForTests(): void {
  if (process.env.NODE_ENV === "production") return;
  buildInMemoryAdapter().reset?.();
}
