import { NextResponse } from "next/server"
import { getUser } from "@/lib/supabase/session"
import { getWatchlist, addToWatchlist, removeFromWatchlist } from "@/lib/supabase/profile"

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const watchlist = await getWatchlist(user.id)
  return NextResponse.json(watchlist)
}

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { company } = await req.json()
  await addToWatchlist(user.id, company)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { company } = await req.json()
  await removeFromWatchlist(user.id, company)
  return NextResponse.json({ ok: true })
}
