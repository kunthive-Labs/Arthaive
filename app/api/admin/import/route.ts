import { createClient } from "@/lib/supabase/server"
import { isAdmin } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

const REQUIRED_COLUMNS = ["company"] as const

function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""))

  const rows: Array<Record<string, string>> = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    // Handle quoted fields with commas inside
    const values: string[] = []
    let current = ""
    let inQuotes = false

    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === "," && !inQuotes) {
        values.push(current.trim())
        current = ""
      } else {
        current += char
      }
    }
    values.push(current.trim())

    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.replace(/^"|"$/g, "") ?? ""
    })
    rows.push(row)
  }

  return rows
}

export async function POST(request: NextRequest) {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  const text = await file.text()
  const rows = parseCSV(text)

  if (rows.length === 0) {
    return NextResponse.json({ error: "CSV is empty or has no data rows" }, { status: 400 })
  }

  // Validate required columns exist in first row
  const firstRow = rows[0]
  for (const col of REQUIRED_COLUMNS) {
    if (!(col in firstRow)) {
      return NextResponse.json(
        { error: `Missing required column: ${col}` },
        { status: 400 }
      )
    }
  }

  const supabase = await createClient()
  let queued = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    if (!row.company?.trim()) {
      errors.push(`Row ${i + 2}: missing company name`)
      continue
    }

    const rawData: Record<string, string> = {
      company: row.company?.trim() ?? "",
      amount: row.amount?.trim() ?? "",
      currency: row.currency?.trim() || "INR",
      round_type: row.round_type?.trim() ?? "",
      deal_date: row.deal_date?.trim() ?? "",
      investors: row.investors?.trim() ?? "",
      sectors: row.sectors?.trim() ?? "",
      location: row.location?.trim() ?? "",
      source_url: row.source_url?.trim() ?? "",
    }

    const { error } = await supabase.from("review_queue").insert({
      raw_extracted_data: rawData,
      suggested_company: rawData.company,
      status: "pending",
    })

    if (error) {
      errors.push(`Row ${i + 2} (${row.company}): ${error.message}`)
    } else {
      queued++
    }
  }

  return NextResponse.json({ queued, errors: errors.length > 0 ? errors : undefined })
}
