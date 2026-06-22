import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { upsertProfile } from "@/lib/supabase/user"

// Only accept `next` if it is a same-origin relative path: it must start with a
// single "/", must not start with "//" (protocol-relative URL), and must not
// contain a scheme, "@" (userinfo escape), or backslash. We then resolve it
// against origin and confirm the resulting origin is unchanged before trusting
// it. Anything else falls back to /dashboard, defeating open-redirect vectors.
function safeNext(next: string, origin: string): string {
  if (
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("@") ||
    next.includes("\\") ||
    next.includes(":")
  ) {
    return `${origin}/dashboard`
  }
  try {
    const resolved = new URL(next, origin)
    if (resolved.origin === origin) {
      return resolved.toString()
    }
  } catch {
    // fall through to default
  }
  return `${origin}/dashboard`
}

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
      return NextResponse.redirect(safeNext(next, origin))
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`)
}
