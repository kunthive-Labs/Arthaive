import { NextResponse } from "next/server"
import { getUser } from "@/lib/supabase/session"
import { getSavedSearches, saveSearch } from "@/lib/supabase/profile"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const searches = await getSavedSearches(user.id)
  return NextResponse.json(searches)
}

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { name, filters } = await req.json()
  await saveSearch(user.id, name, filters)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await req.json()
  const supabase = await createClient()
  await supabase.from("saved_searches").delete().eq("id", id).eq("user_id", user.id)
  return NextResponse.json({ ok: true })
}
