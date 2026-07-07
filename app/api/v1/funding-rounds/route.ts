import { v1Route, intParam } from "@/lib/api/handler"
import { apiResponse } from "@/lib/api/response"
import { getDeals } from "@/lib/db/deals"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/funding-rounds
 *   ?sector=edtech&stage=series_a&from=2024-01-01&to=2024-12-31&page=1&limit=20
 *
 * Returns paginated funding rounds. One row per deal.
 */
export const GET = v1Route(async (_req, { searchParams, rate }) => {
  const page = intParam(searchParams, "page", 1, undefined, 1)
  const limit = intParam(searchParams, "limit", 20, 100, 1)

  // Date range → years[] (the existing getDeals filter shape) or undisclosed pass-through.
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const years: string[] = []
  if (from && to) {
    const yFrom = Number(from.slice(0, 4))
    const yTo = Number(to.slice(0, 4))
    if (Number.isFinite(yFrom) && Number.isFinite(yTo)) {
      for (let y = yFrom; y <= yTo; y++) years.push(String(y))
    }
  }

  const stagesRaw = searchParams.getAll("stage")
  const stages = stagesRaw.map((s) => s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()))

  const result = await getDeals({
    sectors: searchParams.getAll("sector"),
    stages,
    location: searchParams.get("city") || "",
    investorSearch: searchParams.get("investor") || "",
    minAmount: intParam(searchParams, "min_amount", 0),
    maxAmount: intParam(searchParams, "max_amount", Number.MAX_SAFE_INTEGER),
    years,
    page,
    limit,
    sortBy: (searchParams.get("sort") as "date" | "amount") || "date",
  })

  // Narrow to the public-facing shape.
  const rounds = result.deals.map((d) => ({
    id: d.id,
    company: d.company,
    amount_inr: d.amount,
    amount_usd: d.amountUsd,
    stage: d.stage,
    sectors: d.sectors,
    investors: d.investors,
    lead_investor: d.leadInvestor,
    deal_date: d.date,
    city: d.location,
    source_url: d.sourceUrl,
  }))

  return apiResponse(rounds, { total: result.total, page, limit, rate })
})
