#!/usr/bin/env npx ts-node
/**
 * Migrates all CSV funding data from funding_data/ into Supabase.
 * Run after setting SUPABASE_SERVICE_ROLE_KEY in .env.local
 * Usage: npx ts-node scripts/migrate-to-supabase.ts
 */

import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const USD_TO_INR = 84.5
const FUNDING_DATA_DIR = path.join(__dirname, "../funding_data")

interface RawDeal {
  Company: string
  "Amount ($M)": string
  Date: string
  HQ: string
  Sector: string
  Series: string
  Source: string
}

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
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`
  }
  return null
}

function parseAmount(raw: string): { inr: number; usd: number } {
  if (!raw || raw.trim() === "") return { inr: 0, usd: 0 }
  const cleaned = raw.replace(/[$,]/g, "").trim()
  const usd = parseFloat(cleaned)
  if (isNaN(usd)) return { inr: 0, usd: 0 }
  const inr = usd * USD_TO_INR * 100 // convert to lakhs
  return { inr: Math.round(inr * 100) / 100, usd }
}

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

async function processCSVFile(csvPath: string, weekFolder: string) {
  const content = fs.readFileSync(csvPath, "utf-8")
  const lines = content.split("\n").filter((l) => l.trim())
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0]).map((h) => h.replace(/^﻿/, "").trim())
  const deals: Record<string, unknown>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length < headers.length) continue

    const raw: Partial<RawDeal> = {}
    headers.forEach((h, idx) => { (raw as Record<string, string>)[h] = values[idx] || "" })

    const date = parseDate(raw.Date || "")
    if (!date) continue

    const { inr, usd } = parseAmount(raw["Amount ($M)"] || "")
    const companyUrl = (raw.Company || "").startsWith("http") ? raw.Company : ""
    const companyName = companyUrl
      ? companyUrl.replace(/^https?:\/\/(www\.)?/, "").split("/")[0].replace(/\..*$/, "")
      : raw.Company || ""

    const sectors = (raw.Sector || "").split(",").map((s) => s.trim()).filter(Boolean)
    const stage = raw.Series || "Unknown"
    const id = `${weekFolder}-${i}`

    deals.push({
      id,
      company: companyName,
      company_url: companyUrl || null,
      amount_inr: inr,
      amount_usd: usd,
      stage,
      sectors,
      investors: [],
      lead_investor: null,
      deal_date: date,
      location: raw.HQ || "Unknown",
      source_url: raw.Source || null,
      week_folder: weekFolder,
    })
  }

  return deals
}

async function main() {
  console.log("Starting migration to Supabase...")
  const weekFolders = fs.readdirSync(FUNDING_DATA_DIR).filter((f) => {
    return fs.statSync(path.join(FUNDING_DATA_DIR, f)).isDirectory()
  })

  let totalInserted = 0
  let totalErrors = 0

  for (const folder of weekFolders) {
    const csvPath = path.join(FUNDING_DATA_DIR, folder, "data.csv")
    if (!fs.existsSync(csvPath)) continue

    const deals = await processCSVFile(csvPath, folder)
    if (deals.length === 0) continue

    const { error } = await supabase.from("deals").upsert(deals, { onConflict: "id" })
    if (error) {
      console.error(`Error inserting ${folder}:`, error.message)
      totalErrors++
    } else {
      console.log(`  ✓ ${folder}: ${deals.length} deals`)
      totalInserted += deals.length
    }
  }

  console.log(`\nMigration complete: ${totalInserted} deals inserted, ${totalErrors} errors`)
}

main().catch(console.error)
