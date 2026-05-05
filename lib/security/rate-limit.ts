import { AppError } from "@/lib/security/errors";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function enforceRateLimit(input: { key: string; limit: number; windowMs: number }) {
  const now = Date.now();
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
