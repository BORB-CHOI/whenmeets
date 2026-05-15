/**
 * Best-effort in-memory rate limiter.
 *
 * Implements a sliding-window counter per (route, key) pair. Memory is
 * per-isolate, so on Vercel/serverless deployments this only defends within
 * a single warm function instance — it does NOT provide distributed limits.
 * For production-grade throttling, swap to Upstash Redis or Vercel KV via
 * @upstash/ratelimit.
 *
 * Goals:
 * - Blunt obvious abuse (rapid form spam, password brute force from one IP).
 * - Cheap, dependency-free, safe to run on the Edge runtime.
 */

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();
let lastSweep = 0;
const SWEEP_INTERVAL_MS = 60_000;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, win] of buckets) {
    if (win.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

export function rateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const win: Window = { count: 1, resetAt: now + windowMs };
    buckets.set(key, win);
    return { allowed: true, remaining: limit - 1, resetAt: win.resetAt, limit };
  }

  existing.count += 1;
  const allowed = existing.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    limit,
  };
}
