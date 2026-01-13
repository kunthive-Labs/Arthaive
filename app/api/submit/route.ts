import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase"

const submitSchema = z.object({
  company: z.string().min(2).max(200),
  companyUrl: z.string().url().optional().or(z.literal("")),
  amount: z.number().positive().optional(),
  amountCurrency: z.enum(["INR", "USD"]).default("INR"),
  stage: z.string().min(1),
  sectors: z.array(z.string()).min(1).max(5),
  investors: z.array(z.string()).max(10).default([]),
  city: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sourceUrl: z.string().url(),
  submittedBy: z.string().email().optional().or(z.literal("")),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = submitSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data

    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.from("submissions").insert({
        company: data.company,
        company_url: data.companyUrl || null,
        amount: data.amount || null,
        amount_currency: data.amountCurrency,
        stage: data.stage,
        sectors: data.sectors,
        investors: data.investors,
        city: data.city,
        deal_date: data.date,
        source_url: data.sourceUrl,
        submitted_by: data.submittedBy || null,
        status: "pending",
      })

      if (error) throw error
    }

    return NextResponse.json({ success: true, message: "Submission received. We'll review it shortly." })
  } catch (error) {
    console.error("POST /api/submit error:", error)
    return NextResponse.json({ error: "Submission failed. Please try again." }, { status: 500 })
  }
}
