// Full data export from Supabase for DB provider migration.
// Usage: node --env-file=.env.local scripts/export-supabase.mjs
// Writes one JSON file per table to supabase_export/ plus a manifest with row counts.
import { createClient } from "@supabase/supabase-js"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const TABLES = [
  "sectors",
  "investors",
  "deals",
  "submissions",
  "profiles",
  "bookmarks",
  "watchlist",
  "saved_searches",
  "alerts",
  "sources",
  "startup_aliases",
  "investor_aliases",
  "review_queue",
  "pipeline_jobs",
  "report_summaries",
  "sector_cache",
  "ai_usage_log",
  "api_keys",
  "dashboards",
  "deal_notes",
]

const PAGE = 1000
const outDir = path.join(process.cwd(), "supabase_export")
mkdirSync(outDir, { recursive: true })

const supabase = createClient(url, key, { auth: { persistSession: false } })

async function exportTable(table) {
  const rows = []
  // Stable pagination needs an order column; fall back if the first choice is absent.
  const orderCandidates = ["id", "created_at", null]
  let orderBy = orderCandidates[0]
  for (let offset = 0; ; offset += PAGE) {
    let query = supabase.from(table).select("*", { count: "exact" }).range(offset, offset + PAGE - 1)
    if (orderBy) query = query.order(orderBy, { ascending: true })
    let { data, error, count } = await query
    if (error && orderBy && /column .* does not exist/i.test(error.message)) {
      orderBy = orderCandidates[orderCandidates.indexOf(orderBy) + 1] ?? null
      offset -= PAGE
      continue
    }
    if (error) return { table, error: error.message, rows: rows.length }
    rows.push(...data)
    if (rows.length >= (count ?? 0) || data.length < PAGE) {
      writeFileSync(path.join(outDir, `${table}.json`), JSON.stringify(rows, null, 1))
      return { table, rows: rows.length, expected: count ?? rows.length }
    }
  }
}

async function exportAuthUsers() {
  const users = []
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) return { table: "auth.users", error: error.message, rows: users.length }
    users.push(...data.users)
    if (data.users.length < 1000) break
  }
  writeFileSync(path.join(outDir, "auth_users.json"), JSON.stringify(users, null, 1))
  return { table: "auth.users", rows: users.length, expected: users.length }
}

async function exportStorage() {
  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) return { table: "storage", error: error.message, rows: 0 }
  const inventory = []
  for (const bucket of buckets ?? []) {
    let offset = 0
    for (;;) {
      const { data: objects, error: listErr } = await supabase.storage
        .from(bucket.name)
        .list("", { limit: 1000, offset })
      if (listErr || !objects?.length) break
      inventory.push(...objects.map((o) => ({ bucket: bucket.name, ...o })))
      if (objects.length < 1000) break
      offset += 1000
    }
  }
  writeFileSync(path.join(outDir, "storage_inventory.json"), JSON.stringify({ buckets, objects: inventory }, null, 1))
  return { table: "storage (inventory only)", rows: inventory.length, expected: inventory.length }
}

const results = []
for (const table of TABLES) {
  const r = await exportTable(table)
  results.push(r)
  console.log(r.error ? `✗ ${table}: ${r.error}` : `✓ ${table}: ${r.rows} rows`)
}
results.push(await exportAuthUsers())
console.log(`✓ auth.users: ${results.at(-1).rows} users`)
results.push(await exportStorage())
console.log(`✓ storage inventory: ${results.at(-1).rows} objects`)

const manifest = {
  exportedAt: new Date().toISOString(),
  source: url,
  results,
}
writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2))
const failed = results.filter((r) => r.error)
console.log(`\nDone. ${results.length - failed.length}/${results.length} exports succeeded → supabase_export/`)
if (failed.length) {
  console.log("Failures:", failed.map((f) => `${f.table} (${f.error})`).join(", "))
  process.exit(2)
}
