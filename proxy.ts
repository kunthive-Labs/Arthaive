import { NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"
import { rateLimit } from "@/lib/rate-limit"
import { createServerClient } from "@supabase/ssr"
import type { Database } from "@/types/database.types"
import { isConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config"

// Legal / SEO routes that MUST resolve without a session. Google's OAuth
// verification and crawlers have to reach the privacy policy, terms, and the
// methodology/about page without signing in. (robots.txt and sitemap.xml are
// already treated as public by updateSession's own allowlist.) These are the
// ONLY content pages opened up — the rest of the app stays gated.
function isPublicLegalPath(pathname: string): boolean {
  return (
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/about" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  )
}

// Resolve the authenticated Supabase user inside proxy, threading cookies
// through a response object so refreshed tokens are written back. Shared by the
// /admin (page) and /api/admin (API) auth gates so the wiring lives in one place.
async function getAuthedUser(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  if (!isConfigured) {
    return { user: null, supabaseResponse }
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { user, supabaseResponse }
}

export async function proxy(request: NextRequest) {
  // Let the legal/SEO pages through before the session gate runs, so
  // unauthenticated crawlers and OAuth reviewers are never redirected.
  if (isPublicLegalPath(request.nextUrl.pathname)) {
    return NextResponse.next({ request })
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "127.0.0.1"
    if (!rateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    // CSRF defense: for state-changing requests, if an Origin header is present
    // its host must match the request host. Same-origin browser submits always
    // send a matching Origin; cross-site forged requests carry the attacker's
    // origin. Requests with no Origin (e.g. server-to-server / API-key clients)
    // and all GETs are allowed through.
    const method = request.method
    if (
      method === "POST" ||
      method === "PUT" ||
      method === "PATCH" ||
      method === "DELETE"
    ) {
      const origin = request.headers.get("origin")
      if (origin) {
        try {
          if (new URL(origin).host !== request.headers.get("host")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
          }
        } catch {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
      }
    }
  }

  // Admin API: require an authenticated user (route handlers still enforce the
  // email/role admin check). Mirrors the /admin page gate below.
  if (request.nextUrl.pathname.startsWith("/api/admin")) {
    const { user } = await getAuthedUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  // Admin path: ensure user is authenticated (layout handles the admin role check)
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const { user, supabaseResponse } = await getAuthedUser(request)

    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = "/"
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  }

  return await updateSession(request)
}
