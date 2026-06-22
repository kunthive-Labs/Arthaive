import { NextResponse } from "next/server"
import { getUser } from "@/lib/supabase/session"
import { getNote, getNotes, saveNote, deleteNote } from "@/lib/supabase/profile"
import { dealIdSchema } from "@/lib/validation"

const NOTE_MAX_LEN = 5000

// GET /api/notes            -> all of the signed-in user's notes
// GET /api/notes?dealId=xyz -> just the note for one deal (or null)
export async function GET(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rawDealId = new URL(req.url).searchParams.get("dealId")
  if (rawDealId) {
    const parsed = dealIdSchema.safeParse(rawDealId)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid dealId" }, { status: 400 })
    }
    const note = await getNote(user.id, parsed.data)
    return NextResponse.json(note)
  }
  const notes = await getNotes(user.id)
  return NextResponse.json(notes)
}

// POST /api/notes { dealId, content, tags } -> upsert (empty note deletes it)
export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsedId = dealIdSchema.safeParse(body?.dealId)
  if (!parsedId.success) {
    return NextResponse.json({ error: "Valid dealId is required" }, { status: 400 })
  }

  const content = (typeof body.content === "string" ? body.content : "").slice(0, NOTE_MAX_LEN)
  const tags = Array.isArray(body.tags)
    ? body.tags
        .filter((t: unknown): t is string => typeof t === "string")
        .slice(0, 20)
        .map((t: string) => t.slice(0, 50))
    : []

  await saveNote(user.id, parsedId.data, content, tags)
  return NextResponse.json({ ok: true })
}

// DELETE /api/notes?dealId=xyz
export async function DELETE(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = dealIdSchema.safeParse(new URL(req.url).searchParams.get("dealId"))
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid dealId is required" }, { status: 400 })
  }
  await deleteNote(user.id, parsed.data)
  return NextResponse.json({ ok: true })
}
