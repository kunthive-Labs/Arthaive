import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getUser } from "@/lib/supabase/session"
import { generateKey } from "@/lib/api/auth"
import { rateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * POST /api/api-keys  { label? }
 *
 * Generates a new API key for the AUTHENTICATED user. The email is derived from
 * the session — never trusted from the request body — so a caller cannot mint a
 * key bound to someone else's address. The raw key is returned ONCE; only the
 * SHA-256 hash is stored. Subsequent requests authenticate by re-hashing.
 *
 * Rate-limited per user (5 keys/hour) to prevent abuse.
 */
export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!rateLimit(`api-keys:${user.id}`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many key requests. Try again in an hour." }, { status: 429 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "API key service unavailable" }, { status: 503 })
  }

  let body: { label?: string }
  try {
    body = (await req.json().catch(() => ({}))) as { label?: string }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // Email is derived from the authenticated session, NOT the request body.
  const email = user.email.trim().toLowerCase()
  const label = (body.label ?? "").trim().slice(0, 80) || null

  const { raw, hash, prefix } = generateKey()

  const { error } = await supabaseAdmin.from("api_keys").insert({
    key_hash: hash,
    key_prefix: prefix,
    label,
    email,
  })

  if (error) {
    console.error("[api-keys] insert failed:", error)
    return NextResponse.json({ error: "Failed to create key" }, { status: 500 })
  }

  return NextResponse.json({
    key: raw,                // show ONCE — never returned again
    prefix,
    label,
    email,
    rate_limit_per_minute: 120,
    docs_url: "/api-docs",
    notice: "Store this key somewhere safe. It will not be shown again.",
  })
}
