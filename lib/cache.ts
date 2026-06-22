/**
 * Cache layer.
 *
 * The synchronous API (`getCache` / `setCache` / `invalidateCache`) is, like the
 * original, a process-local in-memory store. It is preserved verbatim so any
 * existing/future sync caller keeps working unchanged.
 *
 * For distributed caching across Vercel serverless instances, use the async
 * Upstash-backed variants below (`getCacheAsync` / `setCacheAsync` /
 * `invalidateCacheAsync`). They fall back to the in-memory store when
 * UPSTASH_REDIS_REST_URL/TOKEN are absent.
 *
 * NOTE: Redis is inherently async, so a sync `getCache` can never read a value
 * written on another instance. The sync API is therefore in-memory only by
 * design; reach for the async API when cross-instance sharing matters.
 *
 * TODO: once a call site needs distributed reads, migrate it to the async API
 * and consider deprecating the sync surface. Kept minimal intentionally —
 * prioritized lib/rate-limit.ts in this pass.
 */

import { Redis } from "@upstash/redis"

// ---------------------------------------------------------------------------
// In-memory store (sync API — unchanged behavior)
// ---------------------------------------------------------------------------

const cache = new Map<string, { data: unknown; expiresAt: number }>()

export function setCache<T>(key: string, data: T, ttlMs = 60_000): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs })
}

export function getCache<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null }
  return entry.data as T
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) { cache.clear(); return }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key)
  }
}

// ---------------------------------------------------------------------------
// Upstash-backed async API (distributed when env present, in-memory otherwise)
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

const CACHE_PREFIX = "cache:"

let warnedNoUpstash = false
function warnOnceNoUpstash(): void {
  if (warnedNoUpstash) return
  warnedNoUpstash = true
  console.warn(
    "[cache] UPSTASH_REDIS_REST_URL/TOKEN not set — cache is in-memory and " +
      "NOT shared across serverless instances.",
  )
}

export async function setCacheAsync<T>(key: string, data: T, ttlMs = 60_000): Promise<void> {
  const client = getRedis()
  if (!client) {
    warnOnceNoUpstash()
    setCache(key, data, ttlMs)
    return
  }
  try {
    await client.set(`${CACHE_PREFIX}${key}`, data as unknown, { px: ttlMs })
  } catch (err) {
    console.warn("[cache] distributed set failed, using in-memory:", err)
    setCache(key, data, ttlMs)
  }
}

export async function getCacheAsync<T>(key: string): Promise<T | null> {
  const client = getRedis()
  if (!client) {
    warnOnceNoUpstash()
    return getCache<T>(key)
  }
  try {
    const value = await client.get<T>(`${CACHE_PREFIX}${key}`)
    return value ?? null
  } catch (err) {
    console.warn("[cache] distributed get failed, using in-memory:", err)
    return getCache<T>(key)
  }
}

export async function invalidateCacheAsync(prefix?: string): Promise<void> {
  const client = getRedis()
  if (!client) {
    warnOnceNoUpstash()
    invalidateCache(prefix)
    return
  }
  try {
    const pattern = prefix ? `${CACHE_PREFIX}${prefix}*` : `${CACHE_PREFIX}*`
    const keys = await client.keys(pattern)
    if (keys.length > 0) await client.del(...keys)
  } catch (err) {
    console.warn("[cache] distributed invalidate failed, using in-memory:", err)
    invalidateCache(prefix)
  }
  // Also clear the local mirror so a stale sync read can't survive.
  invalidateCache(prefix)
}
