import { NextResponse } from "next/server"
import { getUser } from "@/lib/supabase/session"
import { getProfile } from "@/lib/supabase/user"

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ user: null, profile: null })

  const profile = await getProfile(user.id)
  return NextResponse.json({ user, profile })
}
