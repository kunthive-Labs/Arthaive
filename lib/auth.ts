import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { Pool, type ClientBase, type PoolConfig } from "pg"

// ---------------------------------------------------------------------------
// Better Auth's PostgreSQL pool, tuned for Vercel's serverless runtime.
//
// Three constraints drive everything below:
//
//  1. IPv6. Supabase's DIRECT endpoint (db.<ref>.supabase.co) only publishes
//     AAAA records. Vercel functions have no IPv6 egress, so a direct URL fails
//     on every request with ENETUNREACH/ENOTFOUND. The Supavisor pooler
//     (aws-<n>-<region>.pooler.supabase.com) publishes A records and is the
//     only reachable option. See `assertUsableConnection` below.
//
//  2. Schema isolation. Better Auth's tables live in the dedicated
//     `better_auth` schema (supabase/migrations/022_better_auth_schema.sql),
//     not in `public`. If search_path is not pinned, every query degrades into
//     `relation "user" does not exist`. See `pinAuthSchema` below.
//
//  3. Connection budget. Each concurrent function instance builds its own pool,
//     so the pool must be tiny and must release idle slots quickly; Supavisor,
//     not this pool, does the real multiplexing.
// ---------------------------------------------------------------------------

const AUTH_SCHEMA = "better_auth"
const REQUIRED_TABLES = ["account", "session", "user", "verification"] as const

// Next.js imports this module during `next build` for route analysis. Nothing
// here may open a socket or throw in that phase, otherwise a missing build-time
// DATABASE_URL breaks the build instead of the (correct) runtime error.
const isNextBuildPhase = process.env.NEXT_PHASE === "phase-production-build"
const isProductionRuntime = process.env.NODE_ENV === "production" && !isNextBuildPhase

type ConnectionMode =
  | "missing"
  | "unparseable"
  | "supabase-direct"
  | "supabase-session-pooler"
  | "supabase-transaction-pooler"
  | "other"

type ConnectionInfo = {
  mode: ConnectionMode
  host: string | null
  port: number | null
  /** DATABASE_URL with Supabase-specific TLS query params removed (see `resolveSsl`). */
  connectionString: string | undefined
  sslModeInUrl: string | null
}

function classifyConnection(raw: string | undefined): ConnectionInfo {
  if (!raw) {
    return { mode: "missing", host: null, port: null, connectionString: undefined, sslModeInUrl: null }
  }

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { mode: "unparseable", host: null, port: null, connectionString: raw, sslModeInUrl: null }
  }

  const host = url.hostname.toLowerCase()
  const port = Number(url.port) || 5432
  const sslModeInUrl = url.searchParams.get("sslmode")

  let mode: ConnectionMode = "other"
  if (host.endsWith(".pooler.supabase.com")) {
    // Supavisor: 5432 = session mode, 6543 = transaction mode.
    mode = port === 6543 ? "supabase-transaction-pooler" : "supabase-session-pooler"
  } else if (/^db\.[a-z0-9-]+\.supabase\.(co|com)$/.test(host)) {
    mode = "supabase-direct"
  }

  let connectionString = raw
  if (mode !== "other") {
    // pg >= 8.11 parses `sslmode=require|prefer|verify-ca` as verify-full, and a
    // value in the URL always wins over the `ssl` option passed to the Pool.
    // Supabase serves a certificate chained to its own private
    // "Supabase Root 2021 CA", which is not in Node's trust store, so the
    // dashboard's copy-paste `?sslmode=require` URL fails the handshake with
    // SELF_SIGNED_CERT_IN_CHAIN. Strip the TLS query params for Supabase hosts
    // and decide TLS in `resolveSsl` instead, so behaviour is predictable
    // regardless of which URL variant was pasted into Vercel.
    url.searchParams.delete("sslmode")
    url.searchParams.delete("uselibpqcompat")
    url.searchParams.delete("sslrootcert")
    connectionString = url.toString()
  }

  return { mode, host, port, connectionString, sslModeInUrl }
}

const connection = classifyConnection(process.env.DATABASE_URL)

/**
 * TLS for Supabase hosts. Traffic is always encrypted. Certificate verification
 * is only possible when the operator supplies Supabase's root CA (Dashboard ->
 * Project Settings -> Database -> SSL configuration -> download certificate),
 * pasted as a PEM into DATABASE_SSL_CA. Without it we encrypt but cannot verify,
 * which is what `sslmode=no-verify` does and what Supabase's own guidance
 * assumes. Non-Supabase URLs keep whatever the connection string asks for.
 */
