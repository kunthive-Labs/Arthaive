/**
 * Regression tests for the fail-loud production guard in lib/supabase.ts.
 *
 * `data/funding-data.ts` is an intentionally empty placeholder, so every
 * `isSupabaseConfigured` fallback in lib/db/* now serves *nothing*. Without a
 * guard, a deploy with missing Supabase credentials renders a healthy-looking
 * UI showing zero deals and reports nothing. `requireSupabaseConfigured()`
 * turns that silent failure into a thrown error — but only on a deployed
 * environment.
 *
 * The discriminator is `VERCEL_ENV`, NOT `NODE_ENV`, and that distinction is
 * load-bearing: `next build` always runs with NODE_ENV=production, so gating on
 * NODE_ENV would break the credential-free build step in
 * .github/workflows/ci.yml and every local `npm run build`. The
 * "NODE_ENV=production without VERCEL_ENV" case below is what protects that.
 *
 * `lib/supabase/config.ts` reads env at module scope and the guard latches its
 * warn/report to once per process, so each case re-imports the module after
 * `vi.resetModules()` rather than sharing one instance.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const sentry = vi.hoisted(() => ({ captureException: vi.fn() }))

vi.mock("@/lib/sentry", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/sentry")>()),
  captureException: sentry.captureException,
}))

const ORIGINAL_ENV = { ...process.env }

const SUPABASE_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VERCEL_ENV",
  "ALLOW_MISSING_SUPABASE",
] as const

let warnSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  warnSpy.mockRestore()
  sentry.captureException.mockClear()
  vi.resetModules()
})

/**
 * Load a fresh copy of lib/supabase under an explicit environment. Every
 * Supabase/Vercel key is cleared first so a contributor's shell (or a stray
 * .env) cannot change the outcome.
 */
async function loadSupabaseModule(env: Partial<Record<string, string>>) {
  process.env = { ...ORIGINAL_ENV }
  for (const key of SUPABASE_ENV_KEYS) delete process.env[key]
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  vi.resetModules()
  sentry.captureException.mockClear()
  warnSpy.mockClear()
  return import("@/lib/supabase")
}

const CONFIGURED = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
}

describe("requireSupabaseConfigured — permissive environments", () => {
  it("does not throw when Supabase is missing and VERCEL_ENV is unset", async () => {
    const { requireSupabaseConfigured, isSupabaseConfigured } = await loadSupabaseModule({})
    expect(isSupabaseConfigured).toBe(false)
    expect(() => requireSupabaseConfigured("getDeals")).not.toThrow()
    expect(sentry.captureException).not.toHaveBeenCalled()
  })

  it("does not throw on NODE_ENV=production without VERCEL_ENV (the CI/local build case)", async () => {
    // `next build` runs with NODE_ENV=production. GitHub Actions builds without
    // Supabase credentials, so a NODE_ENV-gated guard would fail every CI build.
    const { requireSupabaseConfigured } = await loadSupabaseModule({
      NODE_ENV: "production",
    })
    expect(() => requireSupabaseConfigured("getDeals")).not.toThrow()
    expect(sentry.captureException).not.toHaveBeenCalled()
  })

  it("warns exactly once per process on the permissive path", async () => {
    const { requireSupabaseConfigured } = await loadSupabaseModule({})
    requireSupabaseConfigured("getDeals")
    requireSupabaseConfigured("getTopInvestors")
    requireSupabaseConfigured("getAllSectorsWithStats")
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(String(warnSpy.mock.calls[0][0])).toContain("Supabase is not configured")
  })

  it("does not throw or warn when Supabase is configured, even on production", async () => {
    const { requireSupabaseConfigured, isSupabaseConfigured } = await loadSupabaseModule({
      ...CONFIGURED,
      VERCEL_ENV: "production",
    })
    expect(isSupabaseConfigured).toBe(true)
    expect(() => requireSupabaseConfigured("getDeals")).not.toThrow()
    expect(warnSpy).not.toHaveBeenCalled()
    expect(sentry.captureException).not.toHaveBeenCalled()
  })
})

