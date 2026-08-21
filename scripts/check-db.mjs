#!/usr/bin/env node
// Pre-cutover preflight for the Better Auth PostgreSQL connection.
//
// Verifies that DATABASE_URL is something a Vercel serverless function can
// actually use: IPv4-reachable, TLS-negotiable, and with the `better_auth`
// schema both present and pinned onto the connection's search_path.
//
// Usage:
//   node --env-file=.env.local            scripts/check-db.mjs
//   node --env-file=.env.production.local scripts/check-db.mjs --strict
//   DATABASE_URL='postgresql://...'       node scripts/check-db.mjs --strict
//
// Flags:
//   --strict   Treat Vercel-incompatible configuration (direct IPv6-only host,
//              transaction pooler, unhonoured search_path) as a hard failure.
//              Use this in a pre-deploy gate.
//
// Exit codes: 0 = pass, 1 = failure.

import { Client } from "pg"
import dns from "node:dns/promises"

const AUTH_SCHEMA = "better_auth"
const REQUIRED_TABLES = ["account", "session", "user", "verification"]

const strict = process.argv.includes("--strict")

let failures = 0
let warnings = 0
let blockers = 0

const pass = (msg) => console.log(`  PASS  ${msg}`)
const info = (msg) => console.log(`  INFO  ${msg}`)
const warn = (msg) => {
  warnings += 1
  console.log(`  WARN  ${msg}`)
}
const fail = (msg) => {
  failures += 1
  console.log(`  FAIL  ${msg}`)
}
/**
 * A Vercel-deployability blocker. The database itself may be perfectly healthy
 * (so a local developer should not be blocked), but this configuration cannot
 * be shipped to Vercel. Hard failure under --strict, loud warning otherwise.
 */
const gate = (msg) => {
  blockers += 1
  return strict ? fail(msg) : warn(msg)
}
const section = (title) => console.log(`\n${title}`)

function finish() {
  console.log("")
  if (blockers > 0) {
    console.log(
      `VERCEL READINESS: ${blockers} blocker(s) — this DATABASE_URL must not be used on Vercel. ` +
        (strict ? "" : "Re-run with --strict to make this a hard failure in a pre-deploy gate.")
    )
  } else {
    console.log("VERCEL READINESS: no blockers.")
  }
  if (failures > 0) {
    console.log(`RESULT: FAIL (${failures} failure(s), ${warnings} warning(s))`)
    process.exit(1)
  }
  console.log(`RESULT: PASS (${warnings} warning(s))`)
  process.exit(0)
}

// ---------------------------------------------------------------------------
// 1. Parse and classify DATABASE_URL
// ---------------------------------------------------------------------------

section("DATABASE_URL")

const raw = process.env.DATABASE_URL
if (!raw) {
  fail("DATABASE_URL is not set. Pass it via `node --env-file=.env.local scripts/check-db.mjs`.")
  finish()
}

let url
try {
  url = new URL(raw)
} catch {
  fail("DATABASE_URL is not a valid URL. Expected postgresql://user:password@host:port/database")
  fail("Percent-encode reserved characters (@ : / ? # & %) in the password.")
  finish()
}

if (!/^postgres(ql)?:$/.test(url.protocol)) {
  fail(`Unexpected protocol "${url.protocol}". Expected postgresql://. Do not use the Supabase REST URL here.`)
  finish()
}