function resolveSsl(): PoolConfig["ssl"] {
  if (connection.mode === "missing" || connection.mode === "other" || connection.mode === "unparseable") {
    return undefined
  }
  const ca = process.env.DATABASE_SSL_CA
  if (ca && ca.includes("BEGIN CERTIFICATE")) {
    return { ca, rejectUnauthorized: true }
  }
  return { rejectUnauthorized: false }
}

// ---------------------------------------------------------------------------
// Guard: refuse to run in production against a connection Vercel cannot reach.
// ---------------------------------------------------------------------------

const DIRECT_CONNECTION_HELP = [
  `DATABASE_URL points at the Supabase DIRECT connection (${connection.host}:${connection.port}).`,
  "Supabase direct connections resolve to IPv6 only, and Vercel serverless functions have no",
  "IPv6 egress, so every Better Auth request would fail with ENETUNREACH / ENOTFOUND.",
  "",
  "Use the Supavisor SESSION pooler instead (Supabase Dashboard -> Connect -> Session pooler):",
  "  postgresql://postgres.<project-ref>:<url-encoded-password>@aws-<n>-<region>.pooler.supabase.com:5432/postgres",
  "",
  "Port 5432 = session mode (dedicated backend for the session; search_path is honoured).",
  "Port 6543 = transaction mode (per-statement multiplexing; session state is NOT reliable).",
  "",
  "Run `node --env-file=.env.production.local scripts/check-db.mjs` to validate a candidate URL.",
  "If this deployment genuinely has IPv6 egress, set ALLOW_DIRECT_DATABASE_URL=true to override.",
].join("\n")

function assertUsableConnection(): void {
  if (!isProductionRuntime) {
    // Local development and `next build` keep working with a direct connection.
    return
  }
  if (connection.mode === "missing") {
    throw new Error(
      "[auth/db] DATABASE_URL is not set. Better Auth cannot start. Add the Supabase Supavisor " +
        "session-pooler URL to the Vercel project's environment variables for this environment."
    )
  }
  if (connection.mode === "unparseable") {
    throw new Error(
      "[auth/db] DATABASE_URL is not a valid URL. Expected " +
        "postgresql://user:password@host:port/database (percent-encode reserved characters in the password)."
    )
  }
  if (connection.mode === "supabase-direct" && process.env.ALLOW_DIRECT_DATABASE_URL !== "true") {
    throw new Error(`[auth/db] ${DIRECT_CONNECTION_HELP}`)
  }
}

assertUsableConnection()

// Non-fatal advisories. These are configurations that can work but are known to
// be fragile, so surface them once at module load rather than at 3am.
if (connection.mode === "missing" && !isProductionRuntime) {
  console.warn("[auth/db] DATABASE_URL is not set; Better Auth database operations will fail")
}
if (connection.mode === "supabase-transaction-pooler") {
  console.warn(
    "[auth/db] DATABASE_URL uses the Supavisor TRANSACTION pooler (port 6543). Connections are " +
      `multiplexed per statement, so the connection-level "search_path=${AUTH_SCHEMA}" this app ` +
      "depends on is not guaranteed to survive between statements. Prefer the SESSION pooler on " +
      "port 5432. Every new connection is verified below and will fail loudly if the schema did not apply."
  )
}
if (connection.sslModeInUrl && connection.mode !== "other" && connection.mode !== "missing") {
  console.info(
    `[auth/db] Ignoring "sslmode=${connection.sslModeInUrl}" from DATABASE_URL; TLS for Supabase hosts ` +
      "is configured in lib/auth.ts (set DATABASE_SSL_CA to enable certificate verification)."
  )
}

// ---------------------------------------------------------------------------
// search_path: pinned twice, then proven.
// ---------------------------------------------------------------------------

const SCHEMA_PROBE_SQL = `
  select
    (select true from pg_namespace where nspname = '${AUTH_SCHEMA}') as schema_exists,
    (select has_schema_privilege(current_user, oid, 'USAGE')
       from pg_namespace where nspname = '${AUTH_SCHEMA}') as can_use_schema,
    (select count(*)
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = '${AUTH_SCHEMA}'
        and c.relkind in ('r', 'p')
        and c.relname in (${REQUIRED_TABLES.map((t) => `'${t}'`).join(", ")})) as table_count,
    current_schema() as observed_schema,
    current_setting('search_path') as search_path
`

type SchemaProbe = {
  schema_exists: boolean | null
  can_use_schema: boolean | null
  table_count: string | number | null
  observed_schema: string | null
  search_path: string | null
}

