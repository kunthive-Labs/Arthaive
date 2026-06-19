import { NextRequest, NextResponse } from "next/server"
import { fundingData } from "@/data/funding-data"
import { compareDeals } from "@/lib/compare"
import { compareIdsSchema } from "@/lib/validation"

export async function GET(req: NextRequest) {
  const rawIds = (req.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  // Validate + cap the number of ids (min 2, max COMPARE_MAX_IDS).
  const parsed = compareIdsSchema.safeParse(rawIds)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const deals = parsed.data.map((id) => fundingData.find((d) => d.id === id)).filter(Boolean)
  if (deals.length < 2) return NextResponse.json({ error: "Deals not found" }, { status: 404 })
  return NextResponse.json({ deals, comparison: compareDeals(deals[0]!, deals[1]!) })
}
