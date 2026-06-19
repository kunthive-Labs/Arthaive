import { NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"
import { rateLimit } from "@/lib/rate-limit"
import { createServerClient } from "@supabase/ssr"
import type { Database } from "@/types/database.types"

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

export async function middleware(request: NextRequest) {
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
  }

  // Admin path: ensure user is authenticated (layout handles the admin role check)
  if (request.nextUrl.pathname.startsWith("/admin")) {
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

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = "/"
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
