/**
 * Public API v1 smoke tests.
 *
 * These call the route handlers directly with a stub NextRequest, so the suite
 * works without spinning up a Next.js server.
 *
 * Supabase env vars are not set under vitest, so `lib/db/*` takes its static
 * `data/funding-data.ts` branch — and that file is now an intentionally EMPTY
 * placeholder, because Supabase is the single runtime source of truth. Against
 * zero rows every `for (const row of body.data)` assertion below would pass
 * vacuously, so the module is mocked with the deterministic 250-deal set in
 * tests/fixtures/funding-data.ts and the expectations are derived from it.
 */
import { describe, it, expect, vi } from "vitest"
import { NextRequest } from "next/server"

import {
  DEALS_PER_YEAR,
  FIXTURE_SECTORS,
  FIXTURE_TOTAL,
  FIXTURE_YEARS,
  fixtureDealsAtStage,
  fixtureDealsMatchingCompany,
  syntheticFundingData,
} from "../fixtures/funding-data"

// Hoisted above the imports by vitest, so the fixture is pulled in from inside
// the factory rather than referenced from the module body.
vi.mock("@/data/funding-data", async () => {
  const { syntheticFundingData: deals } = await import("../fixtures/funding-data")
  return { fundingData: deals }
})

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
    // Exact, not "<= 5": the fixture has far more than 5 distinct companies, so
    // a short page would mean the query layer silently returned nothing.
    expect(body.data.length).toBe(5)
    expect(body.meta.total).toBe(FIXTURE_TOTAL)
    // Proves the data layer actually saw rows — against an empty dataset
    // getCoverageRange yields "Coverage range unavailable." instead.
    expect(body.meta.coverage_note).toMatch(/^Data complete from \d{4}-\d{2}-\d{2} onwards/)
  })

  it("sets X-RateLimit-* headers", async () => {
    const { res } = await callAndParse(startupsGET, "/api/v1/startups?limit=1")
    expect(res.headers.get("X-RateLimit-Limit")).not.toBeNull()
    expect(res.headers.get("X-RateLimit-Remaining")).not.toBeNull()
    expect(res.headers.get("X-RateLimit-Reset")).not.toBeNull()
  })

  it("each row has the expected fields", async () => {
    const { body } = await callAndParse(startupsGET, "/api/v1/startups?limit=3")
    expect(body.data.length).toBe(3)
    for (const row of body.data) {
      expect(row).toHaveProperty("company")
      expect(row).toHaveProperty("latest_deal_id")
      expect(row).toHaveProperty("latest_stage")
      expect(row).toHaveProperty("sectors")
      expect(typeof row.company).toBe("string")
      expect(row.company.length).toBeGreaterThan(0)
      expect(Array.isArray(row.sectors)).toBe(true)
      expect(row.sectors.length).toBeGreaterThan(0)
    }
  })

  it("collapses to one row per company", async () => {
    const { body } = await callAndParse(startupsGET, "/api/v1/startups?limit=25")
    expect(body.data.length).toBe(25)
    const companies = body.data.map((r: { company: string }) => r.company)
    expect(new Set(companies).size).toBe(companies.length)
  })
})

describe("GET /api/v1/funding-rounds", () => {
  it("paginates", async () => {
    const { body: p1 } = await callAndParse(fundingRoundsGET, "/api/v1/funding-rounds?page=1&limit=10")
    const { body: p2 } = await callAndParse(fundingRoundsGET, "/api/v1/funding-rounds?page=2&limit=10")
    expect(p1.meta.page).toBe(1)
    expect(p2.meta.page).toBe(2)
    expect(p1.meta.limit).toBe(10)
    expect(p1.meta.total).toBe(FIXTURE_TOTAL)
    // The fixture is 250 rows, so both pages are necessarily full — the
    // no-overlap check below is unconditional rather than skipped when empty.
    expect(p1.data.length).toBe(10)
    expect(p2.data.length).toBe(10)
    const p1ids = new Set(p1.data.map((r: { id: string }) => r.id))
    const overlap = p2.data.filter((r: { id: string }) => p1ids.has(r.id))
    expect(overlap.length).toBe(0)
  })

  it("filters by stage (case-insensitive)", async () => {
    // The route maps "series_a" -> "Series A" before hitting the query layer.
    const expected = fixtureDealsAtStage("Series A")
    expect(expected.length).toBeGreaterThan(0)
    expect(expected.length).toBeLessThan(FIXTURE_TOTAL)

    const { body } = await callAndParse(
      fundingRoundsGET,
      "/api/v1/funding-rounds?stage=series_a&limit=20",
    )
    expect(body.meta.total).toBe(expected.length)
    expect(body.data.length).toBe(20)
    for (const r of body.data) {
      expect(r.stage).toBe("Series A")
    }
  })
})

