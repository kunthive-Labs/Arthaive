import type { NextRequest, NextResponse } from "next/server"
import { authenticateRequest, rateLimitIdentity, type AuthContext } from "@/lib/api/auth"
import { consume, RATE_TIERS, type RateInfo } from "@/lib/rate-limit"
import { apiError } from "@/lib/api/response"

export interface V1Context {
  auth: AuthContext
  rate: { remaining: number; resetAt: number; limit: number }
  searchParams: URLSearchParams
}

type Handler<T> = (req: NextRequest, ctx: V1Context) => Promise<NextResponse | T>

/**
 * Wraps a v1 route handler with:
 *   1. API key authentication (optional — anon callers get a lower tier)
 *   2. Tiered rate limiting + standard X-RateLimit-* headers
 *   3. Uniform error handling
 *
 * The wrapped handler receives a `V1Context` and may return either a NextResponse
 * (for custom responses) or its raw payload (which will be wrapped via apiResponse upstream).
 */
export function v1Route<T>(
  handler: Handler<T>,
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    try {
      const auth = await authenticateRequest(req)
      const tier = auth.authenticated ? RATE_TIERS.authenticated : RATE_TIERS.anon
      const id = rateLimitIdentity(req, auth)
      const rate: RateInfo = consume(id, tier.max, tier.windowMs)

      if (!rate.allowed) {
        return apiError("Rate limit exceeded", 429, {
          retry_after_seconds: Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000)),
          limit: rate.limit,
        })
      }

      const { searchParams } = new URL(req.url)
      const result = await handler(req, { auth, rate, searchParams })
      // If the handler already returned a NextResponse, pass it through with rate headers added.
      if (result instanceof Response) {
        result.headers.set("X-RateLimit-Limit", String(rate.limit))
        result.headers.set("X-RateLimit-Remaining", String(rate.remaining))
        result.headers.set("X-RateLimit-Reset", String(Math.floor(rate.resetAt / 1000)))
        return result as NextResponse
      }
      // Should never happen — handlers always build responses via apiResponse.
      return apiError("Handler returned non-response", 500)
    } catch (err) {
      console.error("[v1 route] uncaught error:", err)
      return apiError("Internal server error", 500)
    }
  }
}

// Helpers used by multiple v1 routes
export function intParam(
  sp: URLSearchParams,
  key: string,
  fallback: number,
  max?: number,
  min = 0,
): number {
  const raw = sp.get(key)
  if (!raw) return fallback
  const n = Number(raw)
  if (!Number.isFinite(n)) return fallback
  const whole = Math.floor(n)
  const lowerBounded = Math.max(whole, min)
  return max != null ? Math.min(lowerBounded, max) : lowerBounded
}
