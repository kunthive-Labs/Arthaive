import { createClient } from "@/lib/supabase/server"
import { isAdmin } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

interface ReviewBody {
  action: "approve" | "reject" | "needs_more_info"
  fields?: {
    company?: string
    amount?: string
    currency?: string
    round_type?: string
    deal_date?: string
    investors?: string
    sectors?: string
    location?: string
    source_url?: string
  }
  notes?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = (await request.json()) as ReviewBody
  const { action, fields, notes } = body

  if (!["approve", "reject", "needs_more_info"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  const supabase = await createClient()

  // Get reviewer email
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const reviewerEmail = user?.email ?? "unknown"

  if (action === "approve" && fields) {
    // Insert into deals table
    const investors = fields.investors
      ? fields.investors.split(",").map((s) => s.trim()).filter(Boolean)
      : []
    const sectors = fields.sectors
      ? fields.sectors.split(",").map((s) => s.trim()).filter(Boolean)
      : []

    const dealDate = fields.deal_date || new Date().toISOString().split("T")[0]
    const dealId = `rq-${id.slice(0, 8)}-${Date.now()}`

    const amountRaw = parseFloat(fields.amount ?? "0") || 0
    const amountInr = fields.currency === "USD" ? amountRaw * 83 : amountRaw
    const amountUsd = fields.currency === "USD" ? amountRaw : amountRaw / 83

    const { error: insertError } = await supabase.from("deals").insert({
      id: dealId,
      company: fields.company ?? "",
      amount_inr: amountInr,
      amount_usd: amountUsd,
      stage: fields.round_type ?? "",
      deal_date: dealDate,
      investors,
      sectors,
      location: fields.location ?? "",
      source_url: fields.source_url ?? "",
      record_status: "verified",
    })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  // Update review_queue status
  const newStatus =
    action === "needs_more_info"
      ? "needs_more_info"
      : action === "approve"
      ? "approved"
      : "rejected"

  const { error: updateError } = await supabase
    .from("review_queue")
    .update({
      status: newStatus,
      reviewed_by: reviewerEmail,
      reviewed_at: new Date().toISOString(),
      notes: notes ?? null,
    })
    .eq("id", id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, action })
}
