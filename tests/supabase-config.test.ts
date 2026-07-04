import { afterEach, describe, expect, it, vi } from "vitest"

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.resetModules()
})

describe("Supabase optional configuration", () => {
  it("server client behaves as signed out when env vars are missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    vi.resetModules()

    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()

    await expect(supabase.auth.getUser()).resolves.toMatchObject({
      data: { user: null },
      error: null,
    })
    await expect(supabase.auth.getSession()).resolves.toMatchObject({
      data: { session: null },
      error: null,
    })
  })

  it("session API returns a signed-out response when Supabase is not configured", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    vi.resetModules()

    const { GET } = await import("@/app/api/auth/session/route")
    const res = await GET()

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ user: null, profile: null })
  })
})