describe("GET /api/v1/search", () => {
  it("requires the q parameter", async () => {
    const { res, body } = await callAndParse(searchGET, "/api/v1/search")
    expect(res.status).toBe(400)
    expect(body.error.message).toMatch(/q parameter/)
  })

  it("returns matching deals", async () => {
    // Half the fixture's companies are "Nimbus NNN", the other half "Kestrel NNN".
    const expected = fixtureDealsMatchingCompany("nimbus")
    expect(expected.length).toBeGreaterThan(0)
    expect(expected.length).toBeLessThan(FIXTURE_TOTAL)

    const { res, body } = await callAndParse(searchGET, "/api/v1/search?q=nimbus&limit=5")
    expect(res.status).toBe(200)
    expect(body.meta.total).toBe(expected.length)
    expect(body.data.length).toBe(5)
    for (const row of body.data) {
      expect(row.company.toLowerCase()).toContain("nimbus")
    }
  })

  it("returns an empty page for a term nothing matches", async () => {
    const { res, body } = await callAndParse(searchGET, "/api/v1/search?q=no-such-company")
    expect(res.status).toBe(200)
    expect(body.data).toEqual([])
    expect(body.meta.total).toBe(0)
  })
})

describe("GET /api/v1/trends/monthly", () => {
  it("returns a series", async () => {
    // Pin to a fixture year so the series is exact rather than clock-dependent.
    const year = FIXTURE_YEARS[FIXTURE_YEARS.length - 1]
    const { res, body } = await callAndParse(trendsMonthlyGET, `/api/v1/trends/monthly?year=${year}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(body.data)).toBe(true)
    // The fixture spreads each year's 50 deals over months 02-11.
    expect(body.data.length).toBe(10)
    let counted = 0
    for (const row of body.data) {
      expect(row).toHaveProperty("deal_count")
      expect(row).toHaveProperty("total_funding_inr")
      expect(row.month.slice(0, 4)).toBe(String(year))
      expect(row.deal_count).toBeGreaterThan(0)
      counted += row.deal_count
    }
    expect(counted).toBe(DEALS_PER_YEAR)
  })

  it("sets a Cache-Control header on the cached endpoint", async () => {
    const { res, body } = await callAndParse(trendsMonthlyGET, "/api/v1/trends/monthly")
    const cc = res.headers.get("Cache-Control")
    expect(cc).toMatch(/max-age=\d+/)
    // The trailing fixture year always falls inside the default 24-month window.
    expect(body.data.length).toBeGreaterThan(0)
  })
})

describe("GET /api/v1/trends/sectors", () => {
  it("returns ranked sectors", async () => {
    const { res, body } = await callAndParse(trendsSectorsGET, "/api/v1/trends/sectors")
    expect(res.status).toBe(200)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBe(FIXTURE_SECTORS.length)

    let counted = 0
    let previous = Infinity
    for (const row of body.data) {
      expect(row).toHaveProperty("sector")
      expect(row).toHaveProperty("deal_count")
      expect(FIXTURE_SECTORS).toContain(row.sector)
      expect(row.deal_count).toBeGreaterThan(0)
      // getSectorStats ranks by deal count, descending.
      expect(row.deal_count).toBeLessThanOrEqual(previous)
      previous = row.deal_count
      counted += row.deal_count
    }

    // A multi-sector deal counts once per sector, so the totals sum to the
    // number of (deal, sector) pairs rather than to the deal count.
    const sectorMemberships = syntheticFundingData.reduce((sum, d) => sum + d.sectors.length, 0)
    expect(counted).toBe(sectorMemberships)
  })
})
