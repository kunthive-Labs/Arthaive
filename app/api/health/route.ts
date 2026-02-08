import { NextResponse } from "next/server"
import { fundingData } from "@/data/funding-data"

export async function GET() {
  return NextResponse.json({
    status: "ok",
    deals: fundingData.length,
    ts: new Date().toISOString(),
  })
}
