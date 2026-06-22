import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/types/database.types"

// Arthaive is a public funding ledger: the deals, filters, analytics, search,
// sectors, investors and reports are all browsable without an account. Only
// per-user features (the dashboard and what feeds it) and key management require
// signing in; admin is gated separately in the root middleware. So we invert the
// old allow-list into a small protected DENY-list — everything else is public.
function isProtectedPage(pathname: string): boolean {
  return (
    pathname === "/dashboard" || pathname.startsWith("/dashboard/") ||
    pathname === "/profile" || pathname.startsWith("/profile/") ||
    pathname === "/submit" || pathname.startsWith("/submit/") ||
    pathname === "/api-keys" || pathname.startsWith("/api-keys/")
  )
}

// API routes that require a signed-in user: the per-user data behind the
// dashboard, plus key management and admin. Every other API (the public data
// endpoints, /api/v1, auth handshake, health) stays open. These routes also
// self-check getUser(), so this is defense-in-depth, not the only guard.
function isProtectedApi(pathname: string): boolean {
  return (
    pathname.startsWith("/api/bookmarks") ||
    pathname.startsWith("/api/watchlist") ||
    pathname.startsWith("/api/saved-searches") ||
    pathname.startsWith("/api/alerts") ||
    pathname.startsWith("/api/notes") ||
    pathname.startsWith("/api/export") ||
    pathname.startsWith("/api/profile") ||
    pathname.startsWith("/api/api-keys") ||
    pathname.startsWith("/api/admin")
  )
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // API: respond with 401 JSON rather than an HTML redirect, so fetch() callers
  // get a usable error instead of a redirect to the home markup.
  if (pathname.startsWith("/api")) {
    if (isProtectedApi(pathname) && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return supabaseResponse
  }

  // Protected pages: unauthenticated visitors are sent home (where they can sign
  // in). Everything else is public and falls through.
  if (isProtectedPage(pathname) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
