import { NextRequest, NextResponse } from "next/server"
import { fundingData } from "@/data/funding-data"
import { scoreRelevance } from "@/lib/utils"

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? ""
  if (!q.trim()) return NextResponse.json({ suggestions: [] })

  const results = fundingData
    .filter(d => scoreRelevance(d, q) > 0)
    .sort((a, b) => scoreRelevance(b, q) - scoreRelevance(a, q))
    .slice(0, 10)
    .map(d => ({
      type: "company",
      label: d.company,
      value: d.id,
      count: 1,
    }))

  return NextResponse.json({ suggestions: results })
}
