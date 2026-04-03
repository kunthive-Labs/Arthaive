import { NextResponse } from "next/server"
import { fundingData } from "@/data/funding-data"
import { getSimilarDeals } from "@/lib/recommendations"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const dealId = searchParams.get("id")
  const n = parseInt(searchParams.get("n") ?? "5", 10)

  if (!dealId) {
    return NextResponse.json({ error: "id required" }, { status: 400 })
  }

  const target = fundingData.find((d) => d.id === dealId)
  if (!target) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 })
  }

  const similar = getSimilarDeals(target, fundingData, n)
  return NextResponse.json(similar)
}
