import { createClient } from "@/lib/supabase/server"
import { isAdmin } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await request.json()) as {
    url: string
    title?: string
    publisher?: string
    reliability_tier?: string
  }

  const { url, title, publisher, reliability_tier } = body

  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: source, error: sourceError } = await supabase
    .from("sources")
    .insert({
      url,
      title: title || null,
      publisher: publisher || null,
      reliability_tier: reliability_tier ?? "tier_2",
      extraction_method: "manual",
      source_type: "manual_entry",
    })
    .select("id")
    .single()

  if (sourceError) {
    return NextResponse.json({ error: sourceError.message }, { status: 500 })
  }

  // Create review_queue entry
  const { error: queueError } = await supabase.from("review_queue").insert({
    source_id: source.id,
    raw_extracted_data: { source_url: url, title, publisher },
    status: "pending",
  })

  if (queueError) {
    // Non-fatal — source was added, queue entry failed
    return NextResponse.json({
      success: true,
      source_id: source.id,
      warning: "Source added but review_queue entry failed: " + queueError.message,
    })
  }

  return NextResponse.json({ success: true, source_id: source.id })
}

export async function PATCH(request: NextRequest) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = (await request.json()) as {
    id: string
    reliability_tier: string
  }

  const { id, reliability_tier } = body

  if (!id || !reliability_tier) {
    return NextResponse.json({ error: "id and reliability_tier are required" }, { status: 400 })
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from("sources")
    .update({ reliability_tier })
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
