import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/server"
import { getProfile } from "@/lib/supabase/user"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ user: null, profile: null })

  const profile = await getProfile(user.id)
  return NextResponse.json({ user, profile })
}
