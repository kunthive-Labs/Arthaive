import { NextResponse } from "next/server"
import { getUser } from "@/lib/supabase/session"
import { getProfile, upsertProfile } from "@/lib/supabase/user"
import { profilePatchSchema } from "@/lib/validation"

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const profile = await getProfile(user.id)
  return NextResponse.json(profile)
}

export async function PATCH(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  // Validate + bound length + strip angle brackets (stored-XSS guard).
  const parsed = profilePatchSchema.safeParse(body ?? {})
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const profile = await upsertProfile(
    user.id,
    user.email!,
    parsed.data.full_name,
    parsed.data.avatar_url
  )
  return NextResponse.json(profile)
}
