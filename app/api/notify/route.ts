import { NextRequest, NextResponse } from "next/server"
import { notifySchema } from "@/lib/validation"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = notifySchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    // TODO: persist preferences to Supabase
    return NextResponse.json({ success: true, prefs: parsed.data })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