const host = url.hostname.toLowerCase()
const port = Number(url.port) || 5432
const database = url.pathname.replace(/^\//, "") || "postgres"
const user = decodeURIComponent(url.username)
const password = decodeURIComponent(url.password)
const sslModeInUrl = url.searchParams.get("sslmode")

// Never print the password.
const redacted = `${url.protocol}//${url.username}:***@${host}:${port}/${database}${url.search}`
info(`url        ${redacted}`)

let mode
if (host.endsWith(".pooler.supabase.com")) {
  mode = port === 6543 ? "supabase-transaction-pooler" : "supabase-session-pooler"
} else if (/^db\.[a-z0-9-]+\.supabase\.(co|com)$/.test(host)) {
  mode = "supabase-direct"
} else {
  mode = "other"
}

const MODE_LABEL = {
  "supabase-direct": "Supabase DIRECT connection (db.<ref>.supabase.co)",
  "supabase-session-pooler": "Supavisor SESSION pooler (port 5432)",
  "supabase-transaction-pooler": "Supavisor TRANSACTION pooler (port 6543)",
  other: "non-Supabase / custom PostgreSQL host",
}
info(`mode       ${MODE_LABEL[mode]}`)

if (mode === "supabase-direct") {
  console.log("")
  console.log("  !! DIRECT CONNECTION DETECTED !!")
  console.log("  Supabase direct endpoints publish AAAA (IPv6) records only. Vercel serverless")
  console.log("  functions have no IPv6 egress, so Better Auth will fail on EVERY request after")
  console.log("  cutover with ENETUNREACH / ENOTFOUND.")
  console.log("  Fix: Supabase Dashboard -> Connect -> Session pooler, and use")
  console.log("    postgresql://postgres.<ref>:<password>@aws-<n>-<region>.pooler.supabase.com:5432/postgres")
  console.log("")
  gate("DATABASE_URL uses the IPv6-only direct connection; unusable on Vercel.")
} else if (mode === "supabase-session-pooler") {
  pass("Session pooler: IPv4-reachable and holds a dedicated backend for the session, so")
  info("       connection-level search_path is honoured. This is the recommended mode.")
} else if (mode === "supabase-transaction-pooler") {
  gate(
    "Transaction pooler (6543) multiplexes per statement; session state such as " +
      `search_path=${AUTH_SCHEMA} is not guaranteed to persist. Prefer port 5432.`
  )
}

if (mode !== "other" && sslModeInUrl && !["no-verify", "disable"].includes(sslModeInUrl)) {
  warn(
    `sslmode=${sslModeInUrl} in the URL: pg >= 8.11 treats require/prefer/verify-ca as verify-full, ` +
      "and Supabase serves a certificate chained to its private 'Supabase Root 2021 CA'."
  )
  info("       lib/auth.ts strips this parameter for Supabase hosts and configures TLS itself.")
  info("       This script tests both verified and unverified TLS below.")
}

// ---------------------------------------------------------------------------
// 2. DNS: is the host reachable from an IPv4-only network (i.e. Vercel)?
// ---------------------------------------------------------------------------

section("DNS")

let v4 = []
let v6 = []
let dnsFatal = false

try {
  v4 = await dns.resolve4(host)
} catch (error) {
  if (error.code === "ENOTFOUND" || error.code === "ENODATA") {
    v4 = []
  } else {
    warn(`IPv4 lookup for ${host} errored: ${error.code ?? error.message}`)
  }
}
try {
  v6 = await dns.resolve6(host)
} catch (error) {
  if (error.code === "ENOTFOUND" || error.code === "ENODATA") {
    v6 = []
  } else {
    warn(`IPv6 lookup for ${host} errored: ${error.code ?? error.message}`)
  }
}

info(`host       ${host}`)
info(`A    (v4)  ${v4.length ? v4.join(", ") : "none"}`)
info(`AAAA (v6)  ${v6.length ? v6.join(", ") : "none"}`)

if (v4.length === 0 && v6.length === 0) {
  dnsFatal = true
  fail(`Cannot resolve ${host} — the DNS name does not exist (NXDOMAIN) or has no address records.`)
  fail("This is a HOST RESOLUTION problem, not a schema problem. Check that the Supabase project")
  fail("still exists and is not paused, and that the project ref in DATABASE_URL is correct.")
} else if (v4.length === 0) {
  gate(
    `${host} has no IPv4 (A) records. Vercel serverless functions have no IPv6 egress and cannot ` +
      "reach this host. Switch to the Supavisor pooler host, which publishes A records."
  )
} else {
  pass(`${host} resolves to IPv4 — reachable from Vercel.`)
}

if (dnsFatal) {
  // Connecting is pointless; report clearly rather than emitting a confusing
  // "connected but schema missing" style failure.
  section("Connection")
  info("Skipped: hostname does not resolve.")
  finish()
}

// ---------------------------------------------------------------------------
// 3. Connect. Try verified TLS first, then fall back to encrypted-but-unverified.
// ---------------------------------------------------------------------------

section("TLS / connection")

const baseConfig = {
  host,
  port,
  database,
  user,
  password,
  connectionTimeoutMillis: 15_000,
  application_name: "arthaive-check-db",
  // Same startup parameter lib/auth.ts sends, so this script exercises the real
  // code path and can report whether the pooler forwards it.
  options: `-c search_path=${AUTH_SCHEMA}`,
}

const ca = process.env.DATABASE_SSL_CA

function describeConnectError(error) {
  const code = error.code ?? error.errors?.[0]?.code ?? "(no code)"
  const message = error.message ?? String(error)
  switch (code) {
    case "ENOTFOUND":
    case "EAI_AGAIN":
      return `DNS/hostname failure (${code}): ${message}`
    case "ENETUNREACH":
    case "EHOSTUNREACH":
      return `Network unreachable (${code}) — the classic IPv6-only symptom: ${message}`
    case "ECONNREFUSED":
      return `Connection refused (${code}) — wrong port, or the pooler is not listening: ${message}`
    case "ETIMEDOUT":
      return `Timed out (${code}) — firewall, wrong host, or a saturated pooler: ${message}`
    case "SELF_SIGNED_CERT_IN_CHAIN":
    case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
    case "DEPTH_ZERO_SELF_SIGNED_CERT":
      return `TLS verification failed (${code}): ${message}`
    case "28P01":
      return `Password authentication failed (${code}): ${message}`
    case "28000":
      return `Role not authorized (${code}): ${message}`
    case "3D000":
      return `Database "${database}" does not exist (${code}): ${message}`
    case "XX000":
      return `Pooler rejected the connection (${code}): ${message}`
    default:
      return `${code}: ${message}`
  }
}

async function tryConnect(ssl) {
  const candidate = new Client({ ...baseConfig, ssl })
  try {
    await candidate.connect()
    return { client: candidate }
  } catch (error) {
    try {
      await candidate.end()
    } catch {
      /* ignore */
    }
    return { error }
  }
}

// Ordered most-secure-first. The first attempt that connects wins, and the
// label tells the operator exactly what TLS guarantee they are getting.
const attempts = []
if (sslModeInUrl === "disable") {
  attempts.push([false, "no TLS (sslmode=disable)"])
} else {
  if (ca && ca.includes("BEGIN CERTIFICATE")) {
    attempts.push([{ ca, rejectUnauthorized: true }, "verified TLS using DATABASE_SSL_CA"])
  } else {
    info("DATABASE_SSL_CA is not set; probing whether the system trust store accepts the server cert.")
  }
  attempts.push([{ rejectUnauthorized: true }, "verified TLS using the system trust store"])
  attempts.push([{ rejectUnauthorized: false }, "encrypted TLS, certificate NOT verified"])
  if (mode === "other") attempts.push([false, "no TLS"])
}

let client = null
let usedLabel = null
const attemptErrors = []

for (const [ssl, label] of attempts) {
  const result = await tryConnect(ssl)
  if (result.client) {
    client = result.client
    usedLabel = label
    break
  }
  attemptErrors.push([label, result.error])
  const code = String(result.error.code ?? "")
  // A credential/host/network error will fail identically for every TLS mode,
  // so stop early instead of emitting three copies of the same message.
  if (!code.includes("CERT") && !code.includes("SELF_SIGNED") && code !== "ERR_SSL_WRONG_VERSION_NUMBER") {
    break
  }
}

if (!client) {
  for (const [label, error] of attemptErrors) {
    fail(`${label} -> ${describeConnectError(error)}`)
  }
  fail("This is a CONNECTION problem, not a schema problem. The schema checks below were not run.")
  finish()
}

pass(`Connected with ${usedLabel}.`)
if (usedLabel.startsWith("no TLS")) {
  warn("The connection is NOT encrypted. Never ship this to a deployed environment.")
}
if (usedLabel.includes("NOT verified")) {
  warn(
    "The server certificate could not be verified against a trusted CA. Supabase chains to its own " +
      "private 'Supabase Root 2021 CA', so this is expected; traffic is encrypted but not authenticated."
  )
  info("       For verified TLS: Supabase Dashboard -> Project Settings -> Database -> SSL configuration,")
  info("       download the certificate and set DATABASE_SSL_CA to its PEM contents.")
  info('       Do NOT put "?sslmode=require" in DATABASE_URL: pg treats it as verify-full and it will fail.')
}

// ---------------------------------------------------------------------------
// 4. Did the startup `options` parameter survive the pooler?
// ---------------------------------------------------------------------------

section("search_path")

const startup = await client.query("show search_path")
const startupSearchPath = startup.rows[0]?.search_path ?? "(unknown)"
info(`after connect (startup "options" only): search_path = ${startupSearchPath}`)

if (startupSearchPath.replace(/"/g, "").split(",").map((s) => s.trim())[0] === AUTH_SCHEMA) {
  pass(`The pooler forwarded "-c search_path=${AUTH_SCHEMA}" from the startup packet.`)
} else {
  warn(
    `Startup parameter "-c search_path=${AUTH_SCHEMA}" was NOT applied. lib/auth.ts also issues an ` +
      "explicit SET on every new connection, which is tested next."
  )
}

await client.query(`set search_path to "${AUTH_SCHEMA}"`)

// ---------------------------------------------------------------------------
// 5. Schema + tables. Catalog-only queries so nothing throws on a missing schema.
// ---------------------------------------------------------------------------

const probeSql = `
  select
    (select true from pg_namespace where nspname = $1) as schema_exists,
    (select has_schema_privilege(current_user, oid, 'USAGE')
       from pg_namespace where nspname = $1) as can_use_schema,
    current_user as role_name,
    current_database() as db_name,
    current_schema() as observed_schema,
    current_setting('search_path') as search_path,
    version() as server_version
`
const probe = (await client.query(probeSql, [AUTH_SCHEMA])).rows[0]

info(`after explicit SET: search_path = ${probe.search_path}`)
info(`current_schema()  = ${probe.observed_schema ?? "null"}`)
info(`role              = ${probe.role_name}`)
info(`database          = ${probe.db_name}`)
info(`server            = ${String(probe.server_version).split(" on ")[0]}`)

if (probe.observed_schema === AUTH_SCHEMA) {
  pass(`Effective schema for unqualified table names is "${AUTH_SCHEMA}".`)
  if (mode === "supabase-transaction-pooler") {
    warn(
      "A PASS here is NOT proof that transaction mode is safe. This script uses one client with no " +
        "contention, so every statement landed on the same backend. Under real concurrency Supavisor " +
        "reassigns backends between transactions and the SET can be lost. Use port 5432."
    )
  }
} else {
  gate(
    `search_path did not stick: current_schema() = "${probe.observed_schema ?? "null"}". ` +
      "Unqualified Better Auth queries would resolve against the wrong schema and produce " +
      `'relation "user" does not exist'. Switch to the SESSION pooler on port 5432.`
  )
}

section("Schema: better_auth")

if (!probe.schema_exists) {
  fail(`Schema "${AUTH_SCHEMA}" does not exist in database "${probe.db_name}".`)
  fail("Apply supabase/migrations/022_better_auth_schema.sql to THIS project, or check that")
  fail("DATABASE_URL is not pointing at a different Supabase project.")
} else {
  pass(`Schema "${AUTH_SCHEMA}" exists.`)
  if (probe.can_use_schema === false) {
    fail(`permission denied for schema "${AUTH_SCHEMA}": role "${probe.role_name}" lacks USAGE.`)
    fail("Use the Supabase-provided database role, or apply the grants documented at the bottom of")
    fail("supabase/migrations/022_better_auth_schema.sql.")
  } else {
    pass(`Role "${probe.role_name}" has USAGE on the schema.`)
  }

  const tables = await client.query(
    `select c.relname,
            has_table_privilege(current_user, c.oid, 'SELECT') as can_select,
            has_table_privilege(current_user, c.oid, 'INSERT') as can_insert
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = $1 and c.relkind in ('r', 'p')
      order by c.relname`,
    [AUTH_SCHEMA]
  )
  const found = new Map(tables.rows.map((row) => [row.relname, row]))

  for (const table of REQUIRED_TABLES) {
    const row = found.get(table)
    if (!row) {
      fail(`Missing table ${AUTH_SCHEMA}."${table}" (created by migration 022).`)
    } else if (!row.can_select || !row.can_insert) {
      fail(
        `${AUTH_SCHEMA}."${table}" exists but role "${probe.role_name}" lacks ` +
          `${!row.can_select ? "SELECT" : ""}${!row.can_select && !row.can_insert ? "/" : ""}${!row.can_insert ? "INSERT" : ""}.`
      )
    } else {
      pass(`${AUTH_SCHEMA}."${table}" present and writable.`)
    }
  }

  const extra = [...found.keys()].filter((name) => !REQUIRED_TABLES.includes(name))
  if (extra.length) info(`other tables in schema: ${extra.join(", ")}`)

  // Exercise the exact query shape Better Auth uses: unqualified, relying on
  // search_path. This is what actually breaks when isolation silently fails.
  try {
    const smoke = await client.query('select count(*)::int as n from "user"')
    pass(`Unqualified 'select from "user"' resolved via search_path (${smoke.rows[0].n} row(s)).`)
  } catch (error) {
    fail(`Unqualified 'select from "user"' failed — ${error.code ?? ""} ${error.message}`)
    fail("This is exactly the runtime failure Better Auth would hit.")
  }
}

await client.end()
finish()