/**
 * Runs once per newly established *physical* connection, before pg hands the
 * client to the caller. `onConnect` is awaited by pg-pool, and a rejection
 * tears the connection down and surfaces the error to whoever asked for it —
 * which is exactly the "fail loudly and early" behaviour we want.
 *
 * Two independent mechanisms pin the schema:
 *   1. `options: "-c search_path=..."` in the pool config, applied in the
 *      startup packet. Honoured by direct connections and by Supavisor session
 *      mode; Supavisor accepts the parameter on both ports.
 *   2. This explicit `SET`, which does not rely on startup parameters at all.
 *
 * Neither is trustworthy in transaction mode (session state can be discarded
 * between statements), so we never assume: the probe below re-reads the
 * effective search_path from the same connection and refuses to hand back a
 * client that would silently resolve `user` to `public.user`.
 */
async function pinAuthSchema(client: ClientBase): Promise<void> {
  await client.query(`set search_path to "${AUTH_SCHEMA}"`)

  const { rows } = await client.query<SchemaProbe>(SCHEMA_PROBE_SQL)
  const probe = rows[0]
  if (!probe) {
    throw new Error("[auth/db] Schema verification query returned no rows; refusing to serve auth traffic.")
  }

  if (!probe.schema_exists) {
    throw new Error(
      `[auth/db] Schema "${AUTH_SCHEMA}" does not exist on ${connection.host ?? "the configured database"}. ` +
        "Apply supabase/migrations/022_better_auth_schema.sql to THIS project, or check that " +
        "DATABASE_URL is not pointing at a different Supabase project."
    )
  }

  if (probe.can_use_schema === false) {
    throw new Error(
      `[auth/db] permission denied for schema "${AUTH_SCHEMA}": the role in DATABASE_URL lacks USAGE. ` +
        "Use the Supabase-provided database role, or apply the grants documented at the bottom of " +
        "supabase/migrations/022_better_auth_schema.sql."
    )
  }

  const tableCount = Number(probe.table_count ?? 0)
  if (tableCount < REQUIRED_TABLES.length) {
    throw new Error(
      `[auth/db] Expected ${REQUIRED_TABLES.length} Better Auth tables (${REQUIRED_TABLES.join(", ")}) in ` +
        `schema "${AUTH_SCHEMA}" but found ${tableCount}. Apply supabase/migrations/022_better_auth_schema.sql.`
    )
  }

  if (probe.observed_schema !== AUTH_SCHEMA) {
    throw new Error(
      `[auth/db] search_path did not apply: expected "${AUTH_SCHEMA}" but the connection reports ` +
        `search_path="${probe.search_path ?? "?"}" (current_schema="${probe.observed_schema ?? "null"}"). ` +
        "Unqualified Better Auth queries would hit the wrong schema. This is the expected symptom of the " +
        "Supavisor TRANSACTION pooler (port 6543) discarding session state — switch DATABASE_URL to the " +
        "SESSION pooler on port 5432."
    )
  }
}

// ---------------------------------------------------------------------------
// The pool itself. Constructing a Pool does not open a socket, so this is safe
// to evaluate during `next build` even with DATABASE_URL absent.
// ---------------------------------------------------------------------------

const poolConfig: PoolConfig = {
  connectionString: connection.connectionString,
  ssl: resolveSsl(),
  // Belt: startup-packet search_path (zero extra round trips when honoured).
  options: `-c search_path=${AUTH_SCHEMA}`,
  // Braces: verified per physical connection, independent of pooling mode.
  onConnect: pinAuthSchema,
  // One connection per function instance. Vercel scales by process, so `max`
  // multiplies by concurrency; the pooler is what actually fans out.
  max: 1,
  min: 0,
  // Release the pooler slot quickly once an instance goes quiet.
  idleTimeoutMillis: 10_000,
  // Bounds both the TCP/TLS handshake and the wait for the single pooled
  // client, so a saturated pooler produces a fast, explicit error instead of
  // hanging until the function's own timeout kills the request.
  connectionTimeoutMillis: 10_000,
  // Don't let an idle pool keep a serverless invocation's event loop alive.
  allowExitOnIdle: true,
  application_name: "arthaive-better-auth",
}

const pool = new Pool(poolConfig)

// A pool-level 'error' listener is mandatory: without one, an idle client that
// the pooler drops emits an unhandled 'error' and crashes the whole instance.
pool.on("error", (error) => {
  console.error("[auth/db] Idle PostgreSQL client error:", error.message)
})

export const auth = betterAuth({
  appName: "Arthaive",
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: pool,
  advanced: {
    database: {
      // Existing application-owned user references are UUID columns.
      generateId: "uuid",
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      allowDifferentEmails: false,
    },
  },
  plugins: [nextCookies()],
})

export type AuthSession = typeof auth.$Infer.Session
export type AuthUser = AuthSession["user"]
