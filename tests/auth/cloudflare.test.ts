import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  betterAuth: vi.fn(() => ({ api: {} })),
  pool: vi.fn(function (options) { return { options } }),
  destroy: vi.fn(() => Promise.resolve()),
  kysely: vi.fn(function (options) { return { options, destroy: mocks.destroy } }),
  dialect: vi.fn(function (options) { return { options } }),
  schema: vi.fn(function (name) { return { name } }),
  waitUntil: vi.fn(),
}))

vi.mock("better-auth", () => ({ betterAuth: mocks.betterAuth }))
vi.mock("better-auth/next-js", () => ({ nextCookies: () => ({}) }))
vi.mock("pg", () => ({ Pool: mocks.pool }))
vi.mock("kysely", () => ({ Kysely: mocks.kysely, PostgresDialect: mocks.dialect, WithSchemaPlugin: mocks.schema }))
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({
    env: { HYPERDRIVE: { connectionString: "postgres://test.invalid/auth" } },
    ctx: { waitUntil: mocks.waitUntil },
  }),
}))

beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })
afterEach(() => vi.unstubAllEnvs())

describe("request-scoped Better Auth", () => {
  it("keeps the Node database path outside Cloudflare", async () => {
    vi.stubEnv("DEPLOYMENT_PLATFORM", "")
    const { auth, withRequestAuth } = await import("@/lib/auth")
    const run = vi.fn(async () => "ok")
    expect(await withRequestAuth(run)).toBe("ok")
    expect(run).toHaveBeenCalledWith(auth)
    expect(mocks.kysely).not.toHaveBeenCalled()
  })

  it("uses Hyperdrive and qualifies the auth schema on each request", async () => {
    vi.stubEnv("DEPLOYMENT_PLATFORM", "cloudflare")
    const { withRequestAuth } = await import("@/lib/auth")
    await withRequestAuth(async () => "first")
    await withRequestAuth(async () => "second")
    expect(mocks.kysely).toHaveBeenCalledTimes(2)
    expect(mocks.schema).toHaveBeenCalledWith("better_auth")
    expect(mocks.pool).toHaveBeenLastCalledWith({
      connectionString: "postgres://test.invalid/auth", max: 1, connectionTimeoutMillis: 10_000,
    })
    expect(mocks.destroy).toHaveBeenCalledTimes(2)
    expect(mocks.waitUntil).toHaveBeenCalledTimes(2)
  })

  it("cleans up the request database when authentication throws", async () => {
    vi.stubEnv("DEPLOYMENT_PLATFORM", "cloudflare")
    const { withRequestAuth } = await import("@/lib/auth")
    await expect(withRequestAuth(async () => { throw new Error("auth failed") })).rejects.toThrow("auth failed")
    expect(mocks.destroy).toHaveBeenCalledOnce()
    expect(mocks.waitUntil).toHaveBeenCalledOnce()
  })
})
