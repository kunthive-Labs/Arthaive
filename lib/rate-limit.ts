/**
 * Distributed rate limiter.
 *
 * Production (Vercel serverless / edge): backed by Upstash Redis with a sliding
 * window, so limits hold ACROSS function instances and cold starts.
 *
 * Local / preview (no Upstash env): falls back to a process-local in-memory
 * token bucket — the original behavior — and warns once that limits are NOT
 * distributed.
 *
 * Three surfaces are exported:
 *   - `rateLimit(id, max, windowMs)`  → boolean        (sync; existing call sites)
 *   - `consume(id, max, windowMs)`    → RateInfo        (sync; existing call sites)
 *   - `rateLimitAsync` / `consumeAsync`                 (async; true distributed
 *                                                        verdict per request)
 *
 * IMPORTANT — sync vs distributed:
 *   The Upstash API is inherently async. The existing call sites
 *   (middleware.ts, lib/api/handler.ts, app/api/api-keys, app/api/search/nl)
 *   call `rateLimit`/`consume` SYNCHRONOUSLY and cannot be changed in this pass,
 *   so their signatures are preserved exactly. To still get distributed
 *   enforcement from a sync call, the sync path:
 *     1. evaluates the in-memory bucket for an immediate, always-correct
 *        per-instance verdict (identical to the original code), AND
 *     2. when Upstash is configured, fires a background distributed check whose
 *        verdict is cached locally and consulted by the NEXT sync call for the
 *        same id — giving eventual cross-instance enforcement without changing
 *        the synchronous return contract.
 *   Call sites that can `await` should migrate to `consumeAsync` /
 *   `rateLimitAsync` for a strict per-request distributed verdict.
 */

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

export interface RateInfo {
  allowed: boolean
  remaining: number
  resetAt: number // ms epoch
  limit: number
}

// Public-API tiers used by every /api/v1/* route.
export const RATE_TIERS = {
  anon: { max: 30, windowMs: 60_000 },     // 30/min unauthenticated
  authenticated: { max: 120, windowMs: 60_000 }, // 120/min with API key
} as const

// ---------------------------------------------------------------------------
// Upstash detection + lazy client
// ---------------------------------------------------------------------------

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

let redis: Redis | null = null
function getRedis(): Redis | null {
  if (!hasUpstash) return null
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return redis
}

// One Ratelimit instance per distinct (max, windowMs) config. The sliding
// window's limit + duration are fixed at construction, but our callers pass
// these dynamically, so we memoize per config.
const limiters = new Map<string, Ratelimit>()
function getLimiter(max: number, windowMs: number): Ratelimit | null {
  const client = getRedis()
  if (!client) return null
  const key = `${max}:${windowMs}`
  let limiter = limiters.get(key)
  if (!limiter) {
    limiter = new Ratelimit({
      redis: client,
      limiter: Ratelimit.slidingWindow(max, `${windowMs} ms`),
      prefix: "rl",
      // ephemeralCache lets an instance short-circuit ids it already saw
      // exceed the limit, without a Redis round-trip.
      ephemeralCache: new Map<string, number>(),
    })
    limiters.set(key, limiter)
  }
  return limiter
}

let warnedNoUpstash = false
function warnOnceNoUpstash(): void {
  if (warnedNoUpstash) return
  warnedNoUpstash = true
  console.warn(
    "[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting is " +
      "in-memory and NOT distributed across serverless instances.",
  )
}

// ---------------------------------------------------------------------------
// In-memory token bucket (fallback + sync immediate verdict)
// ---------------------------------------------------------------------------

const buckets = new Map<string, { count: number; resetAt: number }>()

function consumeInMemory(id: string, max: number, windowMs: number): RateInfo {
  const now = Date.now()
  const entry = buckets.get(id)

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs
    buckets.set(id, { count: 1, resetAt })
    return { allowed: true, remaining: max - 1, resetAt, limit: max }
  }

  if (entry.count >= max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt, limit: max }
  }

  entry.count++
  return { allowed: true, remaining: max - entry.count, resetAt: entry.resetAt, limit: max }
}

// Cache of the most recent distributed verdict per id, populated by the
// background check fired from the sync path. Consulted by the next sync call so
// a cross-instance breach eventually propagates without an await.
const distributedVerdict = new Map<string, RateInfo>()

function backgroundDistributedCheck(id: string, max: number, windowMs: number): void {
  const limiter = getLimiter(max, windowMs)
  if (!limiter) return
  void limiter
    .limit(id)
    .then((res) => {
      distributedVerdict.set(id, {
        allowed: res.success,
        remaining: res.remaining,
        resetAt: res.reset,
        limit: res.limit,
      })
    })
    .catch((err) => {
      // Never let a transient Redis error break request handling.
      console.warn("[rate-limit] distributed check failed:", err)
    })
}

// ---------------------------------------------------------------------------
// Sync API (signatures preserved exactly for existing callers)
// ---------------------------------------------------------------------------

export function consume(id: string, max: number, windowMs: number): RateInfo {
  if (!hasUpstash) {
    warnOnceNoUpstash()
    return consumeInMemory(id, max, windowMs)
  }

  // Immediate, per-instance verdict.
  const local = consumeInMemory(id, max, windowMs)

  // If a recent distributed check says this id is over the limit, honor it
  // (cross-instance enforcement). Otherwise use the local verdict.
  const distributed = distributedVerdict.get(id)
  const merged: RateInfo =
    distributed && !distributed.allowed ? distributed : local

  // Keep the distributed counter warm + refresh the cached verdict.
  backgroundDistributedCheck(id, max, windowMs)

  return merged
}

export function rateLimit(ip: string, max = 60, windowMs = 60_000): boolean {
  return consume(ip, max, windowMs).allowed
}

// ---------------------------------------------------------------------------
// Async API (strict per-request distributed verdict; opt-in for callers that
// can `await`). Falls back to in-memory when Upstash is absent.
// ---------------------------------------------------------------------------

export async function consumeAsync(
  id: string,
  max: number,
  windowMs: number,
): Promise<RateInfo> {
  const limiter = getLimiter(max, windowMs)
  if (!limiter) {
    warnOnceNoUpstash()
    return consumeInMemory(id, max, windowMs)
  }
  try {
    const res = await limiter.limit(id)
    return {
      allowed: res.success,
      remaining: res.remaining,
      resetAt: res.reset,
      limit: res.limit,
    }
  } catch (err) {
    // On Redis failure, fail open via the local bucket rather than blocking.
    console.warn("[rate-limit] distributed check failed, using in-memory:", err)
    return consumeInMemory(id, max, windowMs)
  }
}

export async function rateLimitAsync(
  ip: string,
  max = 60,
  windowMs = 60_000,
): Promise<boolean> {
  return (await consumeAsync(ip, max, windowMs)).allowed
}
