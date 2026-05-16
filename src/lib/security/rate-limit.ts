import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Public-endpoint rate limiting.
 *
 * In production: backed by Upstash Redis (sliding window). Set
 *   UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 * in your env to enable.
 *
 * In dev (or anywhere those env vars are missing): falls back to a
 * process-local in-memory fixed-window limiter so local testing still works
 * without standing up Redis. The in-memory map resets between dev-server
 * restarts; that's fine for local dev but is NOT safe for production
 * (multiple serverless instances each have their own bucket).
 */

export interface LimitResult {
  ok: boolean;
  /** Total budget in the window. */
  limit: number;
  /** How many requests are still allowed in the current window. */
  remaining: number;
  /** Unix-ms when the bucket / window resets. */
  reset: number;
  /** True when answered from the in-memory fallback. */
  fallback: boolean;
}

interface LimiterOptions {
  /** Max requests per window. */
  max: number;
  /** Window size in ms. */
  windowMs: number;
  /** Namespace key, included in the bucket id, for separate budgets per route. */
  prefix: string;
}

const PUBLIC_INTAKE_OPTS: LimiterOptions = {
  max: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
  prefix: "btm:public-intake",
};

// ─── Upstash limiter (lazy) ──────────────────────────────────────────────────

let upstashRatelimit: Ratelimit | null | undefined;

function getUpstashLimiter(opts: LimiterOptions): Ratelimit | null {
  if (upstashRatelimit !== undefined) return upstashRatelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    upstashRatelimit = null;
    return null;
  }

  try {
    const redis = new Redis({ url, token });
    upstashRatelimit = new Ratelimit({
      redis,
      // Sliding window matches the user-facing semantics ("10 per hour")
      // better than a fixed window.
      limiter: Ratelimit.slidingWindow(opts.max, `${Math.round(opts.windowMs / 1000)} s`),
      analytics: true,
      prefix: opts.prefix,
    });
    return upstashRatelimit;
  } catch (e) {
    console.error("[rate-limit] Upstash init failed, falling back to memory", e);
    upstashRatelimit = null;
    return null;
  }
}

// ─── In-memory fallback ──────────────────────────────────────────────────────

interface Bucket {
  count: number;
  resetAt: number;
}

const memoryBuckets = new Map<string, Bucket>();

function memoryLimit(key: string, opts: LimiterOptions): LimitResult {
  const now = Date.now();
  const existing = memoryBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const fresh: Bucket = { count: 1, resetAt: now + opts.windowMs };
    memoryBuckets.set(key, fresh);
    return {
      ok: true,
      limit: opts.max,
      remaining: opts.max - 1,
      reset: fresh.resetAt,
      fallback: true,
    };
  }
  if (existing.count >= opts.max) {
    return {
      ok: false,
      limit: opts.max,
      remaining: 0,
      reset: existing.resetAt,
      fallback: true,
    };
  }
  existing.count += 1;
  return {
    ok: true,
    limit: opts.max,
    remaining: Math.max(0, opts.max - existing.count),
    reset: existing.resetAt,
    fallback: true,
  };
}

// Periodic memory bucket cleanup so we don't accumulate forever in long-running
// servers. Cheap: O(n) over expired keys at most every 5 minutes.
let lastSweepAt = 0;
function sweepMemoryBuckets() {
  const now = Date.now();
  if (now - lastSweepAt < 5 * 60 * 1000) return;
  lastSweepAt = now;
  for (const [k, v] of memoryBuckets.entries()) {
    if (v.resetAt <= now) memoryBuckets.delete(k);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Apply the public-intake rate limit (10 req / hour / IP by default).
 * Pass a stable identifier — usually the client IP.
 */
export async function limitPublicIntake(identifier: string): Promise<LimitResult> {
  return runLimiter(identifier, PUBLIC_INTAKE_OPTS);
}

async function runLimiter(
  identifier: string,
  opts: LimiterOptions
): Promise<LimitResult> {
  const safeId = identifier?.trim() || "anonymous";
  const upstash = getUpstashLimiter(opts);

  if (upstash) {
    try {
      const r = await upstash.limit(safeId);
      return {
        ok: r.success,
        limit: r.limit,
        remaining: r.remaining,
        reset: r.reset,
        fallback: false,
      };
    } catch (e) {
      // If Upstash transiently fails, fall back to memory rather than
      // breaking the public form for legit users.
      console.error("[rate-limit] Upstash limit() failed, falling back to memory", e);
    }
  }

  sweepMemoryBuckets();
  return memoryLimit(`${opts.prefix}:${safeId}`, opts);
}

/**
 * Pull the best-effort client IP out of an incoming request. Order:
 *   1) `x-forwarded-for` (first hop) — set by Vercel / Cloudflare / any proxy
 *   2) `x-real-ip`                   — set by some reverse proxies
 *   3) "anonymous"                   — no usable header
 */
export function clientIpFromRequest(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp?.trim()) return xRealIp.trim();
  return "anonymous";
}

/**
 * Build the standard rate-limit response headers from a LimitResult.
 * Useful when returning a 429 so clients know when to retry.
 */
export function rateLimitHeaders(result: LimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(Math.max(0, result.remaining)),
    "X-RateLimit-Reset": String(Math.floor(result.reset / 1000)),
  };
  if (!result.ok) {
    const retryAfterSec = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
    headers["Retry-After"] = String(retryAfterSec);
  }
  return headers;
}

/** Test-only: clears the in-memory map (no-op for Upstash). */
export function __resetInMemoryRateLimitForTests() {
  memoryBuckets.clear();
  lastSweepAt = 0;
}
