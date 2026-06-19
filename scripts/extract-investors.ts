#!/usr/bin/env npx ts-node
/**
 * Extracts unique investor names from funding data and upserts into Supabase investors table.
 * Run after migrate-to-supabase.ts
 * Usage: npx ts-node scripts/extract-investors.ts
 */

import { createClient } from "@supabase/supabase-js"
import { fundingData } from "../data/funding-data"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE env vars")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const SKIP_NAMES = new Set([
  "Not Disclosed", "Undisclosed", "Unknown", "N/A",
  "Multiple Investors", "Various", "Confidential", "",
])

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function inferType(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes("ventures") || lower.includes("venture") || lower.includes("capital") || lower.includes("fund") || lower.includes("partners")) return "VC"
  if (lower.includes("angel")) return "Angel"
  if (lower.includes("government") || lower.includes("ministry") || lower.includes("sidbi") || lower.includes("national")) return "Government"
  if (lower.includes("family")) return "Family Office"
  return "VC"
}

async function main() {
  const investorMap = new Map<string, { deals: typeof fundingData; totalDeployed: number }>()

  for (const deal of fundingData) {
    for (const investor of deal.investors) {
      if (SKIP_NAMES.has(investor)) continue
      if (!investorMap.has(investor)) investorMap.set(investor, { deals: [], totalDeployed: 0 })
      const entry = investorMap.get(investor)!
      entry.deals.push(deal)
      entry.totalDeployed += deal.amount
    }
  }

  console.log(`Found ${investorMap.size} unique investors`)

  // The investors table only stores identity columns (name, slug, type); per-investor
  // stats (deal_count, total_deployed, sectors, …) are computed on the fly from the deals
  // array / mv_investor_summary view, so we only persist identity here.
  const records = [...investorMap.entries()].map(([name]) => ({
    name,
    slug: slugify(name),
    type: inferType(name),
  }))

  const BATCH_SIZE = 100
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.from("investors").upsert(batch, { onConflict: "slug" })
    if (error) console.error(`Batch error:`, error.message)
    else console.log(`  ✓ Inserted batch ${Math.ceil(i / BATCH_SIZE) + 1}`)
  }

  console.log("Done.")
}

main().catch(console.error)
