import { NextRequest, NextResponse } from "next/server"
import { fundingData } from "@/data/funding-data"
import { compareDeals } from "@/lib/compare"

export async function GET(req: NextRequest) {
  const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean)
  if (ids.length < 2) return NextResponse.json({ error: "Need at least 2 ids" }, { status: 400 })
  const deals = ids.map(id => fundingData.find(d => d.id === id)).filter(Boolean)
  if (deals.length < 2) return NextResponse.json({ error: "Deals not found" }, { status: 404 })
  return NextResponse.json({ deals, comparison: compareDeals(deals[0]!, deals[1]!) })
}