describe("requireSupabaseConfigured — deployed environments", () => {
  it("throws MissingSupabaseConfigError on VERCEL_ENV=production", async () => {
    const { requireSupabaseConfigured, MissingSupabaseConfigError } = await loadSupabaseModule({
      VERCEL_ENV: "production",
    })

    expect(() => requireSupabaseConfigured("getDeals")).toThrow(MissingSupabaseConfigError)

    try {
      requireSupabaseConfigured("getDeals")
      expect.unreachable("expected requireSupabaseConfigured to throw")
    } catch (error) {
      const err = error as InstanceType<typeof MissingSupabaseConfigError>
      expect(err.name).toBe("MissingSupabaseConfigError")
      expect(err.statusCode).toBe(500)
      expect(err.missing).toEqual([
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ])
      // The message has to be actionable — it names the caller and the vars.
      expect(err.message).toContain("`getDeals`")
      expect(err.message).toContain("NEXT_PUBLIC_SUPABASE_URL")
    }
  })

  it("throws on VERCEL_ENV=preview without an explicit opt-out", async () => {
    const { requireSupabaseConfigured, MissingSupabaseConfigError } = await loadSupabaseModule({
      VERCEL_ENV: "preview",
    })
    expect(() => requireSupabaseConfigured("getDeals")).toThrow(MissingSupabaseConfigError)
  })

  it("reports only the vars that are actually missing", async () => {
    const { requireSupabaseConfigured } = await loadSupabaseModule({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      VERCEL_ENV: "production",
    })
    try {
      requireSupabaseConfigured("getDeals")
      expect.unreachable("expected requireSupabaseConfigured to throw")
    } catch (error) {
      expect((error as { missing: string[] }).missing).toEqual([
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ])
    }
  })

  it("reports to Sentry once per process but keeps throwing on every call", async () => {
    const { requireSupabaseConfigured } = await loadSupabaseModule({
      VERCEL_ENV: "production",
    })

    expect(() => requireSupabaseConfigured("getDeals")).toThrow()
    expect(() => requireSupabaseConfigured("getTopInvestors")).toThrow()
    expect(() => requireSupabaseConfigured("getMonthlyFunding")).toThrow()

    // Latched so a fully broken deploy cannot flood the Sentry quota...
    expect(sentry.captureException).toHaveBeenCalledTimes(1)
    // ...but the report still carries the context of the first failure.
    expect(sentry.captureException.mock.calls[0][1]).toMatchObject({
      operation: "getDeals",
      missingEnvVars: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    })
  })
})

describe("ALLOW_MISSING_SUPABASE opt-out", () => {
  it("lets a preview deployment run without a database", async () => {
    const { requireSupabaseConfigured } = await loadSupabaseModule({
      VERCEL_ENV: "preview",
      ALLOW_MISSING_SUPABASE: "1",
    })
    expect(() => requireSupabaseConfigured("getDeals")).not.toThrow()
    expect(sentry.captureException).not.toHaveBeenCalled()
  })

  it("is IGNORED on VERCEL_ENV=production", async () => {
    // Production is precisely the environment the silent zero-deals failure was
    // hiding in, so the escape hatch must not work there.
    const { requireSupabaseConfigured, MissingSupabaseConfigError } = await loadSupabaseModule({
      VERCEL_ENV: "production",
      ALLOW_MISSING_SUPABASE: "1",
    })
    expect(() => requireSupabaseConfigured("getDeals")).toThrow(MissingSupabaseConfigError)
    expect(sentry.captureException).toHaveBeenCalledTimes(1)
  })

  it("only accepts the exact value \"1\"", async () => {
    const { requireSupabaseConfigured, MissingSupabaseConfigError } = await loadSupabaseModule({
      VERCEL_ENV: "preview",
      ALLOW_MISSING_SUPABASE: "true",
    })
    expect(() => requireSupabaseConfigured("getDeals")).toThrow(MissingSupabaseConfigError)
  })
})
