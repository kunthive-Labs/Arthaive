import { NextRequest, NextResponse } from "next/server"
import { getTopInvestors, searchInvestors } from "@/lib/db/investors"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || ""
    const limit = Math.min(Number(searchParams.get("limit") || 50), 200)

    const investors = search
      ? await searchInvestors(search, limit)
      : await getTopInvestors(limit)

    return NextResponse.json({ investors, total: investors.length })
  } catch (error) {
    console.error("GET /api/investors error:", error)
    return NextResponse.json({ error: "Failed to fetch investors" }, { status: 500 })
  }
}
