import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/types/database.types"

// Arthaive is gated: the deals, filters, analytics, search and everything else
// are visible only after signing in. So this public list is deliberately tiny —
// the sign-in gate itself, the auth handshake, and the SEO/social/PWA assets
// that must resolve so the gate's own link unfurls and indexes. (Legal pages are
// allowed separately in the root middleware.)
function isPublicPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/login") return true
  if (pathname.startsWith("/auth")) return true
  if (
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.webmanifest" ||
    pathname.startsWith("/opengraph-image") ||
    pathname.startsWith("/twitter-image") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/apple-icon") ||
    pathname.startsWith("/favicon")
  ) {
    return true
  }
  return false
}

// API routes that serve without a logged-in session: the auth handshake, the
// key-authenticated public API (/api/v1, which gates itself by API key), and the
// health probe. Every other API — including the deal/analytics data — requires a
// session, so the gated UI's own data can't be scraped anonymously.
function isOpenApi(pathname: string): boolean {
  return (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/v1") ||
    pathname.startsWith("/api/health")
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
  // get a usable error instead of a redirect to the gate markup.
  if (pathname.startsWith("/api")) {
    if (!isOpenApi(pathname) && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return supabaseResponse
  }

  // Everything that isn't explicitly public requires a session: unauthenticated
  // visitors are sent to the sign-in gate at "/".
  if (!isPublicPath(pathname) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
