import { NextRequest, NextResponse } from "next/server"
import { notifySchema } from "@/lib/validation"
import { createClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/supabase/session"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = notifySchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supabase = await createClient()
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, notification_prefs: parsed.data })

    if (error) return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 })

    return NextResponse.json({ success: true, prefs: parsed.data })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
