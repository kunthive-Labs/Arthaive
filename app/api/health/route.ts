import { NextResponse } from "next/server"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/health — real readiness probe.
 *
 * Performs a lightweight head count against the deals table. Returns 503 when
 * the DB is unreachable / not configured so load balancers and uptime checks
 * actually detect an unhealthy instance.
 */
export async function GET() {
  const base = {
    version: process.env.npm_package_version ?? "0.1.0",
    env: process.env.NODE_ENV,
    ts: new Date().toISOString(),
    uptime: process.uptime ? Math.floor(process.uptime()) : null,
  }

  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json(
      { ...base, status: "error", db: "unconfigured" },
      { status: 503 },
    )
  }

  try {
    const { count, error } = await supabase
      .from("deals")
      .select("*", { count: "exact", head: true })

    if (error) {
      return NextResponse.json(
        { ...base, status: "error", db: "unreachable", detail: error.message },
        { status: 503 },
      )
    }

    return NextResponse.json({ ...base, status: "ok", db: "ok", deals: count ?? 0 })
  } catch (err) {
    return NextResponse.json(
      {
        ...base,
        status: "error",
        db: "unreachable",
        detail: err instanceof Error ? err.message : "unknown",
      },
      { status: 503 },
    )
  }
}
