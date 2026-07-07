import { v1Route, intParam } from "@/lib/api/handler"
import { apiResponse } from "@/lib/api/response"
import { getDeals } from "@/lib/db/deals"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/startups?sector=fintech&city=bangalore&page=1&limit=20
 *
 * Returns a paginated list of distinct startups derived from the deals table.
 * Each row is the most recent funding event per company.
 */
export const GET = v1Route(async (_req, { searchParams, rate }) => {
  const page = intParam(searchParams, "page", 1, undefined, 1)
  const limit = intParam(searchParams, "limit", 20, 100, 1)

  // Pull a wide deal page using the existing query layer.
  const result = await getDeals({
    sectors: searchParams.getAll("sector"),
    stages: searchParams.getAll("stage"),
    location: searchParams.get("city") || "",
    minAmount: intParam(searchParams, "min_amount", 0),
    maxAmount: intParam(searchParams, "max_amount", Number.MAX_SAFE_INTEGER),
    page,
    limit: Math.min(limit * 3, 300), // overfetch to compensate for dedup
    sortBy: "date",
  })

  // Collapse to one entry per company — keep the most-recent (already date-sorted).
  const seen = new Set<string>()
  const startups: Array<{
    company: string
    latest_deal_id: string
    latest_stage: string
    latest_amount_inr: number
    latest_deal_date: string
    sectors: string[]
    city: string
  }> = []
  for (const d of result.deals) {
    if (seen.has(d.company)) continue
    seen.add(d.company)
    startups.push({
      company: d.company,
      latest_deal_id: d.id,
      latest_stage: d.stage,
      latest_amount_inr: d.amount,
      latest_deal_date: d.date,
      sectors: d.sectors,
      city: d.location,
    })
    if (startups.length >= limit) break
  }

  return apiResponse(startups, { total: result.total, page, limit, rate })
})
