import { AppError } from "@/lib/security/errors";

type Bucket = { count: number; resetAt: number };

type RateLimitInput = { key: string; limit: number; windowMs: number };

const buckets = new Map<string, Bucket>();

function cleanupExpiredBuckets(now: number): void {
  if (buckets.size < 1_000) return;

  for (const [key, bucket] of buckets.entries()) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "unknown";
}

export function buildRateLimitKey(scope: string, request: Request, userId?: string): string {
  return `${scope}:${userId ?? "anonymous"}:${getClientIp(request)}`;
}

export function enforceRateLimit(input: RateLimitInput) {
  const now = Date.now();
  cleanupExpiredBuckets(now);
  const existing = buckets.get(input.key);

  if (!existing || now > existing.resetAt) {
    buckets.set(input.key, { count: 1, resetAt: now + input.windowMs });
    return;
  }

  if (existing.count >= input.limit) {
    throw new AppError("RATE_LIMITED", 429, "Too many requests. Please retry later.", {
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    });
  }

  existing.count += 1;
  buckets.set(input.key, existing);
}

export function resetRateLimitForTests(): void {
  if (process.env.NODE_ENV === "production") return;
  buckets.clear();
}
