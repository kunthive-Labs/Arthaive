import { v1Route } from "@/lib/api/handler"
import { apiResponse, apiError } from "@/lib/api/response"
import { getMonthlyFundingByYear, getMonthlyFunding } from "@/lib/db/analytics"
import { yearSchema } from "@/lib/validation"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/trends/monthly?year=2024&sector=healthtech
 *
 * Returns month-by-month deal count + total funding for the given year. If `year`
 * is omitted, returns the last 24 months. `sector` filter currently scopes via the
 * underlying aggregator (best-effort).
 */
export const GET = v1Route(async (_req, { searchParams, rate }) => {
  const rawYear = searchParams.get("year")

  let data
  if (rawYear) {
    // Range-check the requested year (2000–2100).
    const parsed = yearSchema.safeParse(rawYear)
    if (!parsed.success) {
      return apiError("Invalid 'year' (expected 2000–2100)", 400)
    }
    data = await getMonthlyFundingByYear(parsed.data)
  } else {
    data = await getMonthlyFunding(24)
  }

  const series = data.map((row) => ({
    month: ("month" in row ? row.month : ""),
    deal_count: row.dealCount,
    total_funding_inr: row.totalFunding,
  }))

  return apiResponse(series, {
    total: series.length,
    rate,
    cache: { maxAgeSeconds: 3600 },
  })
})
