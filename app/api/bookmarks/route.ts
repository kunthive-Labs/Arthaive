import { NextResponse } from "next/server"
import { getUser } from "@/lib/supabase/session"
import { getBookmarks, toggleBookmark } from "@/lib/supabase/profile"
import { dealIdSchema } from "@/lib/validation"

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const bookmarks = await getBookmarks(user.id)
  return NextResponse.json(bookmarks)
}

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = dealIdSchema.safeParse(body?.dealId)
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid dealId is required" }, { status: 400 })
  }

  await toggleBookmark(user.id, parsed.data)
  return NextResponse.json({ ok: true })
}
