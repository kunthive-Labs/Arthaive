#!/usr/bin/env npx ts-node
/**
 * Migrates all CSV funding data from funding_data/ into Supabase.
 *
 * Prerequisites:
 *   - Run SQL migrations 001–015 in Supabase dashboard first
 *   - Set env vars in .env.local:
 *       NEXT_PUBLIC_SUPABASE_URL=...
 *       SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Usage:
 *   npx ts-node scripts/migrate-to-supabase.ts [--dry-run] [--batch-size=50]
 *
 * Flags:
 *   --dry-run     Parse and validate CSVs without writing to Supabase
 *   --batch-size  Deals per upsert batch (default: 50)
 */

import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"

// ─── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const DRY_RUN      = process.argv.includes("--dry-run")
const BATCH_SIZE   = parseInt(
  (process.argv.find((a) => a.startsWith("--batch-size=")) || "").replace("--batch-size=", "") || "50"
)
const FUNDING_DATA_DIR = path.join(__dirname, "../funding_data")
const USD_TO_INR = 84.5

if (!DRY_RUN && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  console.error("   Set them in .env.local or export them in your shell before running.")
  process.exit(1)
}

const supabase = DRY_RUN
  ? null
  : createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawDeal {
  Company: string
  "Amount ($M)": string
  Date: string
  HQ: string
  Sector: string
  Series: string
  Source: string
  Investors?: string
}

interface NormalizedDeal {
  id: string
  company: string
  company_url: string | null
  amount_inr: number
  amount_usd: number
  stage: string
  sectors: string[]
  investors: string[]
  lead_investor: string | null
  deal_date: string
  location: string
  description: string | null
  source_url: string | null
  week_folder: string
  record_status: string
}

// ─── Parsers ─────────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; continue }
    if (char === "," && !inQuotes) { result.push(current.trim()); current = ""; continue }
    current += char
  }
  result.push(current.trim())
  return result
}

function parseDate(raw: string): string | null {
  if (!raw) return null
  const parts = raw.split("/")
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts
    const year = yyyy.length === 2 ? `20${yyyy}` : yyyy
    return `${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`
  }
  // Try ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  return null
}

function parseAmount(raw: string): { inr: number; usd: number } {
  if (!raw || raw.trim() === "") return { inr: 0, usd: 0 }
  const cleaned = raw.replace(/[$,\s]/g, "")
  const usd = parseFloat(cleaned)
  if (isNaN(usd) || usd < 0) return { inr: 0, usd: 0 }
  // Amount in CSV is USD millions → convert to INR lakhs
  const inr = Math.round(usd * USD_TO_INR * 100) / 100
  return { inr, usd }
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function parseInvestors(raw: string): { investors: string[]; leadInvestor: string | null } {
  if (!raw || raw.trim() === "") return { investors: [], leadInvestor: null }
  // Investors are semicolon-separated in the CSV (matches generate-funding-data.js).
  // Splitting on comma would wrongly break names like "Acme Ventures, LLC".
  const parts = raw.split(";").map((s) => s.trim()).filter(Boolean)
  return { investors: parts, leadInvestor: parts[0] || null }
}

// ─── CSV processing ───────────────────────────────────────────────────────────

function processCSVFile(csvPath: string, weekFolder: string): NormalizedDeal[] {
  const content = fs.readFileSync(csvPath, "utf-8")
  const lines = content.split("\n").filter((l) => l.trim())
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0]).map((h) => h.replace(/^﻿/, "").trim())
  const deals: NormalizedDeal[] = []
  const skipped: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length < 3) continue

    const raw: Partial<RawDeal> = {}
    headers.forEach((h, idx) => { (raw as Record<string, string>)[h] = values[idx] || "" })

    const date = parseDate(raw.Date || "")
    if (!date) {
      skipped.push(`row ${i + 1}: invalid date "${raw.Date}"`)
      continue
    }

    const { inr, usd } = parseAmount(raw["Amount ($M)"] || "")
    const rawCompany   = (raw.Company || "").trim()
    const companyUrl   = rawCompany.startsWith("http") ? rawCompany : null
    const companyName  = companyUrl
      ? rawCompany.replace(/^https?:\/\/(www\.)?/, "").split("/")[0].replace(/\..*$/, "")
      : rawCompany
    if (!companyName) { skipped.push(`row ${i + 1}: missing company name`); continue }

    const sectors = (raw.Sector || "").split(",").map((s) => s.trim()).filter(Boolean)
    const stage   = (raw.Series || "Unknown").trim()
    const { investors, leadInvestor } = parseInvestors(raw.Investors || "")
    const id      = `${weekFolder}-${i}`

    deals.push({
      id,
      company:      companyName,
      company_url:  companyUrl,
      amount_inr:   inr,
      amount_usd:   usd,
      stage,
      sectors,
      investors,
      lead_investor: leadInvestor,
      deal_date:    date,
      location:     (raw.HQ || "Unknown").trim(),
      description:  null,
      source_url:   raw.Source || null,
      week_folder:  weekFolder,
      record_status: "verified",
    })
  }

  if (skipped.length > 0) {
    console.warn(`  ⚠  ${weekFolder}: skipped ${skipped.length} rows`)
    if (skipped.length <= 3) skipped.forEach((s) => console.warn(`     ${s}`))
  }

  return deals
}

