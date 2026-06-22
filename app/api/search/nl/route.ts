import { NextRequest, NextResponse } from "next/server"
import { naturalLanguageSearch } from "@/lib/ai/nl-search"
import { consume } from "@/lib/rate-limit"
import { isBudgetExceededError } from "@/lib/ai/budget"
import { getUser } from "@/lib/supabase/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_QUERY_LEN = 400

// This route fronts a paid Claude (Haiku) call. Use the shared limiter and give
// signed-in users a higher tier than anonymous clients. Identity is the user id
// when authenticated, else the client IP.
const TIERS = {
  authenticated: { max: 60, windowMs: 60_000 },
  anon: { max: 20, windowMs: 60_000 },
} as const

export async function POST(req: NextRequest) {
  const user = await getUser()
  const tier = user ? TIERS.authenticated : TIERS.anon
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon"
  const identity = user ? `user:${user.id}` : `ip:${ip}`

  const limit = consume(`nl-search:${identity}`, tier.max, tier.windowMs)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(0, Math.ceil((limit.resetAt - Date.now()) / 1000))),
          "X-RateLimit-Limit": String(limit.limit),
          "X-RateLimit-Remaining": String(limit.remaining),
        },
      },
    )
  }

  let body: { query?: string }
  try {
    body = (await req.json()) as { query?: string }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const query = typeof body.query === "string" ? body.query.trim() : ""
  if (!query) {
    return NextResponse.json({ error: "query required" }, { status: 400 })
  }
  if (query.length > MAX_QUERY_LEN) {
    return NextResponse.json(
      { error: `query too long (max ${MAX_QUERY_LEN} chars)` },
      { status: 400 },
    )
  }

  try {
    const result = await naturalLanguageSearch(query)
    return NextResponse.json(result)
  } catch (err) {
    if (isBudgetExceededError(err)) {
      return NextResponse.json(
        { error: "AI search is temporarily unavailable (budget ceiling reached)." },
        { status: 429 },
      )
    }
    console.error("[/api/search/nl] error:", err)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
