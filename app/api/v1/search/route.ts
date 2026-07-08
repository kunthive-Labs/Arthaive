import { v1Route, intParam } from "@/lib/api/handler"
import { apiResponse, apiError } from "@/lib/api/response"
import { getDeals } from "@/lib/db/deals"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/search?q=fintech+startup+bangalore
 *
 * Plain keyword search across the company name (uses the existing getDeals search field).
 * For NL parsing, use the internal POST /api/search/nl endpoint instead.
 */
export const GET = v1Route(async (_req, { searchParams, rate }) => {
  const q = (searchParams.get("q") ?? "").trim()
  if (!q) return apiError("q parameter required", 400)
  if (q.length > 200) return apiError("q too long (max 200 chars)", 400)

  const page = intParam(searchParams, "page", 1, undefined, 1)
  const limit = intParam(searchParams, "limit", 20, 100, 1)

  const result = await getDeals({ search: q, page, limit, sortBy: "date" })
  const deals = result.deals.map((d) => ({
    id: d.id,
    company: d.company,
    amount_inr: d.amount,
    stage: d.stage,
    sectors: d.sectors,
    investors: d.investors,
    deal_date: d.date,
    city: d.location,
    source_url: d.sourceUrl,
  }))

  return apiResponse(deals, { total: result.total, page, limit, rate })
})
