import { NextRequest, NextResponse } from "next/server"
import { fundingData } from "@/data/funding-data"

export async function GET(req: NextRequest) {
  const weeksBack = parseInt(req.nextUrl.searchParams.get("weeks") ?? "1")
  const now = new Date()
  const from = new Date(now)
  from.setDate(from.getDate() - weeksBack * 7)

  const fromStr = from.toISOString().slice(0, 10)
  const deals = fundingData.filter(d => d.date >= fromStr)
  const total = deals.reduce((s, d) => s + d.amount, 0)
  const sectors = [...new Set(deals.flatMap(d => d.sectors))]
    .map(s => ({ sector: s, count: deals.filter(d => d.sectors.includes(s)).length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return NextResponse.json({ dealCount: deals.length, totalFunding: total, topSectors: sectors, from: fromStr })
}
