import { NextRequest, NextResponse } from "next/server"
import {
  getMonthlyFunding,
  getSectorStats,
  getCityFunding,
  getStageDistribution,
  getYoYComparison,
  getTopInvestorsByActivity,
} from "@/lib/db/analytics"

export const revalidate = 3600

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const metric = searchParams.get("metric") || "all"

    if (metric === "monthly") {
      const months = Number(searchParams.get("months") || 24)
      return NextResponse.json(await getMonthlyFunding(months))
    }
    if (metric === "sectors") return NextResponse.json(await getSectorStats())
    if (metric === "cities") {
      const limit = Number(searchParams.get("limit") || 15)
      return NextResponse.json(await getCityFunding(limit))
    }
    if (metric === "stages") return NextResponse.json(await getStageDistribution())
    if (metric === "yoy") return NextResponse.json(await getYoYComparison())
    if (metric === "investors") {
      const limit = Number(searchParams.get("limit") || 10)
      return NextResponse.json(await getTopInvestorsByActivity(limit))
    }

    const [monthly, sectors, cities, stages, yoy, investors] = await Promise.all([
      getMonthlyFunding(24),
      getSectorStats(),
      getCityFunding(15),
      getStageDistribution(),
      getYoYComparison(),
      getTopInvestorsByActivity(10),
    ])

    return NextResponse.json({ monthly, sectors, cities, stages, yoy, investors })
  } catch (error) {
    console.error("GET /api/analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
