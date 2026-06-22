import { NextRequest, NextResponse } from "next/server"
import { getReport } from "@/lib/db/reports"
import { getUser } from "@/lib/supabase/session"
import { consume } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Report generation is expensive (full-period aggregation, and the report page
// fans out into a paid Sonnet trend-summary). It must NOT be an open endpoint:
//   1. Require an authenticated session — same getUser() pattern as other user routes.
//   2. Rate-limit per authenticated user so a single account can't hammer it with
//      arbitrary attacker-supplied `period` values that bypass the summary cache.
const REPORT_RATE = { max: 30, windowMs: 60_000 } // 30 reports / minute / user

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ period: string }> },
) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limit = consume(`reports:${user.id}`, REPORT_RATE.max, REPORT_RATE.windowMs)
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

  const { period } = await params
  try {
    const report = await getReport(period)
    if (!report) {
      return NextResponse.json(
        { error: "Invalid period. Use YYYY-Www (e.g. 2026-W20) or YYYY-MM (e.g. 2026-05)." },
        { status: 400 }
      )
    }
    return NextResponse.json(report)
  } catch (error) {
    console.error(`GET /api/reports/${period} error:`, error)
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
  }
}
