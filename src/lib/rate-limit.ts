export interface RateLimitRule {
  name: string;
  limit: number;
  windowMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

const buckets = new Map<string, Bucket>();
let lastCleanupAt = 0;

function cleanupExpiredBuckets(now: number) {
  if (now - lastCleanupAt < 60_000) return;
  lastCleanupAt = now;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function incrementBucket(key: string, now: number, windowMs: number) {
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, bucket);
    return bucket;
  }

  existing.count += 1;
  return existing;
}

export function checkRateLimit(identity: string, rules: RateLimitRule[]): RateLimitResult {
  const now = Date.now();
  cleanupExpiredBuckets(now);

  let retryAfterSeconds = 0;

  for (const rule of rules) {
    const bucket = incrementBucket(`${rule.name}:${identity}`, now, rule.windowMs);
    if (bucket.count > rule.limit) {
      retryAfterSeconds = Math.max(retryAfterSeconds, Math.ceil((bucket.resetAt - now) / 1000));
    }
  }

  return {
    allowed: retryAfterSeconds === 0,
    retryAfterSeconds,
  };
}