// ─── Batch upsert ─────────────────────────────────────────────────────────────

async function upsertBatch(deals: NormalizedDeal[]): Promise<number> {
  if (!supabase) return deals.length // dry run
  const { error } = await supabase.from("deals").upsert(deals, { onConflict: "id" })
  if (error) throw new Error(error.message)
  return deals.length
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN — no data will be written\n" : "🚀 Migrating to Supabase...\n")

  if (!fs.existsSync(FUNDING_DATA_DIR)) {
    console.error(`❌ funding_data directory not found at: ${FUNDING_DATA_DIR}`)
    process.exit(1)
  }

  const weekFolders = fs
    .readdirSync(FUNDING_DATA_DIR)
    .filter((f) => fs.statSync(path.join(FUNDING_DATA_DIR, f)).isDirectory())
    .sort()

  console.log(`Found ${weekFolders.length} week folders\n`)

  let totalParsed   = 0
  let totalInserted = 0
  let totalErrors   = 0
  const allDeals: NormalizedDeal[] = []

  // Parse all CSVs first
  for (const folder of weekFolders) {
    const csvPath = path.join(FUNDING_DATA_DIR, folder, "data.csv")
    if (!fs.existsSync(csvPath)) {
      console.warn(`  ⚠  No data.csv in ${folder}`)
      continue
    }
    const deals = processCSVFile(csvPath, folder)
    totalParsed += deals.length
    allDeals.push(...deals)
    process.stdout.write(`  ✓ parsed ${folder}: ${deals.length} deals\r`)
  }

  console.log(`\n\n📊 Parsed ${totalParsed} deals across ${weekFolders.length} folders`)

  if (DRY_RUN) {
    console.log("\n✅ Dry run complete. No data written.")
    const stageCounts: Record<string, number> = {}
    allDeals.forEach((d) => { stageCounts[d.stage] = (stageCounts[d.stage] || 0) + 1 })
    console.log("\nStage breakdown:")
    Object.entries(stageCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([stage, count]) => console.log(`  ${stage.padEnd(20)} ${count}`))
    return
  }

  // Upsert in batches
  console.log(`\nUploading in batches of ${BATCH_SIZE}...\n`)

  for (let i = 0; i < allDeals.length; i += BATCH_SIZE) {
    const batch = allDeals.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(allDeals.length / BATCH_SIZE)

    try {
      await upsertBatch(batch)
      totalInserted += batch.length
      process.stdout.write(
        `  Batch ${batchNum}/${totalBatches} — ${totalInserted}/${allDeals.length} inserted\r`
      )
    } catch (err) {
      console.error(`\n  ❌ Batch ${batchNum} failed: ${(err as Error).message}`)
      totalErrors++

      // Retry individual records in failed batch
      for (const deal of batch) {
        try {
          await upsertBatch([deal])
          totalInserted++
        } catch {
          console.error(`     ↳ skipped ${deal.company} (${deal.id})`)
        }
      }
    }
  }

  console.log(`\n\n✅ Migration complete`)
  console.log(`   Inserted: ${totalInserted}`)
  console.log(`   Errors:   ${totalErrors}`)
  console.log(`   Total:    ${allDeals.length}`)

  if (totalInserted > 0) {
    console.log("\nNext steps:")
    console.log("  1. Run supabase/seed_aliases.sql to seed known entity aliases")
    console.log("  2. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel")
    console.log("  3. Redeploy — the app will now read from Supabase")
  }
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
