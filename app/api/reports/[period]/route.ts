import { NextRequest, NextResponse } from "next/server"
import { getReport } from "@/lib/db/reports"

export async function GET(_req: NextRequest, { params }: { params: { period: string } }) {
  try {
    const report = await getReport(params.period)
    if (!report) {
      return NextResponse.json(
        { error: "Invalid period. Use YYYY-Www (e.g. 2026-W20) or YYYY-MM (e.g. 2026-05)." },
        { status: 400 }
      )
    }
    return NextResponse.json(report)
  } catch (error) {
    console.error(`GET /api/reports/${params.period} error:`, error)
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
  }
}
