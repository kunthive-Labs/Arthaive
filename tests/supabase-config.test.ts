import { afterEach, describe, expect, it, vi } from "vitest"

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.resetModules()
})

describe("Authentication session endpoint", () => {
  it("session API returns a signed-out response without a Better Auth session", async () => {
    vi.doMock("@/lib/auth/server", () => ({
      getAuthUser: vi.fn().mockResolvedValue(null),
    }))
    vi.resetModules()

    const { GET } = await import("@/app/api/auth/session/route")
    const res = await GET()

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ user: null, profile: null })
  })
})
