import { createClient } from "@/lib/supabase/server"
import { isAdmin } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

interface DealRow {
  id: string
  company: string
  amount_inr: number
  amount_usd: number
  stage: string
  deal_date: string
  sectors: string[]
  investors: string[]
  location: string
  source_url: string | null
  record_status: string
}

function dealsToCSV(deals: DealRow[]): string {
  const headers = [
    "id",
    "company",
    "amount_inr",
    "amount_usd",
    "stage",
    "deal_date",
    "sectors",
    "investors",
    "location",
    "source_url",
    "record_status",
  ]

  const escape = (val: string) => `"${val.replace(/"/g, '""')}"`

  const rows = deals.map((d) =>
    [
      escape(d.id),
      escape(d.company),
      String(d.amount_inr),
      String(d.amount_usd),
      escape(d.stage),
      escape(d.deal_date),
      escape((d.sectors ?? []).join("; ")),
      escape((d.investors ?? []).join("; ")),
      escape(d.location),
      escape(d.source_url ?? ""),
      escape(d.record_status),
    ].join(",")
  )

  return [headers.join(","), ...rows].join("\n")
}

export async function GET(request: NextRequest) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const format = searchParams.get("format") ?? "json"

  if (format !== "csv" && format !== "json") {
    return NextResponse.json({ error: "format must be csv or json" }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: deals, error } = await supabase
    .from("deals")
    .select(
      "id, company, amount_inr, amount_usd, stage, deal_date, sectors, investors, location, source_url, record_status"
    )
    .eq("record_status", "verified")
    .order("deal_date", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const date = new Date().toISOString().split("T")[0]

  if (format === "csv") {
    const csv = dealsToCSV((deals ?? []) as DealRow[])
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="deals-${date}.csv"`,
      },
    })
  }

  // JSON
  return new NextResponse(JSON.stringify(deals ?? [], null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="deals-${date}.json"`,
    },
  })
}
