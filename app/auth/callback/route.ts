import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { upsertProfile } from "@/lib/supabase/user"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await upsertProfile(
          user.id,
          user.email!,
          user.user_metadata?.full_name,
          user.user_metadata?.avatar_url
        )
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
