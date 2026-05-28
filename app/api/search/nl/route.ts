import { NextRequest, NextResponse } from "next/server"
import { naturalLanguageSearch } from "@/lib/ai/nl-search"
import { rateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon"
  if (!rateLimit(`nl-search:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
  }

  let body: { query?: string }
  try {
    body = (await req.json()) as { query?: string }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const query = (body.query ?? "").trim()
  if (!query) {
    return NextResponse.json({ error: "query required" }, { status: 400 })
  }
  if (query.length > 400) {
    return NextResponse.json({ error: "query too long (max 400 chars)" }, { status: 400 })
  }

  try {
    const result = await naturalLanguageSearch(query)
    return NextResponse.json(result)
  } catch (err) {
    console.error("[/api/search/nl] error:", err)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
