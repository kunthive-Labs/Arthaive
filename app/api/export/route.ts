import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/supabase/session"
import { getDeals } from "@/lib/db/deals"
import { exportDealsCSV, exportDealsJSON } from "@/lib/export"
import { exportQuerySchema, EXPORT_MAX_LIMIT } from "@/lib/validation"
import { rateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/export?format=json|csv&page=1&limit=500
 *
 * Authenticated, paginated, DB-backed export. Pulls from the live deals query
 * layer (lib/db) rather than the stale static fixture, caps rows per request,
 * and is rate-limited per user.
 */
export async function GET(req: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 10 export requests / minute per user.
  if (!rateLimit(`export:${user.id}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "Too many export requests. Try again shortly." },
      { status: 429 },
    )
  }

  const parsed = exportQuerySchema.safeParse({
    format: req.nextUrl.searchParams.get("format") ?? undefined,
    page: req.nextUrl.searchParams.get("page") ?? undefined,
    limit: req.nextUrl.searchParams.get("limit") ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { format, page, limit } = parsed.data

  const result = await getDeals({ page, limit })
  const deals = result.deals as unknown as Array<Record<string, unknown>>

  // Pagination metadata is surfaced via headers (the body stays a plain array
  // so CSV and JSON consumers get the same row shape).
  const metaHeaders = {
    "X-Total-Count": String(result.total),
    "X-Total-Pages": String(result.totalPages),
    "X-Page": String(result.page),
    "X-Page-Size": String(result.limit),
    "X-Max-Page-Size": String(EXPORT_MAX_LIMIT),
  }

  if (format === "csv") {
    const csv = exportDealsCSV(deals)
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="india-startup-funding-p${page}.csv"`,
        ...metaHeaders,
      },
    })
  }

  return new NextResponse(exportDealsJSON(result.deals), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="india-startup-funding-p${page}.json"`,
      ...metaHeaders,
    },
  })
}
