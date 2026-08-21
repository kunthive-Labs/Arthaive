import { createClient } from "@supabase/supabase-js"

import { captureException } from "@/lib/sentry"
import {
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  isConfigured,
  validateConfig,
} from "./supabase/config"

// Environment variables are read in exactly one place — lib/supabase/config.ts —
// so `isSupabaseConfigured` here and `isConfigured` there can never drift apart.
export const isSupabaseConfigured = isConfigured

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
  : null

export const supabaseAdmin = isSupabaseConfigured && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null

// ---------------------------------------------------------------------------
// Fail-loud guard for the data layer
// ---------------------------------------------------------------------------
// Supabase is the single runtime source of truth. `data/funding-data.ts` is an
// intentionally empty, type-bearing placeholder (see
// scripts/generate-funding-data.js), so every `isSupabaseConfigured` branch in
// lib/db/* now falls through to *nothing*.
//
// Left alone that is a silent-failure trap: a deploy with missing Supabase
// credentials renders a fully-working UI showing zero deals, with no error and
// nothing in Sentry. `requireSupabaseConfigured()` is called at every point
// where the data layer is about to serve that empty placeholder instead of live
// data.
//
// Discriminator: `VERCEL_ENV`, which is set *only* by Vercel (to
// "production" | "preview" | "development") on deployed builds and runtimes.
// NODE_ENV is deliberately NOT used: `next build` always runs with
// NODE_ENV=production, so gating on it would break credential-free CI builds
// and every local `npm run build`.
//
// NOTE: this never throws at module scope. Next.js imports these modules during
// `next build` for route analysis, and an import-time throw would break the
// build before any page is evaluated. The throw happens at data-access time only.

/**
 * Opt-in escape hatch for a deliberately database-less Vercel *preview*
 * deployment. It is ignored on VERCEL_ENV=production, and it is not needed
 * outside Vercel (GitHub Actions, local dev and vitest are permissive already).
 */
const ALLOW_MISSING_ENV_VAR = "ALLOW_MISSING_SUPABASE"

export class MissingSupabaseConfigError extends Error {
  readonly statusCode = 500
  readonly missing: string[]

  constructor(operation: string, missing: string[]) {
    super(
      `Supabase is not configured, so \`${operation}\` has no data source. ` +
        `Missing environment variable${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}. ` +
        `Set ${missing.length === 1 ? "it" : "them"} on the deployment ` +
        `(Vercel -> Project -> Settings -> Environment Variables) and redeploy. ` +
        `data/funding-data.ts is an intentionally empty placeholder, not a ` +
        `usable fallback: without Supabase this deployment would serve zero deals while ` +
        `looking healthy.`
    )
    this.name = "MissingSupabaseConfigError"
    this.missing = missing
  }
}

/**
 * Whether serving the empty static placeholder is acceptable in this
 * environment. Read at call time (not module scope) so the decision reflects the
 * actual runtime and so tests can flip it with `vi.stubEnv`.
 */
function emptyFallbackIsAcceptable(): boolean {
  const vercelEnv = process.env.VERCEL_ENV

  // Not on Vercel at all: GitHub Actions CI, `npm run build` on a laptop,
  // `next dev`, vitest. Keep today's permissive behaviour so contributors can
  // run and build the app without a Supabase project.
  if (!vercelEnv) return true

  // A production deployment can never opt out — that is precisely the
  // environment the silent zero-deals failure was hiding in. This includes the
  // Vercel *build* for production, so a credential-less production deploy fails
  // during prerendering instead of shipping baked-empty pages.
  if (vercelEnv === "production") return false

  // Preview / Vercel-development deployments may opt in explicitly.
  return process.env[ALLOW_MISSING_ENV_VAR] === "1"
}

let warnedAboutMissingConfig = false
let reportedMissingConfig = false

/**
 * Assert that a live data source exists before falling back to the empty static
 * dataset.
 *
 * @param operation Name of the data-access function, used in the error message.
 * @throws MissingSupabaseConfigError on a deployed environment when Supabase is
 *   unconfigured.
 */
export function requireSupabaseConfigured(operation: string): void {
  if (isSupabaseConfigured) return

  const { missing } = validateConfig()

  if (emptyFallbackIsAcceptable()) {
    if (!warnedAboutMissingConfig) {
      warnedAboutMissingConfig = true
      console.warn(
        `[arthaive] Supabase is not configured (missing ${missing.join(", ")}). ` +
          `Falling back to data/funding-data.ts, which is an empty placeholder — the app ` +
          `will render with zero deals. Add Supabase credentials to .env.local for real ` +
          `data. This is a hard error on a deployed environment.`
      )
    }
    return
  }

  const error = new MissingSupabaseConfigError(operation, missing)

  // Several API routes wrap their handler in `try { ... } catch { return 500 }`,
  // which stops the error before Next's `onRequestError` hook can hand it to
  // Sentry. Report it here so the misconfiguration is visible either way. Latched
  // to one event per process so a fully broken deploy cannot flood the quota —
  // the throw below still happens on every call.
  if (!reportedMissingConfig) {
    reportedMissingConfig = true
    captureException(error, { operation, missingEnvVars: missing })
  }

  throw error
}
