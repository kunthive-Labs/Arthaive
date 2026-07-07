/**
 * Public API v1 smoke tests.
 *
 * These call route handlers directly with a stub NextRequest so the suite
 * works without spinning up a Next.js server. Supabase env vars are not set
 * in CI, so the underlying `lib/db/*` modules fall back to the static
 * `fundingData` fixture — which is exactly what we want for deterministic tests.
 */
import { describe, it, expect } from "vitest"
import { NextRequest } from "next/server"

import { GET as startupsGET } from "@/app/api/v1/startups/route"
import { GET as fundingRoundsGET } from "@/app/api/v1/funding-rounds/route"
import { GET as searchGET } from "@/app/api/v1/search/route"
import { GET as trendsMonthlyGET } from "@/app/api/v1/trends/monthly/route"
import { GET as trendsSectorsGET } from "@/app/api/v1/trends/sectors/route"

const BASE = "https://test.local"

function makeReq(path: string): NextRequest {
  return new NextRequest(new Request(`${BASE}${path}`))
}

async function callAndParse(handler: (r: NextRequest) => Promise<Response>, path: string) {
  const res = await handler(makeReq(path))
  const body = await res.json()
  return { res, body }
}

describe("GET /api/v1/startups", () => {
  it("returns 200 with the standard envelope", async () => {
    const { res, body } = await callAndParse(startupsGET, "/api/v1/startups?limit=5")
    expect(res.status).toBe(200)
    expect(body).toHaveProperty("data")
    expect(body).toHaveProperty("meta.version", "1")
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeLessThanOrEqual(5)
  })

  it("sets X-RateLimit-* headers", async () => {
    const { res } = await callAndParse(startupsGET, "/api/v1/startups?limit=1")
    expect(res.headers.get("X-RateLimit-Limit")).not.toBeNull()
    expect(res.headers.get("X-RateLimit-Remaining")).not.toBeNull()
    expect(res.headers.get("X-RateLimit-Reset")).not.toBeNull()
  })

  it("each row has the expected fields", async () => {
    const { body } = await callAndParse(startupsGET, "/api/v1/startups?limit=3")
    for (const row of body.data) {
      expect(row).toHaveProperty("company")
      expect(row).toHaveProperty("latest_deal_id")
      expect(row).toHaveProperty("latest_stage")
      expect(row).toHaveProperty("sectors")
    }
  })
})

describe("GET /api/v1/funding-rounds", () => {
  it("paginates", async () => {
    const { body: p1 } = await callAndParse(fundingRoundsGET, "/api/v1/funding-rounds?page=1&limit=10")
    const { body: p2 } = await callAndParse(fundingRoundsGET, "/api/v1/funding-rounds?page=2&limit=10")
    expect(p1.meta.page).toBe(1)
    expect(p2.meta.page).toBe(2)
    expect(p1.meta.limit).toBe(10)
    if (p1.data.length && p2.data.length) {
      // Adjacent pages should not duplicate ids.
      const p1ids = new Set(p1.data.map((r: { id: string }) => r.id))
      const overlap = p2.data.filter((r: { id: string }) => p1ids.has(r.id))
      expect(overlap.length).toBe(0)
    }
  })

  it("filters by stage (case-insensitive)", async () => {
    const { body } = await callAndParse(
      fundingRoundsGET,
      "/api/v1/funding-rounds?stage=series_a&limit=20",
    )
    for (const r of body.data) {
      expect(r.stage.toLowerCase()).toContain("series a")
    }
  })

  it("sanitizes pagination params before building metadata", async () => {
    const { res, body } = await callAndParse(
      fundingRoundsGET,
      "/api/v1/funding-rounds?page=-2&limit=0",
    )
    expect(res.status).toBe(200)
    expect(body.meta.page).toBe(1)
    expect(body.meta.limit).toBe(1)
    expect(body.data.length).toBeLessThanOrEqual(1)
  })

  it("caps oversized limits at the public maximum", async () => {
    const { body } = await callAndParse(fundingRoundsGET, "/api/v1/funding-rounds?limit=500")
    expect(body.meta.limit).toBe(100)
    expect(body.data.length).toBeLessThanOrEqual(100)
  })
})

describe("GET /api/v1/search", () => {
  it("requires the q parameter", async () => {
    const { res, body } = await callAndParse(searchGET, "/api/v1/search")
    expect(res.status).toBe(400)
    expect(body.error.message).toMatch(/q parameter/)
  })

  it("returns matching deals", async () => {
    // Pick a common keyword likely to appear in the static fixture.
    const { res, body } = await callAndParse(searchGET, "/api/v1/search?q=a&limit=5")
    expect(res.status).toBe(200)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it("sanitizes search pagination params", async () => {
    const { res, body } = await callAndParse(searchGET, "/api/v1/search?q=a&page=0&limit=-10")
    expect(res.status).toBe(200)
    expect(body.meta.page).toBe(1)
    expect(body.meta.limit).toBe(1)
    expect(body.data.length).toBeLessThanOrEqual(1)
  })
})

describe("GET /api/v1/trends/monthly", () => {
  it("returns a series", async () => {
    const { res, body } = await callAndParse(trendsMonthlyGET, "/api/v1/trends/monthly")
    expect(res.status).toBe(200)
    expect(Array.isArray(body.data)).toBe(true)
    for (const row of body.data) {
      expect(row).toHaveProperty("deal_count")
      expect(row).toHaveProperty("total_funding_inr")
    }
  })

  it("sets a Cache-Control header on the cached endpoint", async () => {
    const { res } = await callAndParse(trendsMonthlyGET, "/api/v1/trends/monthly")
    const cc = res.headers.get("Cache-Control")
    expect(cc).toMatch(/max-age=\d+/)
  })
})

describe("GET /api/v1/trends/sectors", () => {
  it("returns ranked sectors", async () => {
    const { res, body } = await callAndParse(trendsSectorsGET, "/api/v1/trends/sectors")
    expect(res.status).toBe(200)
    expect(Array.isArray(body.data)).toBe(true)
    for (const row of body.data) {
      expect(row).toHaveProperty("sector")
      expect(row).toHaveProperty("deal_count")
    }
  })
})
