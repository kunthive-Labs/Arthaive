import { NextRequest, NextResponse } from "next/server"
import { notifySchema } from "@/lib/validation"
import { getAuthUser } from "@/lib/auth/server"

export async function POST(req: NextRequest) {
  try {
    if (!(await getAuthUser())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = notifySchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    return NextResponse.json({ success: true, prefs: parsed.data })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
