import { NextResponse } from "next/server"
import { getUser } from "@/lib/supabase/session"
import { getNote, getNotes, saveNote, deleteNote } from "@/lib/supabase/profile"

// GET /api/notes            -> all of the signed-in user's notes
// GET /api/notes?dealId=xyz -> just the note for one deal (or null)
export async function GET(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const dealId = new URL(req.url).searchParams.get("dealId")
  if (dealId) {
    const note = await getNote(user.id, dealId)
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
  if (!body || typeof body.dealId !== "string") {
    return NextResponse.json({ error: "dealId is required" }, { status: 400 })
  }

  const content = typeof body.content === "string" ? body.content : ""
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t: unknown): t is string => typeof t === "string")
    : []

  await saveNote(user.id, body.dealId, content, tags)
  return NextResponse.json({ ok: true })
}

// DELETE /api/notes?dealId=xyz
export async function DELETE(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const dealId = new URL(req.url).searchParams.get("dealId")
  if (!dealId) {
    return NextResponse.json({ error: "dealId is required" }, { status: 400 })
  }
  await deleteNote(user.id, dealId)
  return NextResponse.json({ ok: true })
}
