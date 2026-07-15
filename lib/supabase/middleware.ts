import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/types/database.types"
import { isConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config"

// Arthaive is public by default: the ledger, filters, analytics, search, and the
// deal / investor / sector / report pages are all readable — and crawlable —
// without an account, so visitors and search engines can reach the data. Only the
// *personal* layer (things tied to a specific member) requires signing in. Keeping
// this as a small deny-list rather than an allow-list means new public content
// pages open automatically and can never be accidentally walled off.

// Framework / auth / SEO assets that resolve before any session logic and never
// need a user. Short-circuited first so static requests don't pay for auth.
function isStaticOrAuthPath(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/auth") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.webmanifest" ||
    pathname.startsWith("/opengraph-image") ||
    pathname.startsWith("/twitter-image") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/apple-icon") ||
    pathname.startsWith("/favicon")
  )
}

// Pages that require a signed-in member. Everything else (the landing, explore,
// analytics, deals, investors, sectors, reports, search, live, api-docs…) is
// public. `/admin` is gated separately in the root proxy.
function isGatedPage(pathname: string): boolean {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/submit" ||
    pathname.startsWith("/submit/")
  )
}

// Personal / state-changing APIs that require a session. Read-only content APIs
// (deals, analytics, sectors, stats, investors, search, reports, compare,
// recommendations, export, weekly) stay open, as do the key-gated public
// /api/v1, the auth handshake, and the health probe. `/api/admin` is gated in the
// root proxy.
const GATED_API_PREFIXES = [
  "/api/bookmarks",
  "/api/notes",
  "/api/watchlist",
  "/api/saved-searches",
  "/api/alerts",
  "/api/profile",
  "/api/dashboards",
  "/api/api-keys",
  "/api/notify",
  "/api/submit",
  "/api/chat",
]

function isGatedApi(pathname: string): boolean {
  return GATED_API_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  )
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const { pathname } = request.nextUrl

  // Static / framework / auth assets never need a session — straight through.
  if (isStaticOrAuthPath(pathname)) return supabaseResponse

  if (!isConfigured) {
    // No Supabase configured: personal/write APIs say so clearly; read-only
    // content APIs still serve from the static fallback. Gated pages fall back to
    // the login screen; public pages render normally.
    if (pathname.startsWith("/api")) {
      if (isGatedApi(pathname)) {
        return NextResponse.json({ error: "Authentication is not configured" }, { status: 503 })
      }
      return supabaseResponse
    }

    if (isGatedPage(pathname)) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  }

  const supabase = createServerClient<Database>(
    SUPABASE_URL!,
    SUPABASE_ANON_KEY!,
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

  // API: personal/write endpoints require a session (401 JSON, not an HTML
  // redirect, so fetch() callers get a usable error). Read-only APIs stay open.
  if (pathname.startsWith("/api")) {
    if (isGatedApi(pathname) && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return supabaseResponse
  }

  // Personal pages require a session; unauthenticated visitors go to /login.
  // Public content pages render for everyone.
  if (isGatedPage(pathname) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
