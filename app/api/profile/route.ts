import { NextResponse } from "next/server"
import { getUser } from "@/lib/supabase/session"
import { getProfile, upsertProfile } from "@/lib/supabase/user"

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const profile = await getProfile(user.id)
  return NextResponse.json(profile)
}

export async function PATCH(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const profile = await upsertProfile(
    user.id,
    user.email!,
    body.full_name,
    body.avatar_url
  )
  return NextResponse.json(profile)
}
