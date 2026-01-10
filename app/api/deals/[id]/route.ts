import { NextRequest, NextResponse } from "next/server"
import { getDealById } from "@/lib/db/deals"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const deal = await getDealById(decodeURIComponent(id))
    if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    return NextResponse.json(deal)
  } catch (error) {
    console.error("GET /api/deals/[id] error:", error)
    return NextResponse.json({ error: "Failed to fetch deal" }, { status: 500 })
  }
}
